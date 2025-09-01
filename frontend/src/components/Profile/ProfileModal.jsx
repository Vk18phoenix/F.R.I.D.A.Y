// src/components/Profile/ProfileModal.jsx

import React, { useState } from 'react';
import imageCompression from 'browser-image-compression';
import './ProfileModal.css';
import axios from 'axios';

const EMOJIS = ['😊', '😎', '🚀', '🎉', '💻', '💡', '❤️', '🧠'];

const ProfileModal = ({ user, onClose, onUpdate }) => {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState('Upload a new image or choose an emoji.');

  // ✅ Upload avatar to backend
  const handleAvatarUpload = async (fileToUpload) => {
    if (!fileToUpload) return;
    setLoading(true);
    setFeedback('Uploading picture...');

    try {
      const formData = new FormData();
      formData.append("avatar", fileToUpload);

      const res = await axios.post(
        `${process.env.REACT_APP_API_URL || "http://localhost:5000"}/api/users/${user._id}/avatar`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );

      setFeedback('Profile updated successfully!');

      // ✅ Append timestamp to avoid browser caching old image
      const updatedUrl = `${res.data.avatarUrl}?t=${Date.now()}`;

      if (onUpdate) onUpdate({ avatarUrl: updatedUrl });

      setTimeout(() => onClose(), 1000);
    } catch (error) {
      console.error("Error uploading avatar:", error);
      setFeedback(`Something went wrong: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // ✅ Compress image before upload
  const handleFileChangeAndCompress = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setFeedback('Compressing image...');
    const options = { maxSizeMB: 0.5, maxWidthOrHeight: 800, useWebWorker: true };

    try {
      const compressedFile = await imageCompression(file, options);
      setFeedback('Image ready to upload!');
      await handleAvatarUpload(compressedFile);
    } catch (error) {
      console.error("Image compression error:", error);
      setFeedback('Could not process this image. Please try another.');
    }
  };

  // ✅ Generate avatar from emoji
  const handleEmojiSelect = async (emoji) => {
    setFeedback('Generating emoji picture...');
    setLoading(true);

    const canvas = document.createElement('canvas');
    const size = 256;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    ctx.fillStyle = '#3a3d40';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2, true);
    ctx.fill();

    ctx.fillStyle = 'white';
    ctx.font = `${size * 0.6}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, size / 2, size / 2);

    canvas.toBlob(async (blob) => {
      if (blob) {
        await handleAvatarUpload(new File([blob], "emoji.png", { type: "image/png" }));
      } else {
        setFeedback('Failed to generate emoji image.');
        setLoading(false);
      }
    }, 'image/png');
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <h2>Update Profile Picture</h2>
        <p className="feedback-text">{feedback}</p>

        <div className="upload-section">
          <label className="upload-button-label">
            Choose an Image
            <input
              type="file"
              onChange={handleFileChangeAndCompress}
              accept="image/*"
              disabled={loading}
              style={{ display: 'none' }}
            />
          </label>
        </div>

        <div className="emoji-section">
          <p>Or select an emoji:</p>
          <div className="emoji-grid">
            {EMOJIS.map(emoji => (
              <div
                key={emoji}
                className={`emoji-item ${loading ? 'disabled' : ''}`}
                onClick={() => !loading && handleEmojiSelect(emoji)}
              >
                {emoji}
              </div>
            ))}
          </div>
        </div>

        <button className="close-button" onClick={onClose} disabled={loading}>
          {loading ? 'Please wait...' : 'Cancel'}
        </button>
      </div>
    </div>
  );
};

export default ProfileModal;
