import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import './LoginPage.css';
import { BusFront, KeyRound } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/agent/login', { email, password });
      localStorage.setItem('agent_token', res.data.token);
      localStorage.setItem('agent_data', JSON.stringify(res.data.agent));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">
            <BusFront size={32} />
          </div>
          <h1>Agent Portal</h1>
          <p>Where is my Bus</p>
        </div>

        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleLogin} className="login-form">
          <div className="input-group">
            <label>Email Address</label>
            <input 
              type="email" 
              required 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@example.com"
            />
          </div>
          <div className="input-group">
            <label>Password</label>
            <input 
              type="password" 
              required 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          
          <button type="submit" className="btn btn-primary login-btn" disabled={loading}>
            <KeyRound size={18} />
            {loading ? 'Authenticating...' : 'Login Securely'}
          </button>
        </form>
      </div>
    </div>
  );
}
