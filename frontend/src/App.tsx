import React from 'react';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import { Dashboard } from './pages/Dashboard';

export const App: React.FC = () => {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Dashboard />
      </AuthProvider>
    </ThemeProvider>
  );
};

export default App;