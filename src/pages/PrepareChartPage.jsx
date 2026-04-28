import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bus, Calendar, User, Phone, Printer, Trash2, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import './SeatLayout.css'; // Reuse some layout styles if needed

import { useSearchParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export default function PrepareChartPage() {
  const [searchParams] = useSearchParams();
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState(searchParams.get('busId') || '');
  const [selectedDate, setSelectedDate] = useState(searchParams.get('date') || new Date().toISOString().split('T')[0]);
  const [chartData, setChartData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');

  // Form states for new chart
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [conductorName, setConductorName] = useState('');
  const [conductorPhone, setConductorPhone] = useState('');

  const token = localStorage.getItem('agent_token');

  useEffect(() => {
    fetchBuses();
  }, []);

  useEffect(() => {
    if (selectedBus && selectedDate) {
      checkChart();
    }
  }, [selectedBus, selectedDate]);

  useEffect(() => {
    if (selectedBus && buses.length > 0) {
      const bus = buses.find(b => b.id == selectedBus);
      if (bus && !chartData?.exists) {
        setDriverName(bus.driver_name || '');
        setDriverPhone(bus.driver_phone || '');
      }
    }
  }, [selectedBus, buses, chartData]);

  const fetchBuses = async () => {
    try {
      const res = await axios.get(`${API_BASE}/agent/my-buses`, {
        headers: { 'X-Agent-Token': token }
      });
      setBuses(res.data);
    } catch (err) {
      console.error('Failed to fetch buses');
    }
  };

  const handlePhoneChange = (setter) => (e) => {
    const val = e.target.value.replace(/\D/g, ''); // Numeric only
    if (val.length <= 10) {
      setter(val);
    }
  };

  const checkChart = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const res = await axios.get(`${API_BASE}/agent/chart/check`, {
        headers: { 'X-Agent-Token': token },
        params: { busId: selectedBus, date: selectedDate }
      });
      setChartData(res.data);
    } catch (err) {
      setError('Failed to check chart status');
    } finally {
      setLoading(false);
    }
  };

  const handlePrepareChart = async (e) => {
    e.preventDefault();
    
    // Validate driver matching
    const bus = buses.find(b => b.id == selectedBus);
    if (bus && bus.driver_name && driverName.trim().toLowerCase() !== bus.driver_name.toLowerCase()) {
      setError(`Warning: The entered driver name doesn't match the assigned driver (${bus.driver_name})`);
      return;
    }

    if (!driverName || !driverPhone || !conductorName || !conductorPhone) {
      setError('Please fill all driver and conductor details');
      return;
    }

    if (driverPhone.length !== 10 || conductorPhone.length !== 10) {
      setError('Mobile numbers must be exactly 10 digits');
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE}/agent/chart/prepare`, {
        busId: selectedBus,
        date: selectedDate,
        driverName,
        driverPhone,
        conductorName,
        conductorPhone
      }, {
        headers: { 'X-Agent-Token': token }
      });
      setSuccess('Chart prepared successfully! Tracking will start in 10 minutes.');
      checkChart();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to prepare chart');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteRequest = async () => {
    try {
      await axios.post(`${API_BASE}/agent/chart/delete-request`, {
        chartId: chartData.chart.id
      }, {
        headers: { 'X-Agent-Token': token }
      });
      setOtpSent(true);
      setSuccess('OTP sent to your email for deletion');
    } catch (err) {
      setError('Failed to send OTP');
    }
  };

  const handleDeleteConfirm = async () => {
    try {
      await axios.delete(`${API_BASE}/agent/chart/delete`, {
        headers: { 'X-Agent-Token': token },
        params: { chartId: chartData.chart.id, otp }
      });
      setSuccess('Chart deleted successfully');
      setOtpSent(false);
      setOtp('');
      checkChart();
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="prepare-chart-container">
      <div className="page-header no-print">
        <div className="header-icon"><FileText size={24} /></div>
        <div className="header-info">
          <h1>Prepare Trip Chart</h1>
          <p>Assign crew and generate passenger manifesto for today's trip</p>
        </div>
      </div>

      <div className="search-section card no-print">
        <div className="form-row">
          <div className="form-group">
            <label><Bus size={16} /> Select Bus</label>
            <select 
              value={selectedBus} 
              onChange={(e) => setSelectedBus(e.target.value)}
              className="form-control"
            >
              <option value="">-- Choose Bus --</option>
              {buses.map(bus => (
                <option key={bus.id} value={bus.id}>{bus.code} ({bus.plate})</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label><Calendar size={16} /> Travel Date</label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-control"
            />
          </div>
        </div>
      </div>

      {loading && <div className="loading-spinner"><Loader2 className="spin" size={32} /></div>}

      {error && <div className="alert alert-error no-print"><AlertCircle size={18} /> {error}</div>}
      {success && <div className="alert alert-success no-print"><CheckCircle size={18} /> {success}</div>}

      {selectedBus && selectedDate && chartData && (
        <div className="chart-content">
          {!chartData.exists ? (
            <div className="prepare-form-section card no-print">
              <h3>Trip Crew Assignment</h3>
              <form onSubmit={handlePrepareChart}>
                <div className="form-grid">
                  <div className="form-group">
                    <label>Driver Name</label>
                    <input type="text" value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Enter name" className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Driver Phone</label>
                    <input type="text" value={driverPhone} onChange={handlePhoneChange(setDriverPhone)} placeholder="10-digit number" className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Conductor Name</label>
                    <input type="text" value={conductorName} onChange={e => setConductorName(e.target.value)} placeholder="Enter name" className="form-control" />
                  </div>
                  <div className="form-group">
                    <label>Conductor Phone</label>
                    <input type="text" value={conductorPhone} onChange={handlePhoneChange(setConductorPhone)} placeholder="10-digit number" className="form-control" />
                  </div>
                </div>
                <button type="submit" className="btn btn-primary mt-3">
                  Prepare Chart & Activate Tracking
                </button>
              </form>
            </div>
          ) : (
            <div className="existing-chart-info alert alert-info no-print">
              <CheckCircle size={20} />
              <div>
                <strong>Chart Already Exists!</strong> Prepared on {new Date(chartData.chart.preparedAt).toLocaleString()}
                <div className="mt-2">
                  <button onClick={handlePrint} className="btn btn-sm btn-outline-primary mr-2"><Printer size={14} /> Print Chart</button>
                  <button onClick={handleDeleteRequest} className="btn btn-sm btn-outline-danger"><Trash2 size={14} /> Delete / Change</button>
                </div>
              </div>
            </div>
          )}

          {otpSent && (
            <div className="otp-modal no-print">
              <div className="modal-content card">
                <h3>Verify Deletion</h3>
                <p>Enter the OTP sent to your registered email to delete this chart.</p>
                <input type="text" value={otp} onChange={e => setOtp(e.target.value)} placeholder="Enter 6-digit OTP" className="form-control mb-3" />
                <div className="modal-actions">
                  <button onClick={handleDeleteConfirm} className="btn btn-danger">Confirm Delete</button>
                  <button onClick={() => setOtpSent(false)} className="btn btn-secondary">Cancel</button>
                </div>
              </div>
            </div>
          )}

          {/* Printable Chart */}
          <div className="printable-manifest card">
            <div className="manifest-header">
              <div className="manifest-brand">
                <h2>WHERE IS MY BUS</h2>
                <p>PASSENGER TRIP MANIFEST</p>
              </div>
              <div className="manifest-meta">
                <p><strong>Bus:</strong> {buses.find(b => b.id == selectedBus)?.code}</p>
                <p><strong>Date:</strong> {selectedDate}</p>
              </div>
            </div>

            <div className="crew-info-grid">
              <div className="crew-item">
                <span className="label">Driver:</span>
                <span className="value">{chartData.exists ? chartData.chart.driverName : driverName || 'N/A'}</span>
              </div>
              <div className="crew-item">
                <span className="label">Contact:</span>
                <span className="value">{chartData.exists ? chartData.chart.driverPhone : driverPhone || 'N/A'}</span>
              </div>
              <div className="crew-item">
                <span className="label">Conductor:</span>
                <span className="value">{chartData.exists ? chartData.chart.conductorName : conductorName || 'N/A'}</span>
              </div>
              <div className="crew-item">
                <span className="label">Contact:</span>
                <span className="value">{chartData.exists ? chartData.chart.conductorPhone : conductorPhone || 'N/A'}</span>
              </div>
            </div>

            <table className="manifest-table">
              <thead>
                <tr>
                  <th>Seat</th>
                  <th>Passenger</th>
                  <th>Phone</th>
                  <th>Payment</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {chartData.passengers.length > 0 ? chartData.passengers
                  .sort((a, b) => a.seat_no.localeCompare(b.seat_no, undefined, { numeric: true, sensitivity: 'base' }))
                  .map((p, idx) => (
                  <tr key={idx}>
                    <td className="font-bold">{p.seat_no}</td>
                    <td>{p.passenger_name}</td>
                    <td>{p.passenger_phone}</td>
                    <td><span className={`badge ${p.payment_type}`}>{p.payment_type.toUpperCase()}</span></td>
                    <td className="text-right">₹{p.amount}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" className="text-center py-4">No confirmed bookings for this trip yet.</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="4" className="text-right font-bold">Total Collection:</td>
                  <td className="text-right font-bold text-primary">₹{chartData.totalCollection}</td>
                </tr>
              </tfoot>
            </table>

            <div className="manifest-footer">
              <p>Generated at: {new Date().toLocaleString()}</p>
              <p>Authorized Agent Signature: _______________________</p>
            </div>
          </div>
        </div>
      )}

      <style dangerouslySetInnerHTML={{ __html: `
        .prepare-chart-container { max-width: 1000px; margin: 0 auto; padding: 20px; }
        .card { background: white; padding: 25px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); margin-bottom: 20px; border: 1px solid #e2e8f0; }
        .page-header { display: flex; align-items: center; gap: 15px; margin-bottom: 30px; }
        .header-icon { background: #2563eb; color: white; padding: 12px; border-radius: 10px; }
        .header-info h1 { margin: 0; font-size: 24px; color: #1e293b; }
        .header-info p { margin: 0; color: #64748b; font-size: 14px; }
        
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
        .form-group label { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; font-weight: 600; font-size: 14px; color: #475569; }
        .form-control { width: 100%; padding: 10px 15px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 14px; }
        
        .btn { padding: 10px 20px; border-radius: 8px; font-weight: 600; cursor: pointer; transition: all 0.2s; border: none; display: inline-flex; align-items: center; gap: 8px; }
        .btn-primary { background: #2563eb; color: white; }
        .btn-primary:hover { background: #1d4ed8; }
        .btn-outline-primary { background: transparent; border: 1px solid #2563eb; color: #2563eb; }
        .btn-outline-danger { background: transparent; border: 1px solid #ef4444; color: #ef4444; }
        .btn-danger { background: #ef4444; color: white; }
        
        .alert { padding: 15px; border-radius: 8px; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
        .alert-error { background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
        .alert-success { background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
        .alert-info { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
        
        .manifest-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #1e293b; padding-bottom: 15px; margin-bottom: 20px; }
        .manifest-brand h2 { margin: 0; color: #1e293b; letter-spacing: 1px; }
        .manifest-meta p { margin: 2px 0; font-size: 14px; text-align: right; }
        
        .crew-info-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 25px; }
        .crew-item { display: flex; flex-direction: column; }
        .crew-item .label { font-size: 12px; color: #64748b; font-weight: 600; }
        .crew-item .value { font-size: 14px; font-weight: 700; color: #1e293b; }
        
        .manifest-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .manifest-table th { background: #f1f5f9; padding: 12px; text-align: left; font-size: 13px; border-bottom: 2px solid #e2e8f0; }
        .manifest-table td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 14px; }
        .text-right { text-align: right; }
        .text-primary { color: #2563eb; }
        .font-bold { font-weight: 700; }
        
        .badge { padding: 4px 8px; border-radius: 4px; font-size: 11px; font-weight: 700; }
        .badge.prepaid { background: #dcfce7; color: #166534; }
        .badge.cash { background: #fef9c3; color: #854d0e; }
        
        .manifest-footer { margin-top: 40px; display: flex; justify-content: space-between; font-size: 12px; color: #64748b; }
        
        .otp-modal { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .modal-content { max-width: 400px; width: 90%; }
        .modal-actions { display: flex; gap: 10px; justify-content: flex-end; }

        @media print {
          .no-print, .dashboard-container .sidebar, .dashboard-container .topbar { display: none !important; }
          .main-content { margin-left: 0 !important; width: 100% !important; }
          .card { border: none !important; box-shadow: none !important; padding: 0 !important; }
          .prepare-chart-container { padding: 0 !important; }
          .manifest-table th { background: #eee !important; -webkit-print-color-adjust: exact; }
          @page { size: auto; margin: 20mm; }
        }
        
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}} />
    </div>
  );
}

function FileText({ size }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/></svg>
  );
}
