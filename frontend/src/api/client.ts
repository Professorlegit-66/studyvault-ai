import axios from 'axios';

export const apiClient = axios.create({
  baseURL: 'http://localhost:8000/api',
});

apiClient.interceptors.request.use((config) => {
  // Must match the key AuthContext.tsx's login()/logout() use ('access_token').
  // This was previously reading a different, stale key ('token') that was
  // never updated on login or cleared on logout - causing every data request
  // (documents, flashcards, analytics, etc.) to silently authenticate as
  // whichever account last happened to leave a value under 'token', instead
  // of whoever is actually logged in.
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