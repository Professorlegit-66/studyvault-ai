import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('studyvault_chat_history');
    }
    return Promise.reject(error);
  }
);