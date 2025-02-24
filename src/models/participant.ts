import mongoose, { Schema } from "mongoose";
import { IParticipant } from "../types/participant";

const participantSchema = new Schema<IParticipant>({
  id: { type: String, required: true },
  roomId: { type: String, required: true },
  response: String,
  submittedAt: Date,
});

export default mongoose.model<IParticipant>("Participant", participantSchema);
