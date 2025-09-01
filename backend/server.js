// backend/server.js
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = ['http://localhost:3000', 'http://localhost:5173'];
app.use(cors({
    origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        if (!allowedOrigins.includes(origin)) {
            const msg = `The CORS policy does not allow access from: ${origin}`;
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

const baseUploadDir = path.join(__dirname, 'uploads');
const avatarUploadDir = path.join(baseUploadDir, 'avatars');
if (!fs.existsSync(baseUploadDir)) fs.mkdirSync(baseUploadDir, { recursive: true });
if (!fs.existsSync(avatarUploadDir)) fs.mkdirSync(avatarUploadDir, { recursive: true });

// ------------------ ROUTES ------------------
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

// Mount user-related routes under the /api/auth endpoint
app.use('/api/auth', userRoutes);
// Mount chat-related routes under the /api/chats endpoint
app.use('/api/chats', chatRoutes);

// ------------------ STATIC FILES ------------------
app.use('/uploads', express.static(baseUploadDir));

// ------------------ ROOT ------------------
app.get('/', (req, res) => {
    res.send('Backend API is running! Auth routes under /api/auth, chat routes under /api/chats');
});

// ------------------ MONGODB CONNECTION ------------------
mongoose.connect(process.env.MONGO_URI, {})
.then(() => console.log('✅ MongoDB connected successfully!'))
.catch(err => console.error('❌ MongoDB connection error:', err.message, err));

// ------------------ START SERVER ------------------
app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});