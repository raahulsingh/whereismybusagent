import React, { useEffect, useState } from 'react';
import api from '../api';

export default function BookingsPage() {
  const [buses, setBuses] = useState([]);
  const [selectedBus, setSelectedBus] = useState('');
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
        fetchBookings(res.data[0].id);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchBookings = async (busId) => {
    if (!busId) return;
    setLoading(true);
    try {
      const res = await api.get(`/agent/bookings/${busId}`);
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
    fetchBookings(busId);
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
        fetchBookings(selectedBus);
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
      fetchBookings(selectedBus);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to verify cancel OTP');
    }
  };

  return (
    <div>
      <h1 className="page-title">Manage Bookings</h1>

      <div className="card" style={{ marginBottom: '2rem' }}>
        <div className="input-group" style={{ maxWidth: '300px', margin: 0 }}>
          <label>Select Bus</label>
          <select value={selectedBus} onChange={handleBusChange}>
            {buses.map(b => (
              <option key={b.id} value={b.id}>{b.code} ({b.plate})</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div>Loading bookings...</div>
      ) : (
        <div className="card" style={{ overflowX: 'auto' }}>
          {bookings.length === 0 ? (
            <p>No confirmed bookings found for this bus.</p>
          ) : (
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
                      <button 
                        className="btn btn-outline" 
                        style={{ color: 'var(--danger)', borderColor: 'var(--danger)' }}
                        onClick={() => handleRequestCancel(b.booking_ref)}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* OTP Modal for Pre-paid Cancellation */}
      {otpModal.show && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center'
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
