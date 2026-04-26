import React from 'react';

const fmt = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true });
};

const fmtDate = (str) => {
  if (!str) return '';
  const d = new Date(str + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
};

export default function AgentBusList({ results, searchInfo, onSelect }) {
  if (!results || results.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8', fontSize: 16 }}>
        😔 No trips found for your assigned buses on this route.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '0 auto' }}>
      <div style={{ fontSize: 14, color: '#64748b', marginBottom: 12 }}>
        <strong>{results.length} trips</strong> found — {searchInfo.from} → {searchInfo.to} · {fmtDate(searchInfo.date)}
      </div>
      {results.map((trip, i) => (
        <div key={trip.tripId || i} onClick={() => onSelect(trip)} style={{
          background: '#fff', borderRadius: 12, padding: '18px 22px', marginBottom: 12,
          boxShadow: '0 2px 10px rgba(0,0,0,0.06)', cursor: 'pointer',
          border: '1.5px solid transparent', transition: 'all 0.15s',
        }}
          onMouseEnter={e => e.currentTarget.style.borderColor = '#2563eb'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: 17 }}>🚌 {trip.busCode}</div>
              <div style={{ fontSize: 13, color: '#64748b', marginBottom: 6 }}>{trip.routeName}</div>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ fontSize: 20, fontWeight: 800, color: '#16a34a' }}>₹{trip.price}</span>
                {trip.sleeperPrice > 0 && <span style={{ fontSize: 18, fontWeight: 700, color: '#9333ea' }}>₹{trip.sleeperPrice}</span>}
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 4, fontSize: 12, color: '#64748b' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>💺 Seat</span>
                {trip.sleeperPrice > 0 && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>🛏️ Sleeper</span>}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 12 }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(trip.fromDeparture || trip.fromTime)}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{trip.fromStop || searchInfo.from}</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center', color: '#94a3b8', fontSize: 12 }}>
              <div style={{ borderBottom: '1.5px solid #e2e8f0', marginBottom: 6, width: '100%' }}></div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700 }}>{fmt(trip.toArrival || trip.toTime)}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{trip.toStop || searchInfo.to}</div>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
            <span style={{ background: '#f0fdf4', color: '#16a34a', padding: '6px 12px', borderRadius: 8, fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
              🪑 {trip.availableSeats} seats available
            </span>
            <button style={{ background: '#eff6ff', color: '#2563eb', padding: '8px 16px', borderRadius: 8, fontSize: 14, fontWeight: 700, border: 'none', cursor: 'pointer' }}>
              Select Seat →
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
