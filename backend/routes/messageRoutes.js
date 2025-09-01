const express = require('express');
const router = express.Router();
const Message = require('../models/Message'); // Your Mongoose model

// Save message
router.post('/', async (req, res) => {
  const { senderId, recipientId, content } = req.body;

  if (!senderId || !recipientId || !content) {
    return res.status(400).json({ message: 'Missing fields' });
  }

  try {
    const message = new Message({ senderId, recipientId, content });
    await message.save();
    res.status(201).json(message);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to save message' });
  }
});

// Get messages between two users
router.get('/', async (req, res) => {
  const { senderId, recipientId } = req.query;

  if (!senderId || !recipientId) {
    return res.status(400).json({ message: 'Missing user IDs' });
  }

  try {
    const messages = await Message.find({
      $or: [
        { senderId, recipientId },
        { senderId: recipientId, recipientId: senderId }
      ]
    }).sort({ timestamp: 1 });

    res.status(200).json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to load messages' });
  }
});

module.exports = router;
