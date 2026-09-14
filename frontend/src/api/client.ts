import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',
  timeout: 45000, // Render's free tier can take up to ~45-60s to wake from a
                  // cold start; without a timeout, a slow/stuck wake-up looks
                  // identical to a frozen app with no way to recover except
                  // killing the network (see the "stuck loading" bug).
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('access_token');
      localStorage.removeItem('studyvault_chat_history');
    }
    return Promise.reject(error);
  }
);