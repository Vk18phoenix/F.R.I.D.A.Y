// src/components/Auth/Login.jsx

import React, { useState } from 'react';
import { Mail, Lock } from 'lucide-react';
import { useAuth } from '../../AuthContext'; // Import useAuth

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [localLoading, setLocalLoading] = useState(false); // Use local loading for the button state

  const { login } = useAuth(); // Get the login function from context

  const handleLogin = async (e) => {
    e.preventDefault();
    if (localLoading) return;

    setError('');
    setLocalLoading(true); // Set local loading for this component's button

    const result = await login(email, password); // Call the context's login function

    if (!result.success) {
      setError(result.error);
    } else {
      // Login successful via context, App.jsx will handle navigation because user state changed
      // No need for alert or redirect here, context takes care of user state update
      console.log('Login successful via context!');
    }
    setLocalLoading(false); // Reset local loading
  };

  return (
    <div className="auth-card-inner">
      <div className="auth-header">
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-tagline">Login to continue your journey.</p>
      </div>
      <form onSubmit={handleLogin} className="auth-form">
        <div className="input-group">
          <Mail className="input-icon" size={20} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        </div>
        <div className="input-group">
          <Lock className="input-icon" size={20} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
        </div>
        <button type="submit" className="auth-button" disabled={localLoading}>
          {localLoading ? 'Logging in...' : 'Login'}
        </button>
        {error && <p className="auth-error">{error}</p>}
      </form>
    </div>
  );
};

export default Login;