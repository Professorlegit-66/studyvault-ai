import axios from 'axios';

// Automatically ensure the baseURL includes '/api' to prevent 404 Not Found errors
const getBaseURL = () => {
  const envUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  return envUrl.endsWith('/api') ? envUrl : `${envUrl.replace(/\/$/, '')}/api`;
};

export const apiClient = axios.create({
  baseURL: getBaseURL(),
  timeout: 180000, // 90 seconds to patiently wait for local Llama 3.2 CPU generation
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.set
      ? config.headers.set('Authorization', `Bearer ${token}`)
      : (config.headers['Authorization'] = `Bearer ${token}`);
  }

  config.headers.set
    ? config.headers.set('X-Client-UTC-Offset', new Date().getTimezoneOffset().toString())
    : (config.headers['X-Client-UTC-Offset'] = new Date().getTimezoneOffset().toString());

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