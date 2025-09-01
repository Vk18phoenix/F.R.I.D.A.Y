// src/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext, useCallback } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getUserChatHistory } from "./services/apiService";

const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/auth";

  const initializeAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('userInfo');

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        const response = await axios.get("http://localhost:5000/api/auth/me", {
          headers: { Authorization: `Bearer ${storedToken}` },
        });

        if (response.status === 200 && response.data.user) {
          setUser(response.data.user);
          setIsAuthenticated(true);
          localStorage.setItem('userInfo', JSON.stringify(response.data.user));
        } else {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userInfo');
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (err) {
        console.error("Failed to re-authenticate or parse user info:", err);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userInfo');
        setUser(null);
        setIsAuthenticated(false);
      }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/login`, { email, password });
      const { token, user: loggedInUser } = res.data;

      localStorage.setItem('authToken', token);
      localStorage.setItem('userInfo', JSON.stringify(loggedInUser));
      setUser(loggedInUser);
      setIsAuthenticated(true);
      toast.success(`Welcome, ${loggedInUser.username || 'user'}!`);
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
      toast.error(errorMessage);
      setUser(null);
      setIsAuthenticated(false);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    setUser(null);
    setIsAuthenticated(false);
    toast.success("Logged out successfully.");
    setLoading(false);
  };
  
  const register = async (username, email, password) => {
    setLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/register`, { username, email, password });
      toast.success(response.data.message || "Registration successful! Please log in.");
      return { success: true };
    } catch (error) {
      const errorMessage = error.response?.data?.message || error.message || 'An unexpected error occurred';
      toast.error(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      setLoading(false);
    }
  };

  const authContextValue = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
};