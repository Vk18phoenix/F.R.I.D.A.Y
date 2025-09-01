// backend/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

// ------------------ Mongoose User Model Definition ------------------

// Define the schema for a single chat message
const messageSchema = new mongoose.Schema({
  id: { type: String, required: true },
  text: { type: String, required: true },
  sender: { type: String, required: true, enum: ['user', 'ai'] },
});

// Define the schema for a single chat session
const chatSessionSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true }, // The frontend's 'id' for the chat
  title: { type: String, required: true },
  messages: [messageSchema], // Array of messages within this chat session
  pinned: { type: Boolean, default: false },
  // Add a timestamp for the chat session itself, if desired, e.g., for sorting by creation
  createdAt: { type: Date, default: Date.now }
});

const userSchema = new mongoose.Schema({
  username: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true, select: false }, // Don't return password by default
  avatar: String,
  // Now, chatHistory will be an array of chatSessionSchema, matching frontend structure
  chatHistory: [chatSessionSchema]
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model('User', userSchema);
export { User };