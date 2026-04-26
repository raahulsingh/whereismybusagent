import React, { useState, useEffect, useRef } from 'react';
import api from '../../api';
import axios from 'axios';
import { Search, Calendar, MapPin } from 'lucide-react';

function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

function StopInput({ label, placeholder, value, onChange }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const debounced = useDebounce(query, 300);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    if (debounced.length < 2) { setSuggestions([]); return; }
    let c = false;
    const base = import.meta.env.VITE_API_URL || 'https://where-is-my-bus-backend-ox7r.onrender.com/api';
    axios.get(`${base}/stops/search?q=${encodeURIComponent(debounced)}`)
      .then(r => {
        if (c) return;
        const seen = new Set();
        setSuggestions(r.data.filter(s => {
          const k = s.name.toLowerCase();
          if (seen.has(k)) return false;
          seen.add(k); return true;
        }));
        setOpen(true);
      }).catch(() => {});
    return () => { c = true; };
  }, [debounced]);

  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', flex: 1 }}>
      <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
        <MapPin size={14} /> {label}
      </label>
      <input required value={query} autoComplete="off" placeholder={placeholder}
        onFocus={() => { if (suggestions.length) setOpen(true); }}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); if (e.target.value.length < 2) setOpen(false); }}
        style={{ padding: '12px 16px', fontSize: 15, borderRadius: 10, border: '1.5px solid #e2e8f0', outline: 'none', width: '100%', boxSizing: 'border-box' }}
      />
      {open && suggestions.length > 0 && (
        <ul style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
          background: '#fff', border: '1px solid #e2e8f0', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)', maxHeight: 220, overflowY: 'auto',
          padding: 0, margin: '4px 0 0', listStyle: 'none',
        }}>
          {suggestions.slice(0, 12).map((s, i) => (
            <li key={s.id || i}
              onMouseDown={() => { setQuery(s.name); onChange(s.name); setOpen(false); }}
              style={{ padding: '10px 16px', cursor: 'pointer', fontSize: 14, borderBottom: '1px solid #f1f5f9' }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <MapPin size={12} style={{ marginRight: 6, color: '#94a3b8' }} />{s.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

const todayStr = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function AgentSearchSection({ onResults, searchInfo }) {
  const [form, setForm] = useState({
    from: searchInfo?.from || '', to: searchInfo?.to || '', date: searchInfo?.date || todayStr()
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const setDay = (offset) => {
    const d = new Date();
    d.setDate(d.getDate() + offset);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    setForm(f => ({ ...f, date: `${year}-${month}-${day}` }));
  };

  const search = async (e) => {
    e?.preventDefault();
    if (!form.from || !form.to || !form.date) { setError('Please fill all fields.'); return; }
    setLoading(true); setError('');
    try {
      const res = await api.get(`/agent/search?from=${encodeURIComponent(form.from)}&to=${encodeURIComponent(form.to)}&date=${form.date}`);
      onResults(res.data, form);
    } catch (e) {
      setError(e.response?.data?.error || 'Search failed');
    } finally { setLoading(false); }
  };

  return (
    <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: 28, maxWidth: 680, margin: '0 auto' }}>
      <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20 }}>🎫 Search Bus Tickets</div>
      <form onSubmit={search}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap' }}>
          <StopInput label="FROM" placeholder="Type stop name..." value={form.from} onChange={v => setForm(f => ({ ...f, from: v }))} />
          <button type="button" onClick={() => setForm(f => ({ ...f, from: f.to, to: f.from }))}
            style={{ width: 38, height: 44, borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 2 }}>⇄</button>
          <StopInput label="TO" placeholder="Type stop name..." value={form.to} onChange={v => setForm(f => ({ ...f, to: v }))} />
        </div>
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 12, color: '#64748b', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
            <Calendar size={14} /> DATE OF JOURNEY
          </label>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={form.date} min={todayStr()}
              onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
              style={{ flex: 1, padding: '12px 16px', fontSize: 15, borderRadius: 10, border: '1.5px solid #e2e8f0', outline: 'none' }} />
            <button type="button" onClick={() => setDay(0)} style={{
              padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0',
              background: form.date === todayStr() ? '#eff6ff' : '#f8fafc', color: form.date === todayStr() ? '#2563eb' : '#475569',
              fontWeight: 600, cursor: 'pointer', fontSize: 13
            }}>Today</button>
            <button type="button" onClick={() => setDay(1)} style={{
              padding: '10px 14px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontWeight: 600, cursor: 'pointer', fontSize: 13
            }}>Tomorrow</button>
          </div>
        </div>
        {error && <div style={{ color: '#ef4444', fontSize: 13, marginBottom: 10 }}>⚠ {error}</div>}
        <button type="submit" disabled={loading} style={{
          width: '100%', padding: 14, background: '#2563eb', color: '#fff',
          border: 'none', borderRadius: 10, fontSize: 16, fontWeight: 700, cursor: 'pointer'
        }}>
          {loading ? '🔍 Searching…' : '🔍 Search Buses'}
        </button>
      </form>
    </div>
  );
}
