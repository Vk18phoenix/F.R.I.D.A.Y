// src/App.jsx

import React from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import MainLayout from './components/MainLayout/MainLayout';
import AuthPage from './components/Auth/AuthPage';
import './App.css';

// This is your main App component logic. It will consume the AuthContext.
const AppContent = () => {
  const { user, loading, isAuthenticated, logout } = useAuth(); // Use the auth context

  if (loading) {
    return <div className="loading-container"><h2>Loading...</h2></div>;
  }

  return (
    <div className="App">
      {isAuthenticated ? (
        // If authenticated, show MainLayout
        // Pass logout function directly. MainLayout itself or its children
        // will use useAuth() to get the current user object.
        <MainLayout onLogout={logout} />
      ) : (
        // If not authenticated, show AuthPage
        <AuthPage />
      )}
    </div>
  );
};

// The main App component wraps AppContent with AuthProvider
function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;