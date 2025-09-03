// src/AuthContext.jsx
import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Base URL from environment variable (fallback to localhost)
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/auth";

  // Backend base URL for avatars
  const BACKEND_URL = API_BASE_URL.replace(/\/api\/auth$/, "");

  // Helper: Build avatar URL safely
  const buildAvatarUrl = (avatarPath) => {
    if (!avatarPath) return "/default-avatar.png"; // fallback
    return avatarPath.startsWith("http")
      ? avatarPath
      : `${BACKEND_URL}${avatarPath}`;
  };

  // ------------------ Load logged-in user ------------------
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (!token) {
          setLoading(false);
          return;
        }

        const res = await axios.get(`${API_BASE_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.user) {
          const updatedUser = { 
            ...res.data.user, 
            avatar: buildAvatarUrl(res.data.user.avatar) 
          };
          setUser(updatedUser);
          setIsAuthenticated(true);
          localStorage.setItem("userInfo", JSON.stringify(updatedUser));
        } else {
          localStorage.removeItem("authToken");
          localStorage.removeItem("userInfo");
        }
      } catch (error) {
        console.error("Auth initialization failed:", error);
        localStorage.removeItem("authToken");
        localStorage.removeItem("userInfo");
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, []);

  // ------------------ LOGIN ------------------
  const login = async (email, password) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/login`, { email, password });
      const { token, user: loggedInUser } = res.data;

      if (!token || !loggedInUser) {
        return { success: false, error: "Invalid server response" };
      }

      const updatedUser = { 
        ...loggedInUser, 
        avatar: buildAvatarUrl(loggedInUser.avatar) 
      };

      localStorage.setItem("authToken", token);
      localStorage.setItem("userInfo", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsAuthenticated(true);

      toast.success(`Welcome, ${loggedInUser.username || "user"}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || "Login failed";
      toast.error(message);
      setUser(null);
      setIsAuthenticated(false);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  // ------------------ LOGOUT ------------------
  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("userInfo");
    setUser(null);
    setIsAuthenticated(false);
    toast.success("Logged out successfully.");
  };

  // ------------------ REGISTER ------------------
  const register = async (username, email, password) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE_URL}/register`, { username, email, password });
      const { token, user: registeredUser } = res.data || {};

      if (token && registeredUser) {
        const updatedUser = { 
          ...registeredUser, 
          avatar: buildAvatarUrl(registeredUser.avatar) 
        };

        localStorage.setItem("authToken", token);
        localStorage.setItem("userInfo", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setIsAuthenticated(true);

        toast.success(`Registration successful! Welcome, ${updatedUser.username || "user"}!`);
      } else {
        toast.success(res.data.message || "Registration successful! Please log in.");
      }

      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || "Registration failed");
      setUser(null);
      setIsAuthenticated(false);
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        setUser,
        isAuthenticated,
        setIsAuthenticated,
        loading,
        login,
        logout,
        register,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
