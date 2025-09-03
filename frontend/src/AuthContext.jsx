import React, { createContext, useState, useEffect, useContext } from "react";
import axios from "axios";
import toast from "react-hot-toast";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://f-r-i-d-a-y-aijh.onrender.com/api/auth";
  const BACKEND_URL = API_BASE_URL.replace("/api/auth", "");

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
            const avatar = res.data.user.avatar
              ? `${BACKEND_URL}${res.data.user.avatar}?t=${Date.now()}`
              : "/default-avatar.png";

            const updatedUser = { ...res.data.user, avatar };
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

      if (!token || !loggedInUser) throw new Error("Invalid server response");

      const avatar = loggedInUser.avatar
        ? `${BACKEND_URL}${loggedInUser.avatar}?t=${Date.now()}`
        : "/default-avatar.png";

      const updatedUser = { ...loggedInUser, avatar };

      localStorage.setItem("authToken", token);
      localStorage.setItem("userInfo", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsAuthenticated(true);

      toast.success(`Welcome, ${updatedUser.username || "user"}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Login failed";
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

      if (!token || !registeredUser) throw new Error("Invalid server response");

      const avatar = registeredUser.avatar
        ? `${BACKEND_URL}${registeredUser.avatar}?t=${Date.now()}`
        : "/default-avatar.png";

      const updatedUser = { ...registeredUser, avatar };

      localStorage.setItem("authToken", token);
      localStorage.setItem("userInfo", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setIsAuthenticated(true);

      toast.success(`Welcome, ${updatedUser.username || "user"}!`);
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || error.message || "Registration failed";
      toast.error(message);
      setUser(null);
      setIsAuthenticated(false);
      return { success: false, error: message };
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{ user, setUser, isAuthenticated, setIsAuthenticated, loading, login, logout, register }}
    >
      {children}
    </AuthContext.Provider>
  );
};
