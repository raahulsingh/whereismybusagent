import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import api from '../api';
import './SeatLayout.css';

export default function SeatLayoutPage() {
  const { tripId } = useParams();
  const [searchParams] = useSearchParams();
  const fromStop = searchParams.get('from');
  const toStop = searchParams.get('to');
  
  const [layoutData, setLayoutData] = useState(null);
  const [selectedSeat, setSelectedSeat] = useState(null);
  const [bookedSeatDetails, setBookedSeatDetails] = useState(null);
  const [bookingForm, setBookingForm] = useState({
    passengerName: '', passengerAge: '', passengerGender: '', 
    passengerPhone: '', passengerEmail: '', paymentType: 'cash'
  });
  const [otpModal, setOtpModal] = useState({ show: false, ref: '' });
  const [otp, setOtp] = useState('');

  const navigate = useNavigate();

  useEffect(() => {
    fetchLayout();
  }, [tripId]);

  const fetchLayout = async () => {
    try {
      // Pass today's date placeholder for now, or you could pass date from URL
      const date = new Date().toISOString().split('T')[0];
      const res = await api.get(`/agent/layout/${tripId}?date=${date}`);
      setLayoutData(res.data);
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to fetch layout');
    }
  };

  const handleSeatClick = (seatObj) => {
    const seatId = seatObj.id;
    if (layoutData.bookedSeats && layoutData.bookedSeats[seatId]) {
      // It's booked -> show details
      setBookedSeatDetails(layoutData.bookedSeats[seatId]);
      setSelectedSeat(null);
    } else {
      // It's available -> allow booking
      setSelectedSeat(seatId);
      setBookedSeatDetails(null);
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
        travelDate: new Date().toISOString().split('T')[0],
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

  if (!layoutData) return <div>Loading...</div>;

  let parsedLayout = [];
  try {
    parsedLayout = JSON.parse(layoutData.layoutJson || '[]');
  } catch (e) { console.error('Layout parse error'); }

  return (
    <div style={{ display: 'flex', gap: '2rem' }}>
      <div className="card" style={{ flex: 1 }}>
        <h2 style={{ marginBottom: '1rem' }}>Seat Layout</h2>
        <div className="bus-layout">
          {parsedLayout.map((row, rIdx) => (
            <div key={rIdx} className="seat-row">
              {row.map((seat, cIdx) => {
                if (seat.type === 'aisle' || seat.type === 'gap') {
                  return <div key={cIdx} className="seat aisle"></div>;
                }
                const isBooked = !!(layoutData.bookedSeats && layoutData.bookedSeats[seat.id]);
                const isSelected = selectedSeat === seat.id;
                
                let cls = 'seat standard';
                if (seat.type === 'sleeper') cls = 'seat sleeper';
                if (isBooked) cls += ' booked';
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

      <div style={{ width: '400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Passenger Info Modal (if booked seat clicked) */}
        {bookedSeatDetails && (
          <div className="card" style={{ borderColor: 'var(--danger)' }}>
            <h3 style={{ color: 'var(--danger)', marginBottom: '1rem' }}>Booked Seat Info</h3>
            <p><strong>Seat:</strong> {bookedSeatDetails.seat_no}</p>
            <p><strong>Passenger:</strong> {bookedSeatDetails.passenger_name} ({bookedSeatDetails.passenger_gender}, {bookedSeatDetails.passenger_age})</p>
            <p><strong>Phone:</strong> {bookedSeatDetails.passenger_phone}</p>
            <p><strong>Email:</strong> {bookedSeatDetails.passenger_email || 'N/A'}</p>
            <p><strong>Amount:</strong> ₹{bookedSeatDetails.amount}</p>
            <p><strong>Payment:</strong> {bookedSeatDetails.payment_type?.toUpperCase()}</p>
            <p><strong>Ref:</strong> {bookedSeatDetails.booking_ref}</p>
            <button className="btn btn-outline" style={{ marginTop: '1rem', width: '100%' }} onClick={() => setBookedSeatDetails(null)}>
              Close
            </button>
          </div>
        )}

        {/* Booking Form */}
        {selectedSeat && !otpModal.show && (
          <div className="card">
            <h3 style={{ marginBottom: '1rem', color: 'var(--primary)' }}>Book Seat {selectedSeat}</h3>
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
          <div className="card" style={{ borderColor: 'var(--primary)' }}>
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
  );
}
