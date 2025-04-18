import express from "express";
import { authenticateToken } from "../middleware/auth";
import { APILimiter } from "../middleware/rateLimiter";
import { roomController } from "../controllers/room/roomController";
import { roomValidators } from "../middleware/validationMiddleware";
import { asyncHandler } from "../middleware/errorHandler";

const router = express.Router();

// Create a new room
router.post(
  "/",
  authenticateToken,
  roomValidators.createRoom,
  asyncHandler(roomController.createRoom.bind(roomController))
);

// Join a room
router.post(
  "/:roomId/join",
  authenticateToken,
  roomValidators.roomIdParam,
  roomValidators.joinRoom,
  asyncHandler(roomController.joinRoom.bind(roomController))
);

// Initialize chat session
router.post(
  "/:roomId/chat/init",
  authenticateToken,
  roomValidators.roomIdParam,
  asyncHandler(roomController.initChat.bind(roomController))
);

// Send a message in chat session
router.post(
  "/:roomId/chat/message",
  authenticateToken,
  APILimiter,
  roomValidators.roomIdParam,
  roomValidators.sendMessage,
  asyncHandler(roomController.sendMessage.bind(roomController))
);

// Get chat history
router.get(
  "/:roomId/chat/history",
  authenticateToken,
  roomValidators.roomIdParam,
  asyncHandler(roomController.getChatHistory.bind(roomController))
);

// Set conclusion from chat
router.post(
  "/:roomId/chat/conclude",
  authenticateToken,
  roomValidators.roomIdParam,
  asyncHandler(roomController.concludeFromChat.bind(roomController))
);

// Submit conclusion manually
router.post(
  "/:roomId/conclude",
  authenticateToken,
  roomValidators.roomIdParam,
  roomValidators.submitConclusion,
  asyncHandler(roomController.submitConclusion.bind(roomController))
);

// Get room status
router.get(
  "/:roomId/status",
  authenticateToken,
  roomValidators.roomIdParam,
  asyncHandler(roomController.getRoomStatus.bind(roomController))
);

// Get existing chat session ID
router.get(
  "/:roomId/chat/session",
  authenticateToken,
  roomValidators.roomIdParam,
  asyncHandler(roomController.getSessionInfo.bind(roomController))
);

export default router;
