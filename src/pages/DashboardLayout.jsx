import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Bus, MapPin, Search, CalendarCheck, LogOut, User } from 'lucide-react';
import './DashboardLayout.css';

export default function DashboardLayout() {
  const navigate = useNavigate();
  const [agentName, setAgentName] = useState('');

  useEffect(() => {
    try {
      const data = JSON.parse(localStorage.getItem('agent_data'));
      if (data && data.name) {
        setAgentName(data.name);
      }
    } catch (e) {
      console.error('Failed to parse agent data');
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('agent_token');
    localStorage.removeItem('agent_data');
    navigate('/login');
  };

  const navItems = [
    { path: '/buses', icon: <Bus size={20} />, label: 'My Buses' },
    { path: '/trips', icon: <MapPin size={20} />, label: 'Manage Trips' },
    { path: '/book', icon: <Search size={20} />, label: 'Search & Book' },
    { path: '/bookings', icon: <CalendarCheck size={20} />, label: 'All Bookings' },
  ];

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Bus size={28} className="text-primary" />
          <h2>Agent Portal</h2>
        </div>
        
        <div className="agent-profile">
          <div className="avatar"><User size={20} /></div>
          <div className="info">
            <span className="name">{agentName || 'Agent'}</span>
            <span className="role">Authorized Agent</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink 
              key={item.path} 
              to={item.path} 
              className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
            >
              {item.icon}
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={20} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <div><span className="badge badge-primary">Agent Mode Active</span></div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
