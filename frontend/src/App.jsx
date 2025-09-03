// src/App.jsx
import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import MainLayout from './components/MainLayout/MainLayout';
import AuthPage from './components/Auth/AuthPage';
import './App.css';

const AppContent = () => {
  const { loading, isAuthenticated, logout } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <h2>Loading...</h2>
      </div>
    );
  }

  return (
    <div className="App">
      {isAuthenticated ? (
        <MainLayout onLogout={logout} />
      ) : (
        <AuthPage />
      )}
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
