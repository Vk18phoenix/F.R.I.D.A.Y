// src/services/apiService.js
import toast from "react-hot-toast";

const API_BASE_URL = "http://localhost:5000/api"; // Updated to use your original URL

const getToken = () => localStorage.getItem("authToken");

// Centralized API request utility function
const apiRequest = async (method, path, data = null, includeAuth = true) => {
  const headers = {
    'Content-Type': 'application/json',
  };

  if (includeAuth) {
    const token = getToken();
    if (!token) {
      toast.error("Please log in.");
      throw new Error("No authentication token found.");
    }
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    method,
    headers,
    body: data ? JSON.stringify(data) : null,
  };

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, config);
    const responseData = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(responseData.message || responseData.error || `API request failed with status ${response.status}`);
    }

    return responseData;
  } catch (error) {
    console.error(`Error in apiRequest (${path}):`, error);
    throw error;
  }
};

// --- CHAT API SERVICES ---

export const saveUserChatHistory = async (userId, chatHistory) => {
  // We'll use a PUT request to replace the entire history
  return apiRequest('PUT', `/chats/history`, { chatHistory });
};

export const getUserChatHistory = async (userId) => {
  if (!userId) {
    throw new Error("userId is required to fetch chat history");
  }
  return apiRequest('GET', `/chats/history/${userId}`);
};

// --- TEMP CHAT ---
export const saveTempChat = (messages) => {
  localStorage.setItem("tempChat", JSON.stringify(messages));
};
export const getTempChat = () => {
  const tempChat = localStorage.getItem("tempChat");
  return tempChat ? JSON.parse(tempChat) : [];
};

// --- OTHER SERVICES ---

export const reportMessage = async (message) => {
  return apiRequest('POST', '/feedback', { message });
};

export const updateProfile = async (updates) => {
  return apiRequest('PUT', '/profile', updates);
};

export const uploadAvatar = async (file) => {
  const formData = new FormData();
  formData.append("avatar", file);
  return apiRequest('POST', '/profile/avatar', formData, { 'Content-Type': 'multipart/form-data' });
};

export const changePassword = async (currentPassword, newPassword) => {
  return apiRequest('PUT', '/profile/change-password', { currentPassword, newPassword });
};

export const deleteAccount = async (currentPassword) => {
  return apiRequest('DELETE', '/profile/delete-account', { currentPassword });
};

export const sendFeedbackApi = async (feedbackData) => {
  return apiRequest('POST', '/feedback', feedbackData);
};