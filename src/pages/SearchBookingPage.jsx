import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import axios from 'axios';
import { Search, Calendar, MapPin } from 'lucide-react';

// Debounce helper
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

function StopAutocomplete({ label, placeholder, value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);
  const debouncedQuery = useDebounce(query, 300);

  // Sync external value changes
  useEffect(() => {
    setQuery(value || '');
  }, [value]);

  // Fetch suggestions
  useEffect(() => {
    if (debouncedQuery.length < 2) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';
    axios.get(`${baseURL}/stops/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then(res => {
        if (!cancelled) {
          // Deduplicate by stop name (case-insensitive)
          const seen = new Set();
          const unique = res.data.filter(s => {
            const key = s.name.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          });
          setSuggestions(unique);
          setShowDropdown(unique.length > 0);
        }
      })
      .catch(() => { if (!cancelled) setSuggestions([]); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [debouncedQuery]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (stop) => {
    setQuery(stop.name);
    onChange(stop.name);
    setShowDropdown(false);
    setSuggestions([]);
  };

  const handleInputChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    onChange(val);
    if (val.length < 2) setShowDropdown(false);
  };

  return (
    <div className="input-group autocomplete-wrapper" style={{ flex: 1, margin: 0 }} ref={wrapperRef}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
        <MapPin size={14} /> {label}
      </label>
      <input
        required
        value={query}
        onChange={handleInputChange}
        onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
        placeholder={placeholder}
        autoComplete="off"
      />
      {showDropdown && (
        <ul className="autocomplete-list">
          {loading && <li className="autocomplete-item autocomplete-loading">Searching...</li>}
          {suggestions.map((stop, idx) => (
            <li
              key={stop.id || idx}
              className="autocomplete-item"
              onMouseDown={() => handleSelect(stop)}
            >
              <MapPin size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
              <span>{stop.name}</span>
              {stop.routeName && (
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
                  {stop.routeName}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default function SearchBookingPage() {
  const [searchParams, setSearchParams] = useState({ from: '', to: '', date: '' });
  const [results, setResults] = useState([]);
  const [searched, setSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearching(true);
    try {
      let url = `/agent/search?from=${encodeURIComponent(searchParams.from)}&to=${encodeURIComponent(searchParams.to)}`;
      if (searchParams.date) url += `&date=${searchParams.date}`;
      const res = await api.get(url);
      setResults(res.data);
      setSearched(true);
    } catch (e) {
      alert(e.response?.data?.error || 'Search failed');
    } finally {
      setSearching(false);
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
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <StopAutocomplete
            label="From Stop"
            placeholder="e.g. Pune"
            value={searchParams.from}
            onChange={(val) => setSearchParams({...searchParams, from: val})}
          />
          <StopAutocomplete
            label="To Stop"
            placeholder="e.g. Mumbai"
            value={searchParams.to}
            onChange={(val) => setSearchParams({...searchParams, to: val})}
          />
          <div className="input-group" style={{ flex: '0 1 180px', margin: 0 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Calendar size={14} /> Travel Date
            </label>
            <input 
              type="date"
              value={searchParams.date}
              onChange={e => setSearchParams({...searchParams, date: e.target.value})}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ padding: '0.7rem 1.5rem', whiteSpace: 'nowrap' }} disabled={searching}>
            <Search size={18} /> {searching ? 'Searching...' : 'Search Trips'}
          </button>
        </form>
      </div>

      {searched && (
        <div>
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>
            Available Trips
            {results.length > 0 && <span style={{ fontWeight: 400, fontSize: '0.9rem', color: 'var(--text-muted)', marginLeft: '0.5rem' }}>({results.length} found)</span>}
          </h2>
          {results.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
              No trips found for your assigned buses on this route.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {results.map(trip => (
                <div key={trip.tripId} className="card flex-between" style={{ transition: 'box-shadow 0.2s', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.1)'}
                >
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
                    onClick={() => {
                      const dateParam = searchParams.date ? `&date=${searchParams.date}` : '';
                      navigate(`/book/${trip.tripId}?from=${encodeURIComponent(trip.fromStop)}&to=${encodeURIComponent(trip.toStop)}${dateParam}`);
                    }}
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
