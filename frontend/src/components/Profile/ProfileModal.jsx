import React, { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../AuthContext";
import "./ProfileModal.css";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://f-r-i-d-a-y-aijh.onrender.com/api/auth";

const EMOJIS = ["😊", "😎", "🚀", "🎉", "💻", "💡", "❤️", "🧠"];

const ProfileModal = ({ onClose, onUpdate }) => {
  const { user, setUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState("Upload a new image or choose an emoji.");

  const getToken = () => localStorage.getItem("authToken") || null;

  const handleFileChange = (e) => {
    if (e.target.files?.[0]) {
      setSelectedFile(e.target.files[0]);
      setPreviewUrl(URL.createObjectURL(e.target.files[0]));
      setFeedback("File selected. Ready to upload.");
    }
  };

  const handleAvatarUpload = async (fileToUpload = selectedFile) => {
    if (!fileToUpload) return toast.error("Select a file.");

    const token = getToken();
    if (!token) return toast.error("Please log in.");

    const formData = new FormData();
    formData.append("avatar", fileToUpload);

    try {
      setUploading(true);
      setFeedback("Uploading avatar...");

      const res = await fetch(`${API_BASE_URL}/profile/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Error: ${res.status}`);
      }

      const data = await res.json();
      toast.success("Avatar updated!");

      if (data.user) {
        const avatar = data.user.avatar.startsWith("http")
          ? `${data.user.avatar}?t=${Date.now()}`
          : `${API_BASE_URL.replace("/api/auth","")}${data.user.avatar}?t=${Date.now()}`;

        const updatedUser = { ...data.user, avatar };
        setUser(updatedUser);
        localStorage.setItem("userInfo", JSON.stringify(updatedUser));

        setPreviewUrl(null);
        setSelectedFile(null);

        if (onUpdate) onUpdate(updatedUser);
      }
    } catch (error) {
      toast.error(error.message || "Upload failed");
      setFeedback(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Update Profile Picture</h2>
        <p>{feedback}</p>
        <div className="avatar-preview">
          <img
            src={previewUrl || user?.avatar || "/default-avatar.png"}
            alt="Avatar Preview"
            style={{ width: 120, height: 120, borderRadius: "50%" }}
          />
        </div>
        <input type="file" accept="image/*" onChange={handleFileChange} disabled={uploading} />
        <button onClick={() => handleAvatarUpload(selectedFile)} disabled={uploading}>
          {uploading ? "Uploading..." : "Upload Avatar"}
        </button>
        <button onClick={onClose} disabled={uploading}>
          Cancel
        </button>
      </div>
    </div>
  );
};

export default ProfileModal;
