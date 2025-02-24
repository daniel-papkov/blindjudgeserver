import mongoose, { Schema } from "mongoose";
import { IChatSession } from "../types/chat";

const messageSchema = new Schema({
  role: {
    type: String,
    enum: ["user", "assistant"],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const chatSessionSchema = new Schema<IChatSession>({
  id: {
    type: String,
    required: true,
    unique: true,
  },
  roomId: {
    type: String,
    required: true,
  },
  userId: {
    type: String,
    required: true,
  },
  messages: [messageSchema],
  status: {
    type: String,
    enum: ["active", "concluded"],
    default: "active",
  },
  conclusion: {
    type: String,
  },
  created: {
    type: Date,
    default: Date.now,
  },
});

export const ChatSession = mongoose.model<IChatSession>(
  "ChatSession",
  chatSessionSchema
);
