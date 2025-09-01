// backend/routes/userRoutes.js
import express from "express";
import { User } from "../models/User.js"; // Import the User model
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ------------------ HELPER FUNCTIONS & MIDDLEWARE ------------------
const generateToken = (id) =>
    jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: "7d" });

// authMiddleware - MODIFIED to populate req.user with the full user document
const authMiddleware = async (req, res, next) => {
    const token = req.header("Authorization")?.replace("Bearer ", "");
    if (!token) return res.status(401).json({ message: "No token provided" });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Find user and attach to request - this makes req.user.id available
        // User.findById(decoded.id) will find by _id in MongoDB
        const user = await User.findById(decoded.id).select('-password'); // Fetch user but not password
        if (!user) {
            return res.status(401).json({ message: "User not found for token" });
        }
        req.user = user; // Attach the full user object to the request. `req.user.id` will be the MongoDB _id string.
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        res.status(401).json({ message: "Invalid token" });
    }
};

// Export authMiddleware for use in other route files (like chatRoutes.js)
export { authMiddleware };

// ------------------ AVATAR UPLOAD SETUP (Local to userRoutes) ------------------
const avatarDir = path.join(__dirname, "../uploads/avatars");
if (!fs.existsSync(avatarDir)) fs.mkdirSync(avatarDir, { recursive: true });

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, avatarDir),
    filename: (req, file, cb) => {
        // req.user._id is now available thanks to authMiddleware
        cb(null, req.user._id + path.extname(file.originalname).toLowerCase());
    },
});

const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        const allowed = /jpeg|jpg|png|gif/;
        const mimetype = allowed.test(file.mimetype);
        const extname = allowed.test(path.extname(file.originalname).toLowerCase());
        if (mimetype && extname) return cb(null, true);
        cb(new Error("Only images are allowed"));
    },
});

// ------------------ AUTH & PROFILE ROUTES ------------------
router.post("/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;
        if (!username || !email || !password)
            return res.status(400).json({ message: "All fields are required" });

        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User already exists" });

        const newUser = new User({ username, email, password });
        await newUser.save();

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error("Registration error:", error);
        res.status(500).json({ message: "Error registering user" });
    }
});

router.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password)
            return res.status(400).json({ message: "Email & password required" });

        const user = await User.findOne({ email }).select('+password');
        if (!user) return res.status(404).json({ message: "User not found" });

        const isMatch = await user.matchPassword(password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        const token = generateToken(user._id);

        res.json({
            token,
            user: {
                id: user._id, // Ensure frontend gets 'id' which maps to MongoDB '_id'
                username: user.username,
                email: user.email,
                avatar: user.avatar || null,
            },
        });
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ message: "Error logging in" });
    }
});

// GET user profile data (without chat history if it's separate in chatRoutes)
router.get("/me", authMiddleware, async (req, res) => {
    try {
        // req.user is already populated by authMiddleware. Its 'id' field is the MongoDB '_id'.
        // It already excludes password
        res.json({
            id: req.user._id, // Ensure consistency: user.id on frontend = user._id from db
            username: req.user.username,
            email: req.user.email,
            avatar: req.user.avatar
        });
    } catch (error) {
        console.error("Get /me profile error:", error);
        res.status(500).json({ message: "Error fetching user" });
    }
});

// ------------------ AVATAR UPLOAD ------------------
router.post("/profile/avatar", authMiddleware, upload.single("avatar"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: "No file uploaded" });
        }

        const user = req.user;

        if (user.avatar && user.avatar !== "/uploads/avatars/default-avatar.png") {
            const oldAvatarPath = path.join(__dirname, '..', user.avatar);
            if (fs.existsSync(oldAvatarPath)) {
                fs.unlinkSync(oldAvatarPath);
            }
        }

        user.avatar = `/uploads/avatars/${req.file.filename}`;
        await user.save();

        res.json({ message: "Avatar uploaded successfully", avatar: user.avatar });
    } catch (error) {
        console.error("Avatar upload error:", error);
        res.status(500).json({ message: "Error uploading avatar" });
    }
});

// DELETE ACCOUNT
router.delete('/profile/delete-account', authMiddleware, async (req, res) => {
    const { currentPassword } = req.body;
    if (!currentPassword)
        return res.status(400).json({ message: 'Password is required to delete account' });

    try {
        const user = req.user;

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) return res.status(401).json({ message: 'Invalid password' });

        if (user.avatar && user.avatar !== '/uploads/avatars/default-avatar.png') {
            const avatarPath = path.join(__dirname, '..', user.avatar);
            if (fs.existsSync(avatarPath)) {
                fs.unlinkSync(avatarPath);
            }
        }

        await user.deleteOne();
        res.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete account error:', error);
        res.status(500).json({ message: 'Server error deleting account' });
    }
});

// CHANGE PASSWORD
router.put('/profile/change-password', authMiddleware, async (req, res) => {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
        return res.status(400).json({ message: 'Please provide current and new passwords' });

    if (newPassword.length < 6)
        return res.status(400).json({ message: 'New password must be at least 6 characters' });

    try {
        const user = await User.findById(req.user._id).select('+password');
        if (!user) return res.status(404).json({ message: 'User not found' });

        const isMatch = await user.matchPassword(currentPassword);
        if (!isMatch) return res.status(401).json({ message: 'Invalid current password' });

        user.password = newPassword;
        await user.save();

        res.json({ message: 'Password updated successfully' });
    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Server error changing password' });
    }
});

export default router;