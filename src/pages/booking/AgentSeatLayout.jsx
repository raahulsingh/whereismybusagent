import React, { useEffect, useState } from 'react';
import api from '../../api';

export default function AgentSeatLayout({ trip, searchInfo, onGoToPayment, savedSeats, savedPassengers }) {
  const [layoutData, setLayoutData] = useState(null);
  const initialSelected = savedSeats?.length > 0 
    ? (typeof savedSeats[0] === 'object' ? savedSeats.map(s => s.seatNo) : savedSeats) 
    : [];
  const [selected, setSelected] = useState(initialSelected);
  const [bookedSeatInfo, setBSI] = useState(null);
  const [step, setStep] = useState(savedPassengers?.length > 0 ? 'passenger' : 'seats');
  const [passengers, setPassengers] = useState(savedPassengers?.length > 0 ? savedPassengers : []);
  const [error, setError] = useState('');
  const [viewDeck, setViewDeck] = useState('lower');
  const travelDate = searchInfo?.date || new Date().toISOString().split('T')[0];

  const seatPrice = Number(trip?.price || 0);
  const sleeperPrice = trip?.sleeperPrice ? Number(trip.sleeperPrice) : seatPrice * 1.5;
  const getPriceForType = (type) => type === 'sleeper' ? sleeperPrice : seatPrice;

  useEffect(() => {
    if (!trip) return;
    api.get(`/agent/layout/${trip.tripId}?date=${travelDate}`)
      .then(r => setLayoutData(r.data))
      .catch(e => alert(e.response?.data?.error || 'Failed to fetch layout'));
  }, [trip?.tripId, travelDate]);

  if (!trip) return <div style={{ textAlign: 'center', padding: 40 }}>No trip selected.</div>;
  if (!layoutData) return <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>Loading seats…</div>;

  let parsedLayout = [];
  try { parsedLayout = JSON.parse(layoutData.layoutJson || '[]'); } catch {}

  // The layout from seat_layouts is a FLAT array [{seatNo, row, col, type, deck}]
  const allSeats = parsedLayout.filter(s => s.seatNo).map(s => ({ ...s, deck: s.deck || 'lower' }));
  const bookedMap = layoutData.bookedSeats || {};
  const bookedCount = Object.keys(bookedMap).length;
  const availCount = allSeats.length - bookedCount;

  const hasUpperDeck = allSeats.some(s => s.deck === 'upper');
  const deckSeats = allSeats.filter(s => s.deck === viewDeck);
  const rows = deckSeats.length > 0 ? [...new Set(deckSeats.map(s => s.row))].sort((a, b) => a - b) : [];
  const cols = deckSeats.length > 0 ? [...new Set(deckSeats.map(s => s.col))].sort((a, b) => a - b) : [];
  const aisleAfter = 1;

  const toggleSeat = (seatNo) => {
    if (bookedMap[seatNo]) { setBSI(bookedMap[seatNo]); return; }
    setBSI(null);
    setSelected(p => p.includes(seatNo) ? p.filter(s => s !== seatNo) : [...p, seatNo]);
  };

  const goToPassenger = () => {
    if (selected.length === 0) { setError('Select at least one seat'); return; }
    setError('');
    setPassengers(selected.map(s => ({ seatNo: s, name: '', age: '', gender: 'M', phone: '', email: '', paymentType: 'cash' })));
    setStep('passenger');
  };

  const updateP = (i, f, v) => setPassengers(p => p.map((x, j) => j === i ? { ...x, [f]: v } : x));

  const confirmBooking = () => {
    for (let i = 0; i < passengers.length; i++) {
      const p = passengers[i];
      const label = `Passenger ${i + 1} (Seat ${p.seatNo})`;
      if (!p.name.trim()) { setError(`${label}: Name is required.`); return; }
      if (!/^[a-zA-Z\s.]+$/.test(p.name.trim())) { setError(`${label}: Name should contain only letters and spaces.`); return; }
      if (p.age && (isNaN(p.age) || Number(p.age) < 1 || Number(p.age) > 90)) { setError(`${label}: Age must be between 1 and 90.`); return; }
      if (!p.phone.trim()) { setError(`${label}: Phone number is required.`); return; }
      if (!/^\d{10}$/.test(p.phone.trim())) { setError(`${label}: Phone must be exactly 10 digits.`); return; }
      if (p.email && p.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email.trim())) { setError(`${label}: Invalid email format.`); return; }
    }
    setError('');
    const selectedObjects = selected.map(seatNo => {
      const info = getSeatInfo(seatNo);
      return { seatNo, type: info.type, price: getPriceForType(info.type) };
    });
    onGoToPayment(selectedObjects, passengers);
  };

  const getSeatInfo = (seatNo) => allSeats.find(s => s.seatNo === seatNo) || { type: 'seat' };
  const totalAmount = selected.reduce((sum, seatNo) => sum + getPriceForType(getSeatInfo(seatNo).type), 0);

  const inp = { padding: '9px 12px', fontSize: 13, borderRadius: 8, border: '1.5px solid #e2e8f0', outline: 'none', width: '100%', boxSizing: 'border-box' };

  return (
    <div style={{ maxWidth: 780, margin: '0 auto' }}>
      {/* Trip Header */}
      <div style={{ background: '#fff', borderRadius: 12, padding: '16px 22px', marginBottom: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
        <div style={{ fontWeight: 700, fontSize: 17 }}>🚌 {trip.busCode} — {trip.routeName}</div>
        <div style={{ fontSize: 13, color: '#64748b', marginTop: 4, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <span>{searchInfo.from} → {searchInfo.to} · {travelDate}</span>
          <span style={{ color: '#16a34a', fontWeight: 700 }}>💺 ₹{seatPrice.toFixed(0)}</span>
          {sleeperPrice !== seatPrice && <span style={{ color: '#7c3aed', fontWeight: 700 }}>🛏️ ₹{sleeperPrice.toFixed(0)}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          {['seats', 'passenger'].map((s, i) => (
            <div key={s} style={{
              padding: '4px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
              background: step === s ? '#2563eb' : '#f1f5f9', color: step === s ? '#fff' : '#64748b'
            }}>{i + 1}. {s === 'seats' ? 'Select Seats' : 'Passenger Info'}</div>
          ))}
        </div>
      </div>

      {/* SEAT SELECTION */}
      {step === 'seats' && (
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', gap: 14, marginBottom: 16, fontSize: 12, flexWrap: 'wrap' }}>
            {[
              ['linear-gradient(135deg, #ecfdf5, #d1fae5)', '#22c55e', `💺 Available (${availCount})`],
              ['linear-gradient(135deg, #ede9fe, #ddd6fe)', '#a78bfa', '🛏️ Sleeper'],
              ['#fef9c3', '#f59e0b', '✅ Selected'],
              ['#f1f5f9', '#cbd5e1', `🚫 Booked (${bookedCount})`],
            ].map(([bg, col, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <div style={{ width: 20, height: label.includes('Sleeper') ? 32 : 20, background: bg, border: `2px solid ${col}`, borderRadius: 5 }} />
                <span style={{ color: '#475569' }}>{label}</span>
              </div>
            ))}
          </div>
          {/* Deck tabs */}
          {hasUpperDeck && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
              {[['lower', '⬇️ Lower Deck', '#2563eb'], ['upper', '⬆️ Upper Deck', '#7c3aed']].map(([d, lbl, clr]) => (
                <button key={d} onClick={() => setViewDeck(d)} style={{
                  padding: '8px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13,
                  background: viewDeck === d ? clr : '#f1f5f9',
                  color: viewDeck === d ? '#fff' : '#64748b',
                }}>{lbl}</button>
              ))}
            </div>
          )}
          <div style={{ textAlign: 'center', marginBottom: 16, fontSize: 20 }}>🚗 Driver</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'center' }}>
            {rows.map(row => (
              <div key={row} style={{ display: 'flex', gap: 6, alignItems: 'flex-start' }}>
                <div style={{ width: 22, fontSize: 11, color: '#94a3b8', textAlign: 'right', paddingTop: 18 }}>{row + 1}</div>
                {cols.map(col => {
                  const seat = deckSeats.find(s => s.row === row && s.col === col);
                  if (!seat) return (
                    <React.Fragment key={col}>
                      {col === aisleAfter + 1 && <div style={{ width: 24 }} />}
                      <div style={{ width: 54 }} />
                    </React.Fragment>
                  );
                  const seatNo = seat.seatNo;
                  const isBooked = !!bookedMap[seatNo];
                  const isSel = selected.includes(seatNo);
                  const isSleeper = seat.type === 'sleeper';
                  const h = isSleeper ? 120 : 58;
                  let bg, border, color;
                  if (isBooked) { bg = '#f1f5f9'; border = '2px solid #cbd5e1'; color = '#94a3b8'; }
                  else if (isSel) { bg = '#fef9c3'; border = '2px solid #f59e0b'; color = '#854d0e'; }
                  else if (isSleeper) { bg = 'linear-gradient(135deg, #ede9fe, #ddd6fe)'; border = '2px solid #a78bfa'; color = '#5b21b6'; }
                  else { bg = 'linear-gradient(135deg, #ecfdf5, #d1fae5)'; border = '2px solid #6ee7b7'; color = '#15803d'; }
                  return (
                    <React.Fragment key={col}>
                      {col === aisleAfter + 1 && <div style={{ width: 24 }} />}
                      <div onClick={() => toggleSeat(seatNo)} title={`${seatNo}${isBooked ? ' (Booked)' : ''}`}
                        style={{
                          width: 54, height: h, borderRadius: isSleeper ? 14 : 10,
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                          fontSize: 11, fontWeight: 700, cursor: 'pointer', transition: 'all 0.15s',
                          background: bg, border, color,
                          transform: isSel ? 'scale(1.08)' : 'scale(1)',
                          boxShadow: isSel ? '0 0 0 3px #fcd34d55' : '0 1px 4px rgba(0,0,0,0.07)',
                        }}>
                        <span style={{ fontSize: isSleeper ? 26 : 18 }}>{isBooked ? '🚫' : isSel ? '✅' : isSleeper ? '🛏️' : '💺'}</span>
                        <span style={{ fontSize: 11 }}>{seatNo}</span>
                        {!isBooked && <span style={{ fontSize: 9, color: isSel ? '#854d0e' : color, marginTop: 1 }}>₹{getPriceForType(seat.type).toFixed(0)}</span>}
                      </div>
                    </React.Fragment>
                  );
                })}
              </div>
            ))}
          </div>

          {bookedSeatInfo && (
            <div style={{ marginTop: 16, padding: 16, background: '#fef2f2', borderRadius: 10, border: '1px solid #fecaca' }}>
              <div style={{ fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>🔴 Booked Seat Info</div>
              <p style={{ fontSize: 13 }}><strong>Seat:</strong> {bookedSeatInfo.seat_no} · <strong>Passenger:</strong> {bookedSeatInfo.passenger_name} · <strong>Phone:</strong> {bookedSeatInfo.passenger_phone}</p>
              <p style={{ fontSize: 13 }}><strong>Payment:</strong> {bookedSeatInfo.payment_type?.toUpperCase()} · <strong>Ref:</strong> {bookedSeatInfo.booking_ref}</p>
              <button onClick={() => setBSI(null)} style={{ marginTop: 8, padding: '6px 16px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', fontSize: 13 }}>Close</button>
            </div>
          )}

          <div className="mobile-col" style={{
            marginTop: 20, padding: '14px 18px', background: selected.length > 0 ? '#eff6ff' : '#f8fafc',
            borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10,
            border: '1.5px solid ' + (selected.length > 0 ? '#bfdbfe' : '#e2e8f0')
          }}>
            <div style={{ flex: 1 }}>
              {selected.length === 0
                ? <span style={{ color: '#94a3b8', fontSize: 14 }}>Select seat(s) to book</span>
                : <>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {selected.length} seat{selected.length > 1 ? 's' : ''}: {selected.join(', ')}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                    {selected.filter(s => getSeatInfo(s).type !== 'sleeper').length > 0 && <span style={{ marginRight: 10 }}>💺 {selected.filter(s => getSeatInfo(s).type !== 'sleeper').length} × ₹{seatPrice.toFixed(0)}</span>}
                    {selected.filter(s => getSeatInfo(s).type === 'sleeper').length > 0 && <span>🛏️ {selected.filter(s => getSeatInfo(s).type === 'sleeper').length} × ₹{sleeperPrice.toFixed(0)}</span>}
                  </div>
                  <div style={{ fontSize: 14, color: '#2563eb', fontWeight: 700, marginTop: 2 }}>Total: ₹{totalAmount.toFixed(0)}</div>
                </>}
            </div>
            <button className="mobile-w-100" onClick={goToPassenger} disabled={selected.length === 0} style={{
              padding: '12px 24px', background: selected.length > 0 ? '#16a34a' : '#cbd5e1', color: '#fff',
              border: 'none', borderRadius: 8, fontWeight: 700, cursor: selected.length > 0 ? 'pointer' : 'not-allowed', fontSize: 14
            }}>Continue →</button>
          </div>
          {error && <div style={{ color: '#ef4444', fontSize: 13, marginTop: 8 }}>⚠ {error}</div>}
        </div>
      )}

      {/* PASSENGER FORMS */}
      {step === 'passenger' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {passengers.map((p, idx) => {
            const seatInfo = getSeatInfo(p.seatNo);
            const isSleeper = seatInfo.type === 'sleeper';
            return (
            <div key={p.seatNo} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 2px 10px rgba(0,0,0,0.06)' }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14, color: isSleeper ? '#7c3aed' : '#2563eb' }}>
                {isSleeper ? '🛏️ Sleeper' : '💺 Seat'} {p.seatNo} — Passenger {idx + 1}
                <span style={{ fontSize: 12, fontWeight: 500, color: '#64748b', marginLeft: 8 }}>₹{getPriceForType(seatInfo.type).toFixed(0)}</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>FULL NAME *</label>
                  <input style={inp} placeholder="Passenger name" value={p.name} onChange={e => updateP(idx, 'name', e.target.value)} />
                </div>
                <div><label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>AGE</label>
                  <input style={inp} type="number" placeholder="Age" value={p.age} onChange={e => updateP(idx, 'age', e.target.value)} /></div>
                <div><label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>GENDER</label>
                  <select style={inp} value={p.gender} onChange={e => updateP(idx, 'gender', e.target.value)}>
                    <option value="M">Male</option><option value="F">Female</option></select></div>
                <div><label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>PHONE *</label>
                  <input style={inp} placeholder="Mobile number" value={p.phone} onChange={e => updateP(idx, 'phone', e.target.value)} /></div>
                <div><label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>EMAIL</label>
                  <input style={inp} type="email" placeholder="Email (optional)" value={p.email} onChange={e => updateP(idx, 'email', e.target.value)} /></div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 11, color: '#64748b', fontWeight: 600 }}>PAYMENT METHOD</label>
                  <select style={inp} value={p.paymentType} onChange={e => updateP(idx, 'paymentType', e.target.value)}>
                    <option value="cash">💵 Cash (Agent collects)</option>
                    <option value="prepaid">💳 Online (Prepaid)</option>
                  </select>
                </div>
              </div>
            </div>
          )})}

          <div style={{
            background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: 12, padding: '14px 18px',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <div style={{ fontWeight: 700 }}>{selected.length} Seat{selected.length > 1 ? 's' : ''}: {selected.join(', ')}</div>
              <div style={{ fontSize: 13, color: '#64748b' }}>
                {selected.filter(s => getSeatInfo(s).type !== 'sleeper').length > 0 && <span style={{ marginRight: 10 }}>💺 {selected.filter(s => getSeatInfo(s).type !== 'sleeper').length} × ₹{seatPrice.toFixed(0)}</span>}
                {selected.filter(s => getSeatInfo(s).type === 'sleeper').length > 0 && <span>🛏️ {selected.filter(s => getSeatInfo(s).type === 'sleeper').length} × ₹{sleeperPrice.toFixed(0)}</span>}
              </div>
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>₹{totalAmount.toFixed(0)}</div>
          </div>

          {error && <div style={{ color: '#ef4444', fontSize: 13 }}>⚠ {error}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setStep('seats')} style={{ padding: '12px 22px', background: '#f1f5f9', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer', fontSize: 14 }}>← Back</button>
            <button onClick={confirmBooking} style={{
              flex: 1, padding: 12, background: 'linear-gradient(135deg, #e65100, #ff8f00)', color: '#fff',
              border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 15,
              boxShadow: '0 4px 14px rgba(230,81,0,0.3)'
            }}>💳 Proceed to Payment — ₹{totalAmount.toFixed(0)}</button>
          </div>
        </div>
      )}
    </div>
  );
}
