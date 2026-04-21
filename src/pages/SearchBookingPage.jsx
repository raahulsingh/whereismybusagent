import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import { Search } from 'lucide-react';

export default function SearchBookingPage() {
  const [searchParams, setSearchParams] = useState({ from: '', to: '' });
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    try {
      const res = await api.get(`/agent/search?from=${searchParams.from}&to=${searchParams.to}`);
      setResults(res.data);
      setSearched(true);
    } catch (e) {
      alert(e.response?.data?.error || 'Search failed');
    }
  };

  const formatTime = (isoString) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleString('en-IN', {
      month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div>
      <h1 className="page-title">Search & Book (Agent)</h1>
      
      <div className="card" style={{ marginBottom: '2rem' }}>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end' }}>
          <div className="input-group" style={{ flex: 1, margin: 0 }}>
            <label>From Stop</label>
            <input 
              required 
              value={searchParams.from} 
              onChange={e => setSearchParams({...searchParams, from: e.target.value})} 
              placeholder="e.g. Pune"
            />
          </div>
          <div className="input-group" style={{ flex: 1, margin: 0 }}>
            <label>To Stop</label>
            <input 
              required 
              value={searchParams.to} 
              onChange={e => setSearchParams({...searchParams, to: e.target.value})} 
              placeholder="e.g. Mumbai"
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.7rem 1.5rem' }}>
            <Search size={18} /> Search Trips
          </button>
        </form>
      </div>

      {searched && (
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Available Trips</h2>
          {results.length === 0 ? (
            <div className="card">No trips found for your assigned buses on this route.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {results.map(trip => (
                <div key={trip.tripId} className="card flex-between">
                  <div>
                    <h3 style={{ marginBottom: '0.25rem' }}>{trip.busCode} - {trip.routeName}</h3>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                      {trip.fromStop} ({formatTime(trip.fromDeparture)}) 
                      {' → '} 
                      {trip.toStop} ({formatTime(trip.toArrival)})
                    </p>
                  </div>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => navigate(`/book/${trip.tripId}?from=${trip.fromStop}&to=${trip.toStop}`)}
                  >
                    View Seats
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
