// src/components/Auth/Signup.jsx

import React, { useState } from 'react';
import { Mail, Lock, User } from 'lucide-react';
import { useAuth } from '../../AuthContext'; // Import useAuth

const Signup = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [localLoading, setLocalLoading] = useState(false); // Use local loading for the button state

  const { register } = useAuth(); // Get the register function from context

  const handleSignUp = async (e) => {
    e.preventDefault();
    if (localLoading) return;

    setError('');
    if (!displayName) {
        setError("Display name is required.");
        return; // No need to setLoading(false) here, as we don't call the async function
    }
    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        return; // No need to setLoading(false) here
    }

    setLocalLoading(true); // Set local loading for this component's button

    const result = await register(displayName, email, password); // Call the context's register function

    if (!result.success) {
      setError(result.error);
    } else {
      // Registration successful via context, App.jsx will handle navigation
      console.log('Registration successful via context!');
    }
    setLocalLoading(false); // Reset local loading
  };

  return (
    <div className="auth-card-inner">
      <div className="auth-header">
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-tagline">Start your journey with Friday, AI world</p>
      </div>
      <form onSubmit={handleSignUp} className="auth-form">
        <div className="input-group">
          <User className="input-icon" size={20} />
          <input type="text" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Display Name" required />
        </div>
        <div className="input-group">
          <Mail className="input-icon" size={20} />
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email" required />
        </div>
        <div className="input-group">
          <Lock className="input-icon" size={20} />
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" required />
        </div>
        <button type="submit" className="auth-button" disabled={localLoading}>
          {localLoading ? 'Creating...' : 'Sign Up'}
        </button>
        {error && <p className="auth-error">{error}</p>}
      </form>
    </div>
  );
};

export default Signup;