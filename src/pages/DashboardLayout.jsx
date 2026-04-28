import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { Bus, MapPin, Search, CalendarCheck, LogOut, User, Users, ShieldCheck, FileText } from 'lucide-react';

import logoImg from '../assets/logo.png';
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
    { path: '/drivers', icon: <Users size={20} />, label: 'Manage Drivers' },
    { path: '/book', icon: <Search size={20} />, label: 'Search & Book' },
    { path: '/bookings', icon: <CalendarCheck size={20} />, label: 'All Bookings' },
    { path: '/prepare-chart', icon: <FileText size={20} />, label: 'Prepare Chart' },
  ];

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <img src={logoImg} alt="Logo" className="sidebar-logo" />
          <div className="brand-text">
            <h3>Where Is My Bus</h3>
            <span>Agent Portal</span>
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
          <div className="topbar-left">
             <div className="agent-badge">
               <div className="avatar"><User size={16} /></div>
               <div className="agent-details">
                 <span className="agent-name">{agentName || 'Agent'}</span>
                 <span className="agent-role">Authorized Partner</span>
               </div>
             </div>
          </div>
          
          <div className="topbar-right">
            <div className="status-indicator">
              <ShieldCheck size={16} className="text-success" />
              <span>Agent Mode Active</span>
            </div>
          </div>
        </header>
        <div className="page-content">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
