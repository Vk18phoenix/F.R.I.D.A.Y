// backend/routes/chatRoutes.js
import express from "express";
import { User } from "../models/User.js";
import { authMiddleware } from "./userRoutes.js"; // Import authMiddleware

const router = express.Router();

// Middleware to protect chat routes
router.use(authMiddleware);

// POST /api/chats/send
// This endpoint saves a single message-response pair to the user's chat history.
// This route is likely not used by MainLayout.jsx's saveUserChatHistory, but rather
// by the AI service directly to save individual message/response pairs.
// Let's assume the frontend will send `userId` if needed, or we can use `req.user.id`
router.post("/send", async (req, res) => {
  try {
    const { message, response } = req.body; // userId will come from req.user.id
    const userId = req.user.id; // Get userId from authenticated user

    if (!userId || !message || !response) {
      return res.status(400).json({ error: "userId, message, and response are required." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // Assuming chatHistory stores an array of chat objects, where each chat object
    // has an array of messages. This structure in the User model is:
    // chatHistory: [{ message: String, response: String, timestamp: Date }]
    // This doesn't match the frontend's chatState.history structure, which is:
    // history: [{ id: string, title: string, messages: [{id: number, text: string, sender: string}], pinned: boolean }]
    // We need to adjust either the User model or how we save.
    // For now, let's assume `chatHistory` in the User model should store the frontend's `chatState.history` structure.
    // This requires a change in User.js as well.
    // Let's hold off on this for a moment and focus on the `saveUserChatHistory` call first.

    // If 'chatHistory' in User.js is meant to store a list of individual message pairs,
    // then this route needs to be adjusted.
    // If it's meant to store a list of 'chat sessions' as per frontend, then the User model needs update.

    // GIVEN YOUR User.js schema currently:
    // chatHistory: [{ message: String, response: String, timestamp: { type: Date, default: Date.now } }]
    // This means the backend expects individual message/response pairs, not the full chat objects from the frontend.
    // The `saveUserChatHistory` in MainLayout.jsx is trying to send the full frontend `history` array.
    // THIS IS A MAJOR MISMATCH.

    // Let's adjust User.js to match the frontend's concept of `chatState.history`.
    // Then this `send` route needs to be adapted or removed if the frontend manages chat objects.

    // For now, let's make this endpoint save *individual* messages if the frontend decides to call it
    // for each message-response pair. This seems less efficient than the full history save.
    // It's likely that `getAiResponse` in `aiService.js` is what will call this 'send' endpoint,
    // and it will only save the latest message and response.

    // If the User model's chatHistory is meant to store the structured `chatState.history` from the frontend,
    // then the User model definition needs to change, and this `/send` route would become redundant
    // as the `saveUserChatHistory` from `MainLayout.jsx` would handle everything.

    // ASSUMPTION: The frontend's `saveUserChatHistory` is the primary way chat data is stored.
    // So, we'll make a dedicated endpoint for that.
    // This `/send` route might not be directly used for the primary chat history save.
    // I'll keep it but comment out the saving part, as the main save will be via a new route.
    res.status(501).json({ error: "This endpoint is currently not the primary chat history saver. Please use /api/chats/history." });
    
  } catch (err) {
    console.error("Error saving chat entry (send):", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

// GET /api/chats/history/:userId
// This endpoint fetches the full chat history for a user.
router.get("/history/:userId", async (req, res) => {
  try {
    // We already have req.user from authMiddleware, so we can validate against it.
    if (req.params.userId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized access to chat history." });
    }

    const user = await User.findById(req.params.userId).select('chatHistory'); // Only fetch chatHistory
    if (!user) {
      return res.status(404).json({ msg: "User not found" });
    }

    // The backend now returns the flat chatHistory array, which should match frontend's `chatState.history`
    res.json({ chatHistory: user.chatHistory || [] }); // Ensure it's an array
  } catch (err) {
    console.error("Error fetching chats:", err);
    res.status(500).json({ error: err.message });
  }
});

// NEW: PUT /api/chats/history
// This endpoint updates (replaces) the user's entire chat history.
// It receives the full `chatState.history` array from the frontend.
router.put("/history", async (req, res) => {
  try {
    const { chatHistory } = req.body;
    const userId = req.user.id; // Get userId from authenticated user

    if (!userId) {
      return res.status(400).json({ error: "Authenticated userId is required." });
    }
    if (!Array.isArray(chatHistory)) {
      return res.status(400).json({ error: "chatHistory must be an array." });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ msg: "User not found." });
    }

    user.chatHistory = chatHistory; // Replace the entire chatHistory array
    await user.save();

    res.json({ success: true, message: "Chat history updated successfully." });
  } catch (err) {
    console.error("Error updating chat history:", err);
    res.status(500).json({ error: "Internal Server Error" });
  }
});

export default router;