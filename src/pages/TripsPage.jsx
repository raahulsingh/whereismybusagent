import React, { useEffect, useState } from 'react';
import api from '../api';

export default function TripsPage() {
  const [buses, setBuses] = useState([]);
  const [formData, setFormData] = useState({ busId: '', departureTime: '' });
  
  // Stop-wise pricing state
  const [selectedRouteForPricing, setSelectedRouteForPricing] = useState('');
  const [routeStops, setRouteStops] = useState([]);
  const [stopPriceEdits, setStopPriceEdits] = useState({});
  const [pricingSaving, setPricingSaving] = useState(false);
  const [pricingMsg, setPricingMsg] = useState('');

  // Trips list state
  const [trips, setTrips] = useState([]);
  const [editingTrip, setEditingTrip] = useState(null);
  const [editTime, setEditTime] = useState('');

  useEffect(() => {
    fetchBuses();
    fetchTrips();
  }, []);

  const fetchBuses = async () => {
    try {
      const res = await api.get('/agent/my-buses');
      setBuses(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateTrip = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/agent/trips', formData);
      alert(`Trip created! ${res.data.stopTimesCreated} stop times generated.`);
      setFormData({ busId: '', departureTime: '' });
      fetchTrips();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to create trip');
    }
  };

  const fetchTrips = async () => {
    try {
      const res = await api.get('/agent/my-trips');
      setTrips(res.data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleEditTrip = async (tripId) => {
    if (!editTime) return;
    try {
      await api.put(`/agent/trips/${tripId}`, { departureTime: editTime });
      setEditingTrip(null);
      setEditTime('');
      fetchTrips();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update trip');
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm('Are you sure? This will also delete all bookings for this trip.')) return;
    try {
      await api.delete(`/agent/trips/${tripId}`);
      fetchTrips();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to delete trip');
    }
  };

  const fmtDt = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleString('en-IN', {
      day: '2-digit', month: 'short', year: 'numeric',
      hour: '2-digit', minute: '2-digit', hour12: true
    });
  };

  // Derive unique routes from agent's assigned buses
  const agentRoutes = buses.reduce((acc, b) => {
    if (b.route_id && !acc.find(r => String(r.id) === String(b.route_id))) {
      acc.push({ id: b.route_id, name: b.route_name, code: b.code });
    }
    return acc;
  }, []);

  // Load route stops for pricing when route is selected
  const handleRouteSelectForPricing = async (routeId) => {
    setSelectedRouteForPricing(routeId);
    setPricingMsg('');
    setRouteStops([]);
    setStopPriceEdits({});
    if (!routeId) return;

    try {
      const res = await api.get(`/agent/routes/${routeId}/stops`);
      const sorted = (Array.isArray(res.data) ? res.data : []).sort((a, b) => a.seq - b.seq);
      setRouteStops(sorted);
      const edits = {};
      for (const s of sorted) {
        edits[s.id] = {
          priceOffset: s.priceOffset ?? s.price_offset ?? 0,
          sleeperPriceOffset: s.sleeperPriceOffset ?? s.sleeper_price_offset ?? 0,
        };
      }
      setStopPriceEdits(edits);
    } catch (e) {
      setPricingMsg('❌ Failed to load stops');
    }
  };

  const saveStopPricing = async () => {
    setPricingSaving(true);
    setPricingMsg('');
    try {
      for (const stop of routeStops) {
        const edit = stopPriceEdits[stop.id];
        if (!edit) continue;
        await api.put(`/agent/stops/${stop.id}/pricing`, {
          priceOffset: Number(edit.priceOffset),
          sleeperPriceOffset: Number(edit.sleeperPriceOffset),
        });
      }
      setPricingMsg('✅ Prices saved successfully!');
      if (selectedRouteForPricing) handleRouteSelectForPricing(selectedRouteForPricing);
    } catch (e) {
      setPricingMsg('❌ Failed: ' + (e.response?.data?.error || e.message));
    }
    setPricingSaving(false);
  };

  const inp = {
    padding: '9px 12px', borderRadius: 8, border: '1.5px solid #e2e8f0',
    fontSize: 14, outline: 'none', background: '#fff',
  };

  const thStyle = {
    padding: '11px 14px', textAlign: 'left', fontWeight: 700,
    fontSize: 12, color: '#64748b', textTransform: 'uppercase',
    letterSpacing: '0.04em', whiteSpace: 'nowrap',
    borderBottom: '2px solid #e2e8f0', background: '#f8fafc',
  };

  const tdStyle = { padding: '11px 14px', fontSize: 13, whiteSpace: 'nowrap' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 className="page-title">Manage Trips & Fares</h1>

      {/* Create Trip Form */}
      <div className="card">
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Schedule New Trip</h2>
        <form onSubmit={handleCreateTrip}>
          <div className="input-group">
            <label>Select Bus</label>
            <select 
              required 
              value={formData.busId}
              onChange={e => setFormData({...formData, busId: e.target.value})}
            >
              <option value="">-- Choose Assigned Bus --</option>
              {buses.map(b => (
                <option key={b.id} value={b.id}>{b.code}{b.plate ? ' - ' + b.plate : ''} (Route: {b.route_name})</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label>Departure Date & Time</label>
            <input 
              type="datetime-local" 
              required 
              value={formData.departureTime}
              onChange={e => setFormData({...formData, departureTime: e.target.value})}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%', marginTop: '0.5rem' }}>
            Create Trip
          </button>
        </form>
      </div>

      {/* My Trips Table */}
      <div className="card">
        <h2 style={{ marginBottom: '1rem', fontSize: '1.125rem' }}>📋 My Trips ({trips.length})</h2>
        {trips.length === 0 ? (
          <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>No trips created yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 700 }}>
              <thead>
                <tr>
                  {['#', 'Bus', 'Route', 'Departure', 'Status', 'Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trips.map((t, i) => (
                  <tr key={t.tripId} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? '#fff' : '#fafbfc' }}>
                    <td style={{ ...tdStyle, fontWeight: 700, color: '#64748b' }}>{t.tripId}</td>
                    <td style={tdStyle}>
                      <span style={{ background: '#eff6ff', color: '#2563eb', padding: '3px 9px', borderRadius: 6, fontWeight: 700, fontSize: 12 }}>
                        {t.busCode}
                      </span>
                      {t.busPlate && <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 6 }}>{t.busPlate}</span>}
                    </td>
                    <td style={{ ...tdStyle, color: '#475569', fontSize: 12 }}>{t.routeName}</td>
                    <td style={tdStyle}>
                      {editingTrip === t.tripId ? (
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          <input type="datetime-local" value={editTime}
                            onChange={e => setEditTime(e.target.value)}
                            style={{ ...inp, fontSize: 12, padding: '6px 8px' }} />
                          <button onClick={() => handleEditTrip(t.tripId)}
                            style={{ padding: '5px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✓</button>
                          <button onClick={() => { setEditingTrip(null); setEditTime(''); }}
                            style={{ padding: '5px 10px', background: '#f1f5f9', border: 'none', borderRadius: 6, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✕</button>
                        </div>
                      ) : (
                        <span style={{ fontWeight: 600, color: '#2563eb' }}>{fmtDt(t.departureTime)}</span>
                      )}
                    </td>
                    <td style={tdStyle}>
                      <span style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: t.status === 'scheduled' ? '#eff6ff' : t.status === 'completed' ? '#f0fdf4' : '#fef2f2',
                        color: t.status === 'scheduled' ? '#2563eb' : t.status === 'completed' ? '#16a34a' : '#ef4444',
                        border: `1px solid ${t.status === 'scheduled' ? '#bfdbfe' : t.status === 'completed' ? '#bbf7d0' : '#fecaca'}`,
                      }}>{t.status}</span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => { setEditingTrip(t.tripId); setEditTime(t.departureTime ? t.departureTime.slice(0, 16) : ''); }}
                          style={{ padding: '5px 12px', background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>✏️ Edit</button>
                        <button onClick={() => handleDeleteTrip(t.tripId)}
                          style={{ padding: '5px 12px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 6, fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>🗑 Delete</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Stop-wise Pricing Section */}
      <div className="card">
        <h2 style={{ marginBottom: '0.5rem', fontSize: '1.125rem' }}>💰 Stop-wise Pricing (Seat & Sleeper)</h2>
        <div style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
          Set cumulative fare from origin for each stop. System calculates segment prices automatically.
          <br />
          <strong>Example:</strong> If Ara=₹0, Bikramganj=₹100, Sasaram=₹200 → Bikramganj→Sasaram = ₹100
        </div>

        <div className="input-group">
          <label>Select Route</label>
          <select
            value={selectedRouteForPricing}
            onChange={e => handleRouteSelectForPricing(e.target.value)}
          >
            <option value="">-- Choose Assigned Route --</option>
            {agentRoutes.map(r => (
              <option key={'route-'+r.id} value={r.id}>
                {r.code} — {r.name}
              </option>
            ))}
          </select>
        </div>

        {routeStops.length > 0 && (
          <>
            <div style={{ overflowX: 'auto', marginTop: 16 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
                <thead>
                  <tr>
                    <th style={{ ...thStyle, width: 40 }}>#</th>
                    <th style={thStyle}>Stop Name</th>
                    <th style={{ ...thStyle, width: 160, background: '#f0fdf4' }}>💺 Seat Fare (from origin)</th>
                    <th style={{ ...thStyle, width: 160, background: '#f5f3ff' }}>🛏️ Sleeper Fare (from origin)</th>
                  </tr>
                </thead>
                <tbody>
                  {routeStops.map((s, i) => (
                    <tr key={s.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ ...tdStyle, fontWeight: 700, color: '#64748b' }}>{s.seq}</td>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>
                        {i === 0 && <span style={{ color: '#22c55e', marginRight: 6 }}>🟢</span>}
                        {i === routeStops.length - 1 && <span style={{ color: '#ef4444', marginRight: 6 }}>🔴</span>}
                        {s.name}
                      </td>
                      <td style={{ ...tdStyle, background: '#fafff8' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>₹</span>
                          <input
                            type="number" min="0"
                            style={{
                              ...inp, width: 100, fontSize: 14, fontWeight: 700,
                              borderColor: '#86efac', background: i === 0 ? '#f0fdf4' : '#fff',
                            }}
                            value={stopPriceEdits[s.id]?.priceOffset ?? 0}
                            disabled={i === 0}
                            onChange={e => setStopPriceEdits(prev => ({
                              ...prev,
                              [s.id]: { ...prev[s.id], priceOffset: e.target.value },
                            }))}
                          />
                        </div>
                      </td>
                      <td style={{ ...tdStyle, background: '#faf8ff' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          <span style={{ color: '#94a3b8', fontSize: 12 }}>₹</span>
                          <input
                            type="number" min="0"
                            style={{
                              ...inp, width: 100, fontSize: 14, fontWeight: 700,
                              borderColor: '#c4b5fd', background: i === 0 ? '#f5f3ff' : '#fff',
                            }}
                            value={stopPriceEdits[s.id]?.sleeperPriceOffset ?? 0}
                            disabled={i === 0}
                            onChange={e => setStopPriceEdits(prev => ({
                              ...prev,
                              [s.id]: { ...prev[s.id], sleeperPriceOffset: e.target.value },
                            }))}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Segment price preview */}
            {routeStops.length > 1 && (
              <div style={{ marginTop: 16, padding: '14px 18px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>
                  📊 Price Preview (auto-calculated segments from origin)
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {routeStops.slice(1).map(toStop => {
                    const fromStop = routeStops[0];
                    const seatP = (stopPriceEdits[toStop.id]?.priceOffset || 0) - (stopPriceEdits[fromStop.id]?.priceOffset || 0);
                    const sleeperP = (stopPriceEdits[toStop.id]?.sleeperPriceOffset || 0) - (stopPriceEdits[fromStop.id]?.sleeperPriceOffset || 0);
                    return (
                      <div key={toStop.id} style={{
                        padding: '8px 12px', background: '#fff', borderRadius: 8,
                        border: '1px solid #e2e8f0', fontSize: 12,
                      }}>
                        <div style={{ fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                          {fromStop.name} → {toStop.name}
                        </div>
                        <div style={{ display: 'flex', gap: 12 }}>
                          <span style={{ color: '#16a34a', fontWeight: 700 }}>💺 ₹{seatP}</span>
                          <span style={{ color: '#7c3aed', fontWeight: 700 }}>🛏️ ₹{sleeperP}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 16, alignItems: 'center' }}>
              <button
                className="btn btn-primary"
                style={{ padding: '12px 28px', fontSize: 14 }}
                onClick={saveStopPricing}
                disabled={pricingSaving}
              >
                {pricingSaving ? 'Saving…' : '💾 Save Stop Prices'}
              </button>
              {pricingMsg && (
                <span style={{
                  fontSize: 13, fontWeight: 600,
                  color: pricingMsg.startsWith('✅') ? '#16a34a' : '#ef4444',
                }}>{pricingMsg}</span>
              )}
            </div>
          </>
        )}

        {selectedRouteForPricing && routeStops.length === 0 && !pricingMsg && (
          <div style={{ color: '#94a3b8', padding: 20, textAlign: 'center' }}>
            Loading stops...
          </div>
        )}

        {pricingMsg && !routeStops.length && (
          <div style={{
            marginTop: 12, fontSize: 13, padding: '8px 14px', borderRadius: 8,
            background: pricingMsg.startsWith('✅') ? '#f0fdf4' : '#fef2f2',
            color: pricingMsg.startsWith('✅') ? '#16a34a' : '#ef4444',
          }}>{pricingMsg}</div>
        )}
      </div>
    </div>
  );
}
