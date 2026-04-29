import React, { useEffect, useState, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import './SeatLayout.css';

export default function SeatLayoutPage() {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const fromStop = searchParams.get('from');
  const toStop = searchParams.get('to');
  const travelDate = searchParams.get('date') || new Date().toISOString().split('T')[0];
  
  const [layoutData, setLayoutData] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const selectedSeatRef = useRef(null);
  const [bookedSeatDetails, setBookedSeatDetails] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    passengerName: '', passengerAge: '', passengerGender: '', 
    passengerPhone: '', passengerEmail: '', paymentType: 'cash'
  });
  const [otpModal, setOtpModal] = useState({ show: false, ref: '' });
  const [otp, setOtp] = useState('');

  const navigate = useNavigate();

  // Keep ref in sync with state for cleanup
  useEffect(() => { selectedSeatRef.current = selectedSeat; }, [selectedSeat]);

  useEffect(() => {
    fetchLayout();
    // Auto-refresh every 5 seconds to keep locks in sync
    const interval = setInterval(fetchLayout, 5000);
    return () => clearInterval(interval);
  }, [tripId, travelDate]);

  // Cleanup: unlock seat when agent leaves the page
  useEffect(() => {
    return () => {
      // On unmount, unlock any selected seat
      const seat = selectedSeatRef.current;
      if (seat) {
        const agentData = JSON.parse(localStorage.getItem('agent_data') || '{}');
        // Use navigator.sendBeacon for reliable cleanup on page leave
        const payload = JSON.stringify({
          tripId, seatNo: seat,
          userId: 'agent-' + (agentData.id || 'unknown')
        });
        const baseUrl = api.defaults.baseURL || '';
        navigator.sendBeacon(baseUrl + '/booking/unlock', new Blob([payload], { type: 'application/json' }));
      }
    };
  }, [tripId]);

  const fetchLayout = async () => {
    try {
      const res = await api.get(`/agent/layout/${tripId}?date=${travelDate}`);
      setLayoutData(res.data);
    } catch (e) {
      console.error('Layout fetch error:', e.response?.data?.error || e.message);
    }
  };

  const handleSeatClick = async (seatObj) => {
    const seatId = seatObj.id;
    if (layoutData.bookedSeats && layoutData.bookedSeats[seatId]) {
      // It's booked -> show details
      setBookedSeatDetails(layoutData.bookedSeats[seatId]);
      setSelectedSeat(null);
    } else if (layoutData.lockedSeats && layoutData.lockedSeats.includes(seatId) && selectedSeat !== seatId) {
      // Locked by someone else — just show alert, stay on page
      alert("This seat is currently reserved by another user/agent. Please choose a different seat.");
    } else {
      // Toggle selection with locking
      if (selectedSeat === seatId) {
        // DESELECT & UNLOCK
        try {
          const agentData = JSON.parse(localStorage.getItem('agent_data') || '{}');
          await api.post('/booking/unlock', {
            tripId,
            seatNo: seatId,
            userId: 'agent-' + (agentData.id || 'unknown')
          });
        } catch (e) { console.error("Unlock failed", e); }
        setSelectedSeat(null);
      } else {
        // SELECT & LOCK
        const agentData = JSON.parse(localStorage.getItem('agent_data') || '{}');
        try {
          await api.post('/booking/lock', {
            tripId,
            seatNo: seatId,
            userId: 'agent-' + (agentData.id || 'unknown'),
            travelDate
          });
          setSelectedSeat(seatId);
          setBookedSeatDetails(null);
        } catch (e) {
          // Lock failed — seat taken by someone else. Just show message, stay on page.
          const msg = e.response?.data?.error || "Seat is currently unavailable. Please choose another seat.";
          alert(msg);
          // Don't crash — just stay on the seat layout
        }
      }
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        tripId,
        seatNo: selectedSeat,
        fromStop,
        toStop,
        travelDate,
        ...bookingForm
      };
      
      const res = await api.post('/agent/book', payload);
      
      if (res.data.otpRequired) {
        setOtpModal({ show: true, ref: res.data.bookingRef });
      } else {
        alert(res.data.message);
        setSelectedSeat(null);
        fetchLayout();
      }
    } catch (e) {
      alert(e.response?.data?.error || 'Booking failed');
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/agent/book/verify-otp', {
        bookingRef: otpModal.ref,
        otp
      });
      alert(res.data.message);
      setOtpModal({ show: false, ref: '' });
      setSelectedSeat(null);
      fetchLayout();
    } catch (e) {
      alert(e.response?.data?.error || 'OTP verification failed');
    }
  };

  if (!layoutData) return (
    <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
      <div className="loading-spinner" style={{ margin: '0 auto 1rem' }}></div>
      Loading seat layout...
    </div>
  );

  let parsedLayout = [];
  try {
    parsedLayout = JSON.parse(layoutData.layoutJson || '[]');
  } catch (e) { console.error('Layout parse error'); }

  // Count stats
  const totalSeats = parsedLayout.flat().filter(s => s.type !== 'aisle' && s.type !== 'gap').length;
  const bookedCount = layoutData.bookedSeats ? Object.keys(layoutData.bookedSeats).length : 0;
  const availableCount = totalSeats - bookedCount;

  return (
    <div>
      {/* Header with trip info */}
      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h2 style={{ marginBottom: '0.25rem' }}>Seat Layout</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
              {fromStop} → {toStop} • Travel Date: <strong>{travelDate}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <div className="seat-legend">
              <span className="legend-item"><span className="legend-dot available"></span> Available</span>
              <span className="legend-item"><span className="legend-dot locked"></span> Reserved</span>
              <span className="legend-item"><span className="legend-dot booked"></span> Booked</span>
              <span className="legend-item"><span className="legend-dot selected"></span> Selected</span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
        {/* Seat grid */}
        <div className="card" style={{ flex: 1, minWidth: '300px' }}>
          <div className="bus-layout">
            {/* Driver area */}
            <div style={{ 
              textAlign: 'right', 
              padding: '0.5rem 1rem', 
              fontSize: '0.75rem', 
              color: 'var(--text-muted)',
              borderBottom: '2px solid #e2e8f0',
              marginBottom: '0.5rem'
            }}>
              🚍 Driver
            </div>
            {parsedLayout.map((row, rIdx) => (
              <div key={rIdx} className="seat-row">
                {row.map((seat, cIdx) => {
                  if (seat.type === 'aisle' || seat.type === 'gap') {
                    return <div key={cIdx} className="seat aisle"></div>;
                  }
                  const isBooked = !!(layoutData.bookedSeats && layoutData.bookedSeats[seat.id]);
                  const isLockedByOther = layoutData.lockedSeats && layoutData.lockedSeats.includes(seat.id) && selectedSeat !== seat.id;
                  const isSelected = selectedSeat === seat.id;
                  
                  let cls = 'seat standard';
                  if (seat.type === 'sleeper') cls = 'seat sleeper';
                  if (isBooked) cls += ' booked';
                  else if (isLockedByOther) cls += ' locked';
                  else if (isSelected) cls += ' selected';
                  
                  return (
                    <div key={cIdx} className={cls} onClick={() => handleSeatClick(seat)}>
                      {seat.id}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <div style={{ width: '380px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Passenger Info Modal (if booked seat clicked) */}
          {bookedSeatDetails && (
            <div className="card" style={{ borderLeft: '4px solid var(--danger)' }}>
              <h3 style={{ color: 'var(--danger)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                🔴 Booked Seat Info
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
                <p><strong>Seat:</strong> {bookedSeatDetails.seat_no}</p>
                <p><strong>Passenger:</strong> {bookedSeatDetails.passenger_name} ({bookedSeatDetails.passenger_gender}, {bookedSeatDetails.passenger_age})</p>
                <p><strong>Phone:</strong> {bookedSeatDetails.passenger_phone}</p>
                <p><strong>Email:</strong> {bookedSeatDetails.passenger_email || 'N/A'}</p>
                <p><strong>Amount:</strong> ₹{bookedSeatDetails.amount}</p>
                <p><strong>Payment:</strong> <span className={`badge ${bookedSeatDetails.payment_type === 'cash' ? 'badge-warning' : 'badge-success'}`}>{bookedSeatDetails.payment_type?.toUpperCase()}</span></p>
                <p><strong>Ref:</strong> {bookedSeatDetails.booking_ref}</p>
              </div>
              <button className="btn btn-outline" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setBookedSeatDetails(null)}>
                Close
              </button>
            </div>
          )}

          {/* No seat selected message */}
          {!selectedSeat && !bookedSeatDetails && !otpModal.show && (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>💺</div>
              <p>Click on an available seat to book it, or click a booked seat to view details.</p>
            </div>
          )}

          {/* Booking Form */}
          {selectedSeat && !otpModal.show && (
            <div className="card" style={{ borderLeft: '4px solid var(--primary)' }}>
              <h3 style={{ marginBottom: '1rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                💺 Book Seat {selectedSeat}
              </h3>
              <form onSubmit={handleBook}>
                <div className="input-group">
                  <label>Passenger Name</label>
                  <input required value={bookingForm.passengerName} onChange={e=>setBookingForm({...bookingForm, passengerName: e.target.value})} />
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>Age</label>
                    <input type="number" required value={bookingForm.passengerAge} onChange={e=>setBookingForm({...bookingForm, passengerAge: e.target.value})} />
                  </div>
                  <div className="input-group" style={{ flex: 1 }}>
                    <label>Gender</label>
                    <select required value={bookingForm.passengerGender} onChange={e=>setBookingForm({...bookingForm, passengerGender: e.target.value})}>
                      <option value="">Select</option>
                      <option value="M">Male</option>
                      <option value="F">Female</option>
                    </select>
                  </div>
                </div>
                <div className="input-group">
                  <label>Phone</label>
                  <input required value={bookingForm.passengerPhone} onChange={e=>setBookingForm({...bookingForm, passengerPhone: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Email</label>
                  <input type="email" value={bookingForm.passengerEmail} onChange={e=>setBookingForm({...bookingForm, passengerEmail: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Payment Method</label>
                  <select value={bookingForm.paymentType} onChange={e=>setBookingForm({...bookingForm, paymentType: e.target.value})}>
                    <option value="cash">Cash (Agent collects, needs OTP)</option>
                    <option value="prepaid">Online (Prepaid confirmation)</option>
                  </select>
                </div>
                
                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Book Now</button>
                  <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setSelectedSeat(null)}>Cancel</button>
                </div>
              </form>
            </div>
          )}

          {/* OTP Modal */}
          {otpModal.show && (
            <div className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
              <h3 style={{ marginBottom: '1rem' }}>Verify Cash Booking</h3>
              <p style={{ marginBottom: '1rem', fontSize: '0.875rem' }}>An OTP has been sent to your agent email. Please enter it to confirm cash collection.</p>
              <form onSubmit={handleVerifyOtp}>
                <div className="input-group">
                  <label>Enter 6-digit OTP</label>
                  <input required maxLength="6" value={otp} onChange={e=>setOtp(e.target.value)} style={{ letterSpacing: '0.25rem', textAlign: 'center', fontSize: '1.25rem' }} />
                </div>
                <button type="submit" className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
                  Verify & Confirm Booking
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
