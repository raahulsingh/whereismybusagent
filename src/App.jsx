import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import DashboardLayout from './pages/DashboardLayout';
import BusesPage from './pages/BusesPage';
import TripsPage from './pages/TripsPage';
import AgentBookingPage from './pages/AgentBookingPage';
import BookingsPage from './pages/BookingsPage';
import DriversPage from './pages/DriversPage';
import PrepareChartPage from './pages/PrepareChartPage';


const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('agent_token');
  if (!token) return <Navigate to="/login" replace />;
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
          <Route path="drivers" element={<DriversPage />} />
          <Route path="book/*" element={<AgentBookingPage />} />
          <Route path="bookings" element={<BookingsPage />} />
          <Route path="prepare-chart" element={<PrepareChartPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
