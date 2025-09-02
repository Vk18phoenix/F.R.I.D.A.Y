import React, { useState } from "react";
import toast from "react-hot-toast";
import { useAuth } from "../../AuthContext";
import "./ProfileModal.css";

const API_URL = "http://localhost:5000";
const EMOJIS = ["😊", "😎", "🚀", "🎉", "💻", "💡", "❤️", "🧠"];

const ProfileModal = ({ onClose, onUpdate }) => {
  const { user, setUser } = useAuth();
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState("Upload a new image or choose an emoji.");

  const getToken = () => localStorage.getItem("authToken") || null;

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file)); // 👈 show preview before upload
      setFeedback("File selected. Ready to upload.");
    }
  };

  const handleAvatarUpload = async (fileToUpload = selectedFile) => {
    if (!fileToUpload) {
      toast.error("Please select a file to upload");
      setFeedback("Please select a file to upload.");
      return;
    }

    const token = getToken();
    if (!token) {
      toast.error("Authentication failed. Please log in again.");
      setFeedback("Authentication failed. Please log in again.");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", fileToUpload);

    try {
      setUploading(true);
      setFeedback("Uploading avatar...");

      const res = await fetch(`${API_URL}/api/auth/profile/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || `Error: ${res.status} ${res.statusText}`);
      }

      const data = await res.json();
      toast.success("Avatar uploaded successfully!");
      setFeedback("Avatar uploaded successfully!");

      if (data.user) {
        // ✅ Force refresh with timestamp to break cache
        const avatarWithTimestamp = data.user.avatar?.startsWith("http")
          ? `${data.user.avatar}?t=${Date.now()}`
          : `${API_URL}${data.user.avatar}?t=${Date.now()}`;

        const updatedUser = { ...data.user, avatar: avatarWithTimestamp };

        setUser(updatedUser); // ✅ global update
        localStorage.setItem("userInfo", JSON.stringify(updatedUser));

        setPreviewUrl(null);
        setSelectedFile(null);

        if (onUpdate) onUpdate(updatedUser);
      }
    } catch (error) {
      console.error("Error uploading avatar:", error);
      toast.error(error.message || "Error uploading avatar");
      setFeedback(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleEmojiSelect = async (emoji) => {
    setFeedback("Generating emoji picture...");
    setUploading(true);

    const canvas = document.createElement("canvas");
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");

    ctx.fillStyle = "#3a3d40";
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.fillStyle = "white";
    ctx.font = `${size * 0.6}px sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(emoji, size / 2, size / 2);

    canvas.toBlob(async (blob) => {
      if (blob) {
        await handleAvatarUpload(new File([blob], "emoji.png", { type: "image/png" }));
      } else {
        setFeedback("Failed to generate emoji image.");
        setUploading(false);
      }
    }, "image/png");
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>Update Profile Picture</h2>
        <p className="feedback-text">{feedback}</p>

        {/* ✅ Preview section */}
        <div className="avatar-preview">
          <img
            src={previewUrl || user?.avatar || "/default-avatar.png"}
            alt="Avatar Preview"
            style={{ width: "120px", height: "120px", borderRadius: "50%" }}
          />
        </div>

        <div className="upload-section">
          <label className="upload-button-label">
            Choose an Image
            <input
              type="file"
              onChange={handleFileChange}
              accept="image/*"
              disabled={uploading}
              style={{ display: "none" }}
            />
          </label>
          <button onClick={() => handleAvatarUpload(selectedFile)} disabled={uploading}>
            {uploading ? "Uploading..." : "Upload Avatar"}
          </button>
        </div>

        <div className="emoji-section">
          <p>Or select an emoji:</p>
          <div className="emoji-grid">
            {EMOJIS.map((emoji) => (
              <div
                key={emoji}
                className={`emoji-item ${uploading ? "disabled" : ""}`}
                onClick={() => !uploading && handleEmojiSelect(emoji)}
              >
                {emoji}
              </div>
            ))}
          </div>
        </div>

        <button className="close-button" onClick={onClose} disabled={uploading}>
          {uploading ? "Please wait..." : "Cancel"}
        </button>
      </div>
    </div>
  );
};

export default ProfileModal;
