import React, { useEffect, useState } from 'react';
import api from '../api';
import { Calendar } from 'lucide-react';

export default function BookingsPage() {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState('');
  const [selectedDate, setSelectedDate] = useState('');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Cancel flow state
  const [otpModal, setOtpModal] = useState({ show: false, ref: '' });
  const [otp, setOtp] = useState('');

  useEffect(() => {
    fetchBuses();
  }, []);

  const fetchBuses = async () => {
    try {
      const res = await api.get('/agent/my-buses');
      setBuses(res.data);
      if (res.data.length > 0) {
        setSelectedBus(res.data[0].id);
        fetchBookings(res.data[0].id, selectedDate);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBookings = async (busId, date) => {
    if (!busId) return;
    setLoading(true);
    try {
      let url = `/agent/bookings/${busId}`;
      if (date) url += `?date=${date}`;
      const res = await api.get(url);
      setBookings(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleBusChange = (e) => {
    const busId = e.target.value;
    setSelectedBus(busId);
    fetchBookings(busId, selectedDate);
  };

  const handleDateChange = (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    fetchBookings(selectedBus, date);
  };

  const clearDateFilter = () => {
    setSelectedDate('');
    fetchBookings(selectedBus, '');
  };

  const handleRequestCancel = async (bookingRef) => {
    if (!window.confirm(`Are you sure you want to cancel booking ${bookingRef}?`)) return;
    
    try {
      const res = await api.post(`/agent/cancel/${bookingRef}`);
      if (res.data.otpRequired) {
        setOtpModal({ show: true, ref: bookingRef });
        alert(res.data.message); // Tell agent that OTP went to passenger
      } else {
        alert(res.data.message); // Cancelled directly (e.g. cash)
        fetchBookings(selectedBus, selectedDate);
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to cancel');
    }
  };

  const handleVerifyCancelOtp = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post(`/agent/cancel/${otpModal.ref}/verify-otp`, { otp });
      alert(res.data.message);
      setOtpModal({ show: false, ref: '' });
      setOtp('');
      fetchBookings(selectedBus, selectedDate);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to verify cancel OTP');
    }
  };

  const handlePrintTicket = (b) => {
    const w = window.open('', '_blank', 'width=400,height=600');
    w.document.write(`
      <html><head><title>Bus Ticket</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; max-width: 380px; margin: 0 auto; }
        .ticket { border: 2px dashed #333; border-radius: 12px; padding: 20px; }
        .header { text-align: center; font-size: 18px; font-weight: 800; margin-bottom: 12px; }
        .divider { border-top: 1px dashed #aaa; margin: 10px 0; }
        .row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 4px; }
        .label { color: #666; } .value { font-weight: 600; }
        .status { text-align: center; margin-top: 12px; padding: 6px; background: #f0fdf4; border-radius: 8px; color: #16a34a; font-weight: 700; }
        .footer { text-align: center; font-size: 10px; color: #999; margin-top: 12px; }
      </style></head><body>
      <div class="ticket">
        <div class="header">🚌 Where is my Bus</div>
        <div class="divider"></div>
        <div class="row"><span class="label">Route:</span><span class="value">${b.from_stop_name} → ${b.to_stop_name}</span></div>
        <div class="row"><span class="label">Date:</span><span class="value">${new Date(b.travel_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span></div>
        <div class="row"><span class="label">Dep. Time:</span><span class="value">${b.dep_time ? new Date(b.dep_time.replace(' ', 'T')).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</span></div>
        <div class="row"><span class="label">Bus:</span><span class="value">${b.bus_code || '-'} ${b.bus_plate ? '(' + b.bus_plate + ')' : ''}</span></div>
        <div class="row"><span class="label">Ref:</span><span class="value">${b.booking_ref}</span></div>
        <div class="divider"></div>
        <div class="row"><span class="label">Passenger:</span><span class="value">${b.passenger_name}</span></div>
        <div class="row"><span class="label">Seat:</span><span class="value">${b.seat_no}</span></div>
        <div class="row"><span class="label">Phone:</span><span class="value">${b.passenger_phone}</span></div>
        <div class="row"><span class="label">Amount:</span><span class="value">₹${Number(b.amount || 0).toFixed(0)}</span></div>
        <div class="status">✅ CONFIRMED</div>
        <div class="footer">Powered by Where is my Bus</div>
      </div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div>
      <h1 className="page-title">Manage Bookings</h1>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="input-group" style={{ flex: '1 1 240px', margin: 0, minWidth: '200px' }}>
            <label>Select Bus</label>
            <select value={selectedBus} onChange={handleBusChange}>
              {buses.map(b => (
                <option key={b.id} value={b.id}>{b.code} ({b.plate})</option>
              ))}
            </select>
          </div>
          <div className="input-group" style={{ flex: '0 1 200px', margin: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} /> Filter by Date
            </label>
            <input 
              type="date" 
              value={selectedDate} 
              onChange={handleDateChange}
            />
          </div>
          {selectedDate && (
            <>
              <button 
                className="btn btn-outline" 
                onClick={clearDateFilter}
                style={{ marginBottom: '0.05rem', fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
              >
                ✕ Clear Date
              </button>
              <button 
                className="btn btn-primary"
                style={{ marginBottom: '0.05rem', fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                onClick={() => window.location.href = `/prepare-chart?busId=${selectedBus}&date=${selectedDate}`}
              >
                Prepare Chart
              </button>
            </>
          )}
        </div>
      </div>

      {loading ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem' }}>
          <div className="loading-spinner" style={{ margin: '0 auto 0.5rem' }}></div>
          Loading bookings...
        </div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          {bookings.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '1rem' }}>
              No confirmed bookings found{selectedDate ? ` for ${selectedDate}` : ''}.
            </p>
          ) : (
            <>
              <div style={{ marginBottom: '0.75rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                Showing <strong>{bookings.length}</strong> booking{bookings.length !== 1 ? 's' : ''}
                {selectedDate ? ` on ${selectedDate}` : ''}
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '1rem 0.5rem' }}>Ref</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Seat</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Passenger</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Route</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Date</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Payment</th>
                    <th style={{ padding: '1rem 0.5rem' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {bookings.map(b => (
                    <tr key={b.booking_ref} style={{ borderBottom: '1px solid var(--bg-main)' }}>
                      <td style={{ padding: '1rem 0.5rem', fontWeight: 500 }}>{b.booking_ref}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>{b.seat_no}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ fontWeight: 500 }}>{b.passenger_name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{b.passenger_phone}</div>
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div>{b.from_stop_name} →</div>
                        <div>{b.to_stop_name}</div>
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>{b.travel_date}</td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <span className={`badge ${b.payment_type === 'cash' ? 'badge-warning' : 'badge-success'}`}>
                          {b.payment_type?.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '1rem 0.5rem' }}>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button 
                            className="btn btn-outline" 
                            style={{ color: '#2563eb', borderColor: '#2563eb', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                            onClick={() => handlePrintTicket(b)}
                          >
                            Print
                          </button>
                          <button 
                            className="btn btn-outline" 
                            style={{ color: 'var(--danger)', borderColor: 'var(--danger)', padding: '0.4rem 0.75rem', fontSize: '0.85rem' }}
                            onClick={() => handleRequestCancel(b.booking_ref)}
                          >
                            Cancel
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {/* OTP Modal for Pre-paid Cancellation */}
      {otpModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 1000
        }}>
          <div className="card" style={{ width: '400px' }}>
            <h3 style={{ marginBottom: '1rem' }}>Cancel Prepaid Booking</h3>
            <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>
              An OTP has been sent to the passenger's email. Please ask them for it to complete the cancellation.
            </p>
            <form onSubmit={handleVerifyCancelOtp}>
              <div className="input-group">
                <label>Passenger OTP</label>
                <input required maxLength="6" value={otp} onChange={e=>setOtp(e.target.value)} style={{ letterSpacing: '0.25rem', textAlign: 'center', fontSize: '1.25rem' }} />
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                <button type="submit" className="btn btn-danger" style={{ flex: 1 }}>Confirm Cancel</button>
                <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setOtpModal({ show: false, ref: '' })}>Close</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
