import React, { useState } from 'react';
import api from '../../api';

export default function AgentPaymentPage({ trip, searchInfo, seats, passengers, onBooked, onBack }) {
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState('');
  const [otpModal, setOtpModal] = useState({ show: false, ref: '', idx: -1 });
  const [otp, setOtp] = useState('');
  const [stage, setStage] = useState('summary');

  const travelDate = searchInfo?.date || new Date().toISOString().split('T')[0];
  const hasPrepaid = passengers.some(p => p.paymentType === 'prepaid');

  const baseAmount = Array.isArray(seats) && seats.length > 0 && typeof seats[0] === 'object'
    ? seats.reduce((sum, s) => sum + (s.price || Number(trip.price)), 0)
    : seats.length * Number(trip.price);
  const gstRate = 0.05;
  const gstAmount = Math.round(baseAmount * gstRate * 100) / 100;
  const totalAmount = Math.round((baseAmount + gstAmount) * 100) / 100;

  const fmt = (iso) => {
    if (!iso) return '';
    return new Date(iso).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
  };
  const fmtDate = (str) => {
    if (!str) return '';
    return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const bookPassenger = async (p) => {
    const res = await api.post('/agent/book', {
      tripId: trip.tripId, seatNo: p.seatNo,
      fromStop: searchInfo.from, toStop: searchInfo.to, travelDate,
      passengerName: p.name, passengerAge: p.age, passengerGender: p.gender,
      passengerPhone: p.phone, passengerEmail: p.email, paymentType: p.paymentType
    });
    return res.data;
  };

  const confirmBooking = async () => {
    setBooking(true); setError(''); setStage('processing');
    const refs = [];
    try {
      for (let i = 0; i < passengers.length; i++) {
        const p = passengers[i];

        // If prepaid → open Razorpay first
        if (p.paymentType === 'prepaid') {
          try {
            const orderRes = await api.post('/payment/create-order', {
              tripId: trip.tripId,
              fromStop: searchInfo.from,
              toStop: searchInfo.to,
              seatType: 'seat',
              seats: 1,
              receipt: `agent_${trip.tripId}_${Date.now()}`
            });
            const orderData = orderRes.data;

            // Open Razorpay
            await new Promise((resolve, reject) => {
              const rzp = new window.Razorpay({
                key: orderData.keyId,
                amount: orderData.amount,
                currency: orderData.currency,
                name: 'Where is my Bus - Agent',
                description: `Seat ${p.seatNo} — ${searchInfo.from} → ${searchInfo.to}`,
                order_id: orderData.orderId,
                prefill: { name: p.name, contact: p.phone, email: p.email },
                image: 'https://whereismybusagent.vercel.app/logo_blue.png',
                theme: { color: '#e65100' },
                handler: async (response) => {
                  // Verify payment
                  try {
                    const verifyRes = await api.post('/payment/verify', {
                      razorpay_order_id: response.razorpay_order_id,
                      razorpay_payment_id: response.razorpay_payment_id,
                      razorpay_signature: response.razorpay_signature,
                    });
                    if (verifyRes.data.verified) resolve();
                    else reject(new Error('Payment verification failed'));
                  } catch { reject(new Error('Payment verification failed')); }
                },
                modal: { ondismiss: () => reject(new Error('Payment cancelled')) }
              });
              rzp.on('payment.failed', (r) => reject(new Error(r.error?.description || 'Payment failed')));
              rzp.open();
            });
          } catch (e) {
            setStage('failed'); setError(e.message || 'Payment failed');
            setBooking(false); return;
          }
        }

        // Book the seat
        const data = await bookPassenger(p);
        if (data.otpRequired) {
          setOtpModal({ show: true, ref: data.bookingRef, idx: i });
          setStage('summary'); setBooking(false); return;
        }
        refs.push(data.bookingRef || data.booking_ref || 'OK');
      }
      setStage('success');
      setTimeout(() => onBooked({ refs, count: passengers.length, trip, searchInfo, passengers }), 1500);
    } catch (e) {
      setStage('failed'); setError(e.response?.data?.error || 'Booking failed'); setBooking(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    try {
      await api.post('/agent/book/verify-otp', { bookingRef: otpModal.ref, otp });
      setOtpModal({ show: false, ref: '', idx: -1 }); setOtp('');
      setStage('success');
      setTimeout(() => onBooked({ refs: [otpModal.ref], count: passengers.length, trip, searchInfo, passengers }), 1500);
    } catch (e) { setError(e.response?.data?.error || 'OTP verification failed'); }
  };

  // PROCESSING
  if (stage === 'processing') {
    return (
      <div style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '60px 40px', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ width: 80, height: 80, margin: '0 auto 24px', position: 'relative' }}>
            <div style={{ width: 80, height: 80, border: '4px solid #e2e8f0', borderTopColor: '#e65100', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
            <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', fontSize: 28 }}>📋</div>
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Processing Booking...</div>
          <div style={{ fontSize: 14, color: '#64748b' }}>Please wait while we confirm your booking</div>
        </div>
      </div>
    );
  }

  // SUCCESS
  if (stage === 'success') {
    return (
      <div style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '60px 40px', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>✅</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a', marginBottom: 8 }}>Booking Successful!</div>
          <div style={{ fontSize: 14, color: '#64748b' }}>Redirecting to confirmation...</div>
        </div>
      </div>
    );
  }

  // FAILED
  if (stage === 'failed') {
    return (
      <div style={{ maxWidth: 500, margin: '40px auto', textAlign: 'center' }}>
        <div style={{ background: '#fff', borderRadius: 20, padding: '60px 40px', boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>❌</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#ef4444', marginBottom: 8 }}>Booking Failed</div>
          <div style={{ fontSize: 14, color: '#64748b', marginBottom: 20 }}>{error || 'Something went wrong'}</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={onBack} style={{ padding: '12px 24px', background: '#f1f5f9', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>← Back</button>
            <button onClick={() => { setStage('summary'); setError(''); }} style={{ padding: '12px 24px', background: '#e65100', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer' }}>Try Again</button>
          </div>
        </div>
      </div>
    );
  }

  // OTP MODAL
  if (otpModal.show) {
    return (
      <div style={{ maxWidth: 450, margin: '40px auto' }}>
        <div style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔐</div>
          <h3 style={{ marginBottom: 8, fontSize: 20, fontWeight: 700 }}>Verify Cash Booking</h3>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>An OTP has been sent to your agent email. Enter it to confirm.</p>
          <form onSubmit={verifyOtp}>
            <input required maxLength="6" value={otp} onChange={e => setOtp(e.target.value)}
              style={{ padding: '14px', fontSize: 24, letterSpacing: '0.3rem', textAlign: 'center', borderRadius: 10, border: '2px solid #e2e8f0', outline: 'none', width: '200px', marginBottom: 16 }}
              placeholder="------" />
            {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 12 }}>⚠ {error}</div>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <button type="button" onClick={() => { setOtpModal({ show: false, ref: '', idx: -1 }); setError(''); }}
                style={{ padding: '12px 24px', background: '#f1f5f9', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
              <button type="submit" style={{ padding: '12px 32px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 15 }}>
                Verify & Confirm
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // SUMMARY
  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div style={{ background: '#e65100', color: '#fff', borderRadius: '16px 16px 0 0', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>📋 Booking Summary — ₹{totalAmount.toFixed(2)}</div>
        <div style={{ fontSize: 13, opacity: 0.9 }}>{hasPrepaid ? '🔒 Razorpay Payment' : '💵 Cash Booking'}</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 0, background: '#f8fafc', borderRadius: '0 0 16px 16px', overflow: 'hidden', boxShadow: '0 8px 40px rgba(0,0,0,0.08)' }}>
        <div style={{ padding: 28, background: '#fff' }}>
          <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Payment Methods</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 24 }}>
            {passengers.map((p, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', border: '1.5px solid #f1f5f9', borderRadius: 12, background: '#fafafa' }}>
                <span style={{ fontSize: 24 }}>{p.paymentType === 'cash' ? '💵' : '💳'}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Seat {p.seatNo}</div>
                  <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.paymentType === 'cash' ? 'Cash Collection' : 'Razorpay Online'}</div>
                </div>
              </div>
            ))}
          </div>

          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 18, marginBottom: 24, border: '1px solid #f1f5f9' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#475569', marginBottom: 12 }}>How it works</div>
            {(hasPrepaid ? [
              { step: '1', text: 'Click "Confirm Booking" below' },
              { step: '2', text: 'Razorpay payment popup will open' },
              { step: '3', text: 'Complete UPI / Card / Netbanking payment' },
              { step: '4', text: 'Ticket confirmed instantly!' },
            ] : [
              { step: '1', text: 'Click "Confirm Booking" below' },
              { step: '2', text: 'OTP sent to your agent email' },
              { step: '3', text: 'Enter OTP to verify cash collection' },
              { step: '4', text: 'Ticket confirmed — share with passenger!' },
            ]).map(s => (
              <div key={s.step} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#e65100', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, flexShrink: 0 }}>{s.step}</div>
                <span style={{ fontSize: 13, color: '#475569' }}>{s.text}</span>
              </div>
            ))}
          </div>

          {error && <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, color: '#ef4444', fontSize: 13, marginBottom: 16 }}>⚠ {error}</div>}

          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onBack} style={{ padding: '14px 20px', background: '#f1f5f9', border: 'none', borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14, color: '#475569' }}>← Back</button>
            <button onClick={confirmBooking} disabled={booking} style={{
              flex: 1, padding: 16, background: booking ? '#94a3b8' : 'linear-gradient(135deg, #e65100, #ff8f00)',
              color: '#fff', border: 'none', borderRadius: 12, fontWeight: 800, cursor: booking ? 'not-allowed' : 'pointer', fontSize: 17,
              boxShadow: booking ? 'none' : '0 4px 14px rgba(230,81,0,0.3)'
            }}>
              {booking ? 'Processing...' : hasPrepaid ? `💳 Pay & Book (${passengers.length} seat${passengers.length > 1 ? 's' : ''})` : `✅ Confirm Booking (${passengers.length} seat${passengers.length > 1 ? 's' : ''})`}
            </button>
          </div>
        </div>

        {/* RIGHT: Trip Summary */}
        <div style={{ background: '#f8fafc', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
          
          {/* Fare Breakup */}
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>Fare Breakup</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 16 }}>{seats.length} Seat{seats.length > 1 ? 's' : ''}</div>

            {/* Per-type breakdown */}
            {(() => {
              const seatItems = Array.isArray(seats) && seats.length > 0 && typeof seats[0] === 'object' ? seats : [];
              const seatTypeSeats = seatItems.filter(s => s.type === 'seat');
              const sleeperSeats = seatItems.filter(s => s.type === 'sleeper');
              return seatItems.length > 0 ? (
                <div style={{ marginBottom: 8 }}>
                  {seatTypeSeats.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#475569' }}>💺 Seat × {seatTypeSeats.length}</span>
                      <span style={{ fontWeight: 600 }}>₹{(seatTypeSeats.reduce((s, x) => s + x.price, 0)).toFixed(0)}</span>
                    </div>
                  )}
                  {sleeperSeats.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                      <span style={{ color: '#7c3aed' }}>🛏️ Sleeper × {sleeperSeats.length}</span>
                      <span style={{ fontWeight: 600, color: '#7c3aed' }}>₹{(sleeperSeats.reduce((s, x) => s + x.price, 0)).toFixed(0)}</span>
                    </div>
                  )}
                </div>
              ) : null;
            })()}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 8 }}>
              <span style={{ color: '#475569' }}>Base Fare</span>
              <span style={{ fontWeight: 600 }}>₹{baseAmount.toFixed(0)}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, marginBottom: 12 }}>
              <span style={{ color: '#475569' }}>GST (5%)</span>
              <span style={{ fontWeight: 600 }}>₹{gstAmount.toFixed(2)}</span>
            </div>
            <div style={{
              borderTop: '2px solid #f1f5f9', paddingTop: 12, display: 'flex',
              justifyContent: 'space-between', fontSize: 18, fontWeight: 800
            }}>
              <span>Total Amount</span>
              <span style={{ color: '#e65100' }}>₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 4 }}>{trip.busCode}</div>
            <div style={{ fontSize: 12, color: '#94a3b8', marginBottom: 14 }}>{seats.length} Seat{seats.length > 1 ? 's' : ''} · {trip.routeName}</div>
            <div style={{ display: 'flex', alignItems: 'stretch', gap: 12, marginBottom: 16 }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1e293b', marginTop: 2 }} />
                <div style={{ flex: 1, width: 2, background: '#e2e8f0' }} />
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#1e293b' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(trip.fromDeparture)}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(travelDate)}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{searchInfo.from}</div>
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>{fmt(trip.toArrival)}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{fmtDate(travelDate)}</div>
                  <div style={{ fontWeight: 600, fontSize: 13, marginTop: 2 }}>{searchInfo.to}</div>
                </div>
              </div>
            </div>
            <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>Passengers</div>
              {passengers.map((p, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{p.name}</div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.gender === 'M' ? 'Male' : 'Female'} {p.age ? `· ${p.age}y` : ''}</div>
                  </div>
                  <div style={{ fontSize: 12, color: '#2563eb', fontWeight: 600 }}>Seat {p.seatNo}</div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 14, padding: 20, boxShadow: '0 2px 12px rgba(0,0,0,0.04)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 4 }}>Seats: {seats.join(', ')}</div>
            <div style={{ fontSize: 12, color: '#94a3b8' }}>
              {passengers.filter(p => p.paymentType === 'cash').length > 0 && <span>💵 {passengers.filter(p => p.paymentType === 'cash').length} Cash</span>}
              {passengers.filter(p => p.paymentType === 'prepaid').length > 0 && <span style={{ marginLeft: 8 }}>💳 {passengers.filter(p => p.paymentType === 'prepaid').length} Online</span>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
