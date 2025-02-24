// src/models/room.ts
import mongoose, { Schema } from "mongoose";
import { IRoom } from "../types/room";

const participantSchema = new Schema({
  userId: { type: String, required: true },
  username: { type: String, required: true },
  chatSessionId: { type: String },
  hasSubmitted: { type: Boolean, default: false },
});

const conclusionSchema = new Schema({
  userId: { type: String, required: true },
  conclusion: { type: String, required: true },
  timestamp: { type: Date, default: Date.now },
});

const roomSchema = new Schema<IRoom>({
  id: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  guidingQuestion: { type: String, required: true },
  created: { type: Date, default: Date.now },
  participants: [participantSchema],
  conclusions: [conclusionSchema],
  comparisonChatId: { type: String },
  finalVerdict: { type: String },
  status: {
    type: String,
    enum: ["active", "comparing", "completed"],
    default: "active",
  },
});

export const Room = mongoose.model<IRoom>("Room", roomSchema);
