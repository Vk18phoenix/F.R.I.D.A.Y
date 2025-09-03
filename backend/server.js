// backend/server.js
import 'dotenv/config';
import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// ------------------ RESOLVE __dirname IN ES MODULES ------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// ------------------ CORS CONFIG ------------------
const allowedOrigins = [
  'http://localhost:3000', // CRA dev
  'http://localhost:5173', // Vite dev
  process.env.CLIENT_URL,   // deployed frontend
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true); // allow Postman/curl
    if (allowedOrigins.includes(origin)) return callback(null, true);
    console.warn(`⚠️ CORS blocked for origin: ${origin}`);
    return callback(new Error(`CORS policy does not allow access from: ${origin}`), false);
  },
  credentials: true, // allow cookies/auth headers
}));

// ------------------ BODY PARSERS ------------------
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ------------------ UPLOAD FOLDERS ------------------
const baseUploadDir = path.join(__dirname, 'uploads');
const avatarUploadDir = path.join(baseUploadDir, 'avatars');

if (!fs.existsSync(baseUploadDir)) fs.mkdirSync(baseUploadDir, { recursive: true });
if (!fs.existsSync(avatarUploadDir)) fs.mkdirSync(avatarUploadDir, { recursive: true });

// ------------------ ROUTES ------------------
import userRoutes from './routes/userRoutes.js';
import chatRoutes from './routes/chatRoutes.js';

// ❌ Do NOT use full URL here. Only paths.
app.use('/api/auth', userRoutes);
app.use('/api/chats', chatRoutes);

// ------------------ STATIC FILES ------------------
app.use('/uploads', express.static(baseUploadDir));

// ------------------ ROOT ------------------
app.get('/', (req, res) => {
  res.send('✅ Backend is live! Auth routes under /api/auth, chat routes under /api/chats');
});

// ------------------ MONGODB CONNECTION ------------------
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB connected successfully!'))
.catch(err => console.error('❌ MongoDB connection error:', err.message));

// ------------------ START SERVER ------------------
app.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});
