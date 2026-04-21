import React, { useEffect, useState } from 'react';
import api from '../api';

export default function BusesPage() {
  const [buses, setBuses] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBuses();
    fetchDrivers();
  }, []);

  const fetchBuses = async () => {
    try {
      const res = await api.get('/agent/my-buses');
      setBuses(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await api.get('/agent/drivers');
      setDrivers(res.data);
    } catch (e) {
      console.error(e);
    }
  };

  const handleAssignDriver = async (busId, driverId) => {
    try {
      await api.put(`/agent/driver/${busId}`, { driverId });
      alert('Driver assigned successfully');
      fetchBuses();
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to assign driver');
    }
  };

  if (loading) return <div>Loading assigned buses...</div>;

  return (
    <div>
      <h1 className="page-title">My Assigned Buses</h1>
      
      {buses.length === 0 ? (
        <div className="card">No buses are currently assigned to you.</div>
      ) : (
        <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
          {buses.map(bus => (
            <div key={bus.id} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="flex-between">
                <h3 style={{ fontSize: '1.25rem' }}>{bus.code}</h3>
                <span className={`badge ${bus.active ? 'badge-success' : 'badge-danger'}`}>
                  {bus.active ? 'Active' : 'Inactive'}
                </span>
              </div>
              
              <div style={{ color: 'var(--text-muted)' }}>
                <p><strong>Plate:</strong> {bus.plate || 'N/A'}</p>
                <p><strong>Route:</strong> {bus.route_name || 'Not assigned to route'}</p>
              </div>

              <div className="input-group" style={{ margin: 0 }}>
                <label>Driver Assignment</label>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <select 
                    style={{ flex: 1 }}
                    value={bus.driver_id || ''}
                    onChange={(e) => handleAssignDriver(bus.id, e.target.value)}
                  >
                    <option value="">-- Select Driver --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.id}>{d.name} ({d.phone})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
