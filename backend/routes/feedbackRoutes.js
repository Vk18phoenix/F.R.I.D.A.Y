// backend/routes/feedbackRoutes.js

import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// This route will handle the feedback submission
// It's protected by middleware so we know who is sending the feedback
router.post('/', authMiddleware, async (req, res) => {
    const { category, feedback } = req.body;
    const user = req.user; // User info is attached by authMiddleware

    if (!category || !feedback) {
        return res.status(400).json({ message: 'Category and feedback text are required.' });
    }

    try {
        console.log('--- FEEDBACK RECEIVED ---');
        console.log(`From User: ${user.email} (ID: ${user._id})`);
        console.log(`Category: ${category}`);
        console.log(`Feedback: ${feedback}`);
        console.log('-------------------------');

        // ** ACTION REQUIRED **
        // This is where you would add your logic to send an email.
        // For now, we will just log it to the console and return a success message.
        // To send an email, you would use a library like Nodemailer here.

        res.status(200).json({ message: 'Feedback received successfully. Thank you!' });

    } catch (error) {
        console.error('Error processing feedback:', error);
        res.status(500).json({ message: 'Server error while processing feedback.' });
    }
});

export default router;