// src/components/AccountSettings/AccountSettingsModal.jsx

import React, { useState } from 'react';
// Remove Firebase imports:
// import { getAuth, updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';
import toast from 'react-hot-toast';
import './AccountSettingsModal.css';
import { changePassword, deleteAccount } from '../../services/apiService'; // Import new API services
import { useAuth } from '../../AuthContext'; // Import useAuth to get logout function

const AccountSettingsModal = ({ user, onClose, onHistoryDelete }) => {
  const { logout } = useAuth(); // Get logout from context
  const [newPassword, setNewPassword] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePasswordUpdate = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast.error('New password must be at least 6 characters.'); return; }
    setLoading(true);
    try {
      await changePassword(currentPassword, newPassword); // Call API service
      toast.success('Password updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
    } catch (error) {
      console.error('Password update failed:', error);
      toast.error(error.message || 'Failed to update password. Check your current password.');
    }
    setLoading(false);
  };

  const handleDeleteAccount = async () => {
    const pass = prompt("DANGER: This is irreversible. Please enter your password to confirm account deletion.");
    if (pass) {
      setLoading(true);
      try {
        await deleteAccount(pass); // Call API service
        toast.success('Account deleted. You are being logged out.');
        logout(); // Use context logout to clear frontend state and local storage
      } catch (error) {
        console.error('Account deletion failed:', error);
        toast.error(error.message || 'Failed to delete account. Check your password.');
      }
      setLoading(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content account-settings-modal" onClick={e => e.stopPropagation()}>
        <h2>Account Management</h2>
        <div className="account-section">
          <h4>Profile Information</h4>
          <p><strong>Name:</strong> {user.username}</p> {/* Changed from displayName to username */}
          <p><strong>Email:</strong> {user.email}</p>
        </div>
        <div className="account-section">
          <h4>Change Password</h4>
          <form onSubmit={handlePasswordUpdate}>
            <input type="password" placeholder="Current Password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required />
            <input type="password" placeholder="New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
            <button type="submit" className="action-button" disabled={loading}>{loading ? 'Updating...' : 'Update Password'}</button>
          </form>
        </div>
        <div className="account-section danger-zone">
          <h4>Danger Zone</h4>
          {/* onHistoryDelete is already handled by MainLayout and apiService */}
          <button className="danger-button" onClick={onHistoryDelete} disabled={loading}>Delete All Chat History</button>
          <button className="danger-button" onClick={() => toast('This feature is coming soon!', { icon: '🚧' })} disabled={loading}>Deactivate Account</button>
          <button className="danger-button" onClick={handleDeleteAccount} disabled={loading}>Permanently Delete Account</button>
        </div>
        <button className="close-button" onClick={onClose} disabled={loading}>Done</button>
      </div>
    </div>
  );
};

export default AccountSettingsModal;