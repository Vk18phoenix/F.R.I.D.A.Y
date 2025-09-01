// src/App.jsx

import React from 'react'; // No need for useState, useEffect directly in App.jsx anymore for auth state
// Remove Firebase imports:
// import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { AuthProvider, useAuth } from './AuthContext'; // Import AuthProvider and useAuth
import MainLayout from './components/MainLayout/MainLayout';
import AuthPage from './components/Auth/AuthPage';
import './App.css';

// This is your main App component logic. It will consume the AuthContext.
const AppContent = () => {
  const { user, loading, isAuthenticated, logout } = useAuth(); // Use the auth context
  // No more need for isAuthenticating state here if we route based on isAuthenticated

  if (loading) {
    return <div className="loading-container"><h2>Loading...</h2></div>;
  }

  return (
    <div className="App">
      {isAuthenticated ? (
        // If authenticated, show MainLayout
        // Pass user and logout function directly
        <MainLayout user={user} onLogout={logout} />
      ) : (
        // If not authenticated, show AuthPage
        // AuthPage doesn't need props from here anymore as it will use AuthContext
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