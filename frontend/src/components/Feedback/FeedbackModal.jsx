// src/components/Feedback/FeedbackModal.jsx

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import './FeedbackModal.css';
import { Paperclip } from 'lucide-react';
import { sendFeedbackApi } from '../../services/apiService.js';

const FeedbackModal = ({ user, onClose }) => {
    const [category, setCategory] = useState('');
    const [feedback, setFeedback] = useState('');
    const [file, setFile] = useState(null);
    const [isSending, setIsSending] = useState(false);

    const handleFileChange = (e) => {
        const selectedFile = e.target.files[0];
        if (selectedFile && selectedFile.size > 10 * 1024 * 1024) {
            toast.error('File is too large. Please select a file under 10MB.');
            setFile(null);
            return;
        }
        setFile(selectedFile);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!category) {
            toast.error('Please select a category.');
            return;
        }
        if (!feedback.trim()) {
            toast.error('Please provide some feedback.');
            return;
        }

        setIsSending(true);
        const toastId = toast.loading('Submitting feedback...');

        try {
            const imageUrl = file ? `[File attached: ${file.name} - ${file.size} bytes]` : 'No file attached';

            const feedbackData = {
                category,
                feedback_message: feedback.trim(),
                user_info: user ? `User ID: ${user._id}, Email: ${user.email}` : 'Guest User',
                image_info: imageUrl,
            };

            await sendFeedbackApi(feedbackData);

            toast.success('Feedback sent successfully!', { id: toastId });
            onClose();
        } catch (error) {
            console.error('Failed to send feedback:', error);
            toast.error(`Failed to send feedback: ${error.message || 'Server error'}`, { id: toastId, duration: 8000 });
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content feedback-modal" onClick={(e) => e.stopPropagation()}>
                <div className="feedback-header">
                    <h3>Submit Feedback</h3>
                    <button className="close-icon" onClick={onClose}>&times;</button>
                </div>
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="category">Category</label>
                        <select
                            id="category"
                            value={category}
                            onChange={(e) => setCategory(e.target.value)}
                            disabled={isSending}
                        >
                            <option value="" disabled>Select a category...</option>
                            <option value="bug_report">Bug Report</option>
                            <option value="feature_request">Feature Request</option>
                            <option value="general_feedback">General Feedback</option>
                            <option value="ui_ux">UI/UX Suggestion</option>
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="feedback">Feedback</label>
                        <textarea
                            id="feedback"
                            rows="5"
                            placeholder="Tell us what you think..."
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            disabled={isSending}
                        />
                    </div>

                    <p className="screenshot-text">Optional: Attach a file to help us understand your feedback better.</p>
                    <label className="attach-button">
                        <Paperclip size={16} /> Attach a file (max 10MB)
                        <input
                            type="file"
                            onChange={handleFileChange}
                            style={{ display: 'none' }}
                            accept="image/*"
                        />
                    </label>
                    {file && <p className="file-name">Selected: {file.name}</p>}

                    <div className="checkbox-container">
                        <input type="checkbox" id="email-updates" defaultChecked />
                        <label htmlFor="email-updates">We may email you for more information or updates</label>
                    </div>

                    <p className="legal-text">
                        Some <a>account and system information</a> may be sent. We will use it to fix problems and improve our services.
                    </p>

                    <div className="feedback-footer">
                        <button
                            type="submit"
                            className="send-button-feedback"
                            disabled={feedback.trim() === '' || isSending}
                        >
                            {isSending ? 'Sending...' : 'Send Feedback'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default FeedbackModal;
