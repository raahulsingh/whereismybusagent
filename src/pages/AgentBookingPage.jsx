import React, { useState } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import AgentSearchSection from './booking/AgentSearchSection';
import AgentBusList from './booking/AgentBusList';
import AgentSeatLayout from './booking/AgentSeatLayout';
import AgentPaymentPage from './booking/AgentPaymentPage';
import AgentBookingConfirmed from './booking/AgentBookingConfirmed';

export default function AgentBookingPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const [results, setResults] = useState([]);
  const [searchInfo, setSearchInfo] = useState({});
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [paymentSeats, setPaymentSeats] = useState([]);
  const [paymentPassengers, setPaymentPassengers] = useState([]);
  const [confirmedData, setConfirmedData] = useState(null);
  const [resetKey, setResetKey] = useState(0);

  const currentPath = location.pathname.split('/').pop() || 'search';

  const handleResults = (data, info) => {
    setResults(data); setSearchInfo(info); navigate('/book/results');
  };
  const handleSelect = (trip) => {
    setSelectedTrip(trip); navigate('/book/seats');
  };
  const handleGoToPayment = (seats, passengers) => {
    setPaymentSeats(seats); setPaymentPassengers(passengers); navigate('/book/payment');
  };
  const handleBooked = (data) => {
    setConfirmedData(data); navigate('/book/confirmed');
  };
  const reset = () => {
    navigate('/book/search'); setResults([]); setSelectedTrip(null);
    setConfirmedData(null); setPaymentSeats([]); setPaymentPassengers([]);
    setResetKey(k => k + 1);
  };

  const handleBookMore = () => {
    setPaymentSeats([]);
    setPaymentPassengers([]);
    setConfirmedData(null);
    setResetKey(k => k + 1);
    navigate('/book/seats');
  };

  return (
    <div>
      {!['search', 'confirmed', 'book', 'payment'].includes(currentPath) && (
        <button onClick={() => navigate(currentPath === 'seats' ? '/book/results' : '/book/search')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#2563eb', fontWeight: 600, fontSize: 14, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 6 }}>
          ← Back
        </button>
      )}
      <Routes>
        <Route path="/" element={<Navigate to="search" replace />} />
        <Route path="search" element={<AgentSearchSection onResults={handleResults} searchInfo={searchInfo} />} />
        <Route path="results" element={<AgentBusList results={results} searchInfo={searchInfo} onSelect={handleSelect} />} />
        <Route path="seats" element={
          <AgentSeatLayout key={resetKey} trip={selectedTrip} searchInfo={searchInfo} onGoToPayment={handleGoToPayment}
            savedSeats={paymentSeats} savedPassengers={paymentPassengers} />
        } />
        <Route path="payment" element={
          <AgentPaymentPage trip={selectedTrip} searchInfo={searchInfo}
            seats={paymentSeats} passengers={paymentPassengers}
            onBooked={handleBooked} onBack={() => navigate('/book/seats')} />
        } />
        <Route path="confirmed" element={
          <AgentBookingConfirmed data={confirmedData} onDone={reset} onBookMore={handleBookMore} />
        } />
      </Routes>
    </div>
  );
}
