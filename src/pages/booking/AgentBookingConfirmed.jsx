import React, { useRef } from 'react';

export default function AgentBookingConfirmed({ data, onDone, onBookMore }) {
  const ticketRef = useRef(null);

  if (!data) return <div style={{ textAlign: 'center', padding: 40 }}>No booking data.</div>;

  const fmtDate = (str) => {
    if (!str) return '';
    return new Date(str + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const ticketText = () => {
    const lines = [
      `🚌 *Where is my Bus - Ticket*`,
      `━━━━━━━━━━━━━━━━━`,
      `📌 *${data.searchInfo?.from} → ${data.searchInfo?.to}*`,
      `📅 Date: ${fmtDate(data.searchInfo?.date)}`,
      `🕒 Dep: ${data.trip?.fromDeparture || data.trip?.fromTime ? new Date((data.trip?.fromDeparture || data.trip?.fromTime).replace(' ', 'T')).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}`,
      `🚌 Bus: ${data.trip?.busCode || ''} ${data.trip?.busPlate ? '(' + data.trip?.busPlate + ')' : ''}`,
    ];
    if (data.refs?.length > 0) {
      lines.push(`🔖 Ref: ${data.refs.join(', ')}`);
    }
    if (data.passengers?.length > 0) {
      lines.push(`━━━━━━━━━━━━━━━━━`);
      data.passengers.forEach((p, i) => {
        lines.push(`👤 ${p.name} | Seat: ${p.seatNo} | ${p.gender === 'M' ? 'Male' : 'Female'}${p.age ? ` | ${p.age}y` : ''}`);
      });
    }
    lines.push(`━━━━━━━━━━━━━━━━━`);
    lines.push(`✅ Status: CONFIRMED`);
    lines.push(`📱 Powered by Where is my Bus`);
    return lines.join('\n');
  };

  const shareWhatsApp = () => {
    const text = encodeURIComponent(ticketText());
    const phone = data.passengers?.[0]?.phone || '';
    const url = phone
      ? `https://wa.me/91${phone}?text=${text}`
      : `https://wa.me/?text=${text}`;
    window.open(url, '_blank');
  };

  const printTicket = () => {
    const printContent = ticketRef.current;
    if (!printContent) return;
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
        <div class="row"><span class="label">Route:</span><span class="value">${data.searchInfo?.from} → ${data.searchInfo?.to}</span></div>
        <div class="row"><span class="label">Date:</span><span class="value">${fmtDate(data.searchInfo?.date)}</span></div>
        <div class="row"><span class="label">Dep. Time:</span><span class="value">${data.trip?.fromDeparture || data.trip?.fromTime ? new Date((data.trip?.fromDeparture || data.trip?.fromTime).replace(' ', 'T')).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : '-'}</span></div>
        <div class="row"><span class="label">Bus:</span><span class="value">${data.trip?.busCode || '-'} ${data.trip?.busPlate ? '(' + data.trip?.busPlate + ')' : ''}</span></div>
        ${data.refs?.map(r => `<div class="row"><span class="label">Ref:</span><span class="value">${r}</span></div>`).join('') || ''}
        <div class="divider"></div>
        ${(data.passengers || []).map((p, i) => `
          <div class="row"><span class="label">Passenger ${i + 1}:</span><span class="value">${p.name}</span></div>
          <div class="row"><span class="label">Seat:</span><span class="value">${p.seatNo}</span></div>
          <div class="row"><span class="label">Phone:</span><span class="value">${p.phone}</span></div>
          ${i < (data.passengers.length - 1) ? '<div class="divider"></div>' : ''}
        `).join('')}
        <div class="status">✅ CONFIRMED</div>
        <div class="footer">Powered by Where is my Bus</div>
      </div>
      <script>window.onload=()=>{window.print();}</script>
      </body></html>
    `);
    w.document.close();
  };

  return (
    <div style={{ maxWidth: 500, margin: '0 auto', textAlign: 'center' }}>
      <div ref={ticketRef} style={{ background: '#fff', borderRadius: 16, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>
        <div style={{ fontSize: 60, marginBottom: 12 }}>🎉</div>
        <h2 style={{ color: '#16a34a', marginBottom: 8 }}>Booking Confirmed!</h2>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 20 }}>
          {data.count} seat{data.count > 1 ? 's' : ''} booked successfully
        </p>

        {data.refs && data.refs.length > 0 && (
          <div style={{ background: '#f0fdf4', borderRadius: 10, padding: 16, marginBottom: 20, border: '1px solid #bbf7d0' }}>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}>Booking Reference{data.refs.length > 1 ? 's' : ''}</div>
            {data.refs.map((ref, i) => (
              <div key={i} style={{ fontWeight: 700, fontSize: 16, color: '#1e293b', fontFamily: 'monospace' }}>{ref}</div>
            ))}
          </div>
        )}

        {data.passengers && data.passengers.length > 0 && (
          <div style={{ textAlign: 'left', marginBottom: 20 }}>
            {data.passengers.map((p, i) => (
              <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '6px 0', borderBottom: '1px solid #f1f5f9' }}>
                <span>👤 {p.name}</span>
                <span style={{ color: '#2563eb', fontWeight: 600 }}>Seat {p.seatNo}</span>
              </div>
            ))}
          </div>
        )}

        {data.trip && (
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>
            🚌 {data.trip.busCode} {data.trip.busPlate ? `(${data.trip.busPlate})` : ''} · 🕒 {data.trip.fromDeparture || data.trip.fromTime ? new Date((data.trip.fromDeparture || data.trip.fromTime).replace(' ', 'T')).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true }) : ''} · {data.searchInfo?.from} → {data.searchInfo?.to} · {fmtDate(data.searchInfo?.date)}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 16 }}>
          <button onClick={shareWhatsApp} style={{
            padding: '12px 20px', background: '#25D366', color: '#fff', border: 'none',
            borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6
          }}>
            📱 Share on WhatsApp
          </button>
          <button onClick={printTicket} style={{
            padding: '12px 20px', background: '#1e293b', color: '#fff', border: 'none',
            borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', gap: 6
          }}>
            🖨️ Print Ticket
          </button>
        </div>

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button onClick={onBookMore} style={{
            padding: '12px 24px', background: '#eff6ff', color: '#2563eb', border: 'none',
            borderRadius: 10, fontWeight: 600, cursor: 'pointer', fontSize: 14
          }}>
            Book More Seats
          </button>
          <button onClick={onDone} style={{
            padding: '12px 24px', background: '#2563eb', color: '#fff', border: 'none',
            borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontSize: 14
          }}>
            New Search
          </button>
        </div>
      </div>
    </div>
  );
}
