import React, { useEffect, useState } from 'react';
import api from '../api';

export default function TripsPage() {
  const [buses, setBuses] = useState([]);
  const [formData, setFormData] = useState({ busId: '', departureTime: '' });
  const [fareData, setFareData] = useState({ busId: '', basePrice: '' });

  useEffect(() => {
    fetchBuses();
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
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to create trip');
    }
  };

  const handleUpdateFare = async (e) => {
    e.preventDefault();
    try {
      const res = await api.put(`/agent/fare/${fareData.busId}`, { basePrice: fareData.basePrice });
      alert(res.data.message);
      setFareData({ busId: '', basePrice: '' });
    } catch (e) {
      alert(e.response?.data?.error || 'Failed to update fare');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h1 className="page-title">Manage Trips & Fares</h1>

      <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: '1fr 1fr' }}>
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
                  <option key={b.id} value={b.id}>{b.code} (Route: {b.route_name})</option>
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

        {/* Update Fare Form */}
        <div className="card">
          <h2 style={{ marginBottom: '1.5rem', fontSize: '1.125rem' }}>Update Base Fare</h2>
          <form onSubmit={handleUpdateFare}>
            <div className="input-group">
              <label>Select Bus (Updates fare of its route)</label>
              <select 
                required 
                value={fareData.busId}
                onChange={e => setFareData({...fareData, busId: e.target.value})}
              >
                <option value="">-- Choose Assigned Bus --</option>
                {buses.map(b => (
                  <option key={'fare-'+b.id} value={b.id}>{b.code} (Route: {b.route_name})</option>
                ))}
              </select>
            </div>
            <div className="input-group">
              <label>New Base Price (₹)</label>
              <input 
                type="number" 
                required 
                min="0"
                step="0.01"
                value={fareData.basePrice}
                onChange={e => setFareData({...fareData, basePrice: e.target.value})}
              />
            </div>
            <button type="submit" className="btn btn-secondary" style={{ width: '100%', marginTop: '0.5rem' }}>
              Update Fare
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
