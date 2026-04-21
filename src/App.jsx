import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/DashboardLayout';
import BusesPage from './pages/BusesPage';
import TripsPage from './pages/TripsPage';
import SearchBookingPage from './pages/SearchBookingPage';
import SeatLayoutPage from './pages/SeatLayoutPage';
import BookingsPage from './pages/BookingsPage';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('agent_token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        
        <Route path="/" element={<ProtectedRoute><DashboardLayout /></ProtectedRoute>}>
          <Route index element={<Navigate to="/buses" replace />} />
          <Route path="buses" element={<BusesPage />} />
          <Route path="trips" element={<TripsPage />} />
          <Route path="book" element={<SearchBookingPage />} />
          <Route path="book/:tripId" element={<SeatLayoutPage />} />
          <Route path="bookings" element={<BookingsPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
