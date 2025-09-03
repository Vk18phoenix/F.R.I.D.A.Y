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

  // Use env variable, fallback to localhost for development
  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api/auth";

  // Safely build backend URL for avatars
  const BACKEND_URL = API_BASE_URL?.endsWith("/api/auth")
    ? API_BASE_URL.replace(/\/api\/auth$/, "")
    : API_BASE_URL || "http://localhost:5000";

  // ------------------ Load logged-in user ------------------
  useEffect(() => {
    const loadUser = async () => {
      try {
        const token = localStorage.getItem("authToken");
        if (token) {
          const res = await axios.get(`${API_BASE_URL}/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          if (res.data?.user) {
            const avatarWithTimestamp = res.data.user.avatar
              ? (res.data.user.avatar.startsWith("http")
                  ? `${res.data.user.avatar}?t=${Date.now()}`
                  : `${BACKEND_URL}${res.data.user.avatar}?t=${Date.now()}`)
              : "/default-avatar.png";

            const updatedUser = { ...res.data.user, avatar: avatarWithTimestamp };
            setUser(updatedUser);
            setIsAuthenticated(true);
            localStorage.setItem("userInfo", JSON.stringify(updatedUser));
          } else {
            localStorage.removeItem("authToken");
            localStorage.removeItem("userInfo");
          }
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

      const avatarWithTimestamp = loggedInUser.avatar
        ? (loggedInUser.avatar.startsWith("http")
            ? `${loggedInUser.avatar}?t=${Date.now()}`
            : `${BACKEND_URL}${loggedInUser.avatar}?t=${Date.now()}`)
        : "/default-avatar.png";

      const updatedUser = { ...loggedInUser, avatar: avatarWithTimestamp };

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
        const avatarWithTimestamp = registeredUser.avatar
          ? (registeredUser.avatar.startsWith("http")
              ? `${registeredUser.avatar}?t=${Date.now()}`
              : `${BACKEND_URL}${registeredUser.avatar}?t=${Date.now()}`)
          : "/default-avatar.png";

        const updatedUser = { ...registeredUser, avatar: avatarWithTimestamp };

        localStorage.setItem("authToken", token);
        localStorage.setItem("userInfo", JSON.stringify(updatedUser));
        setUser(updatedUser);
        setIsAuthenticated(true);

        toast.success(`Registration successful! Welcome, ${updatedUser.username || "user"}!`);
      } else {
        toast.success(res.data?.message || "Registration successful! Please log in.");
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
