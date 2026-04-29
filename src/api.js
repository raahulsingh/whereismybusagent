import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://where-is-my-bus-backend-ox7r.onrender.com/api',
  timeout: 10000, // Prevent hanging requests
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to automatically attach the agent token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('agent_token');
    if (token) {
      config.headers['X-Agent-Token'] = token;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle unauthorized access
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('agent_token');
      localStorage.removeItem('agent_data');

      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    // Preserve original error so catch blocks can access error.response.data
    return Promise.reject(error);
  }
);

export default api;