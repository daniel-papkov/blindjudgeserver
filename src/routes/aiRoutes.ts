import express from "express";
import { authenticateToken } from "../middleware/auth";
import { APILimiter } from "../middleware/rateLimiter";
import { aiController } from "../controllers/ai/aiController";
import { asyncHandler } from "../middleware/errorHandler";
import { aiValidators } from "../middleware/validationMiddleware";

const router = express.Router();

// Test simple message
router.post(
  "/test/chat",
  authenticateToken,
  APILimiter,
  aiValidators.testChat,
  asyncHandler(aiController.testChat.bind(aiController))
);

// Test comparison
router.post(
  "/test/compare",
  authenticateToken,
  APILimiter,
  aiValidators.testCompare,
  asyncHandler(aiController.testCompare.bind(aiController))
);

// Compare room conclusions
router.post(
  "/:roomId/compare",
  authenticateToken,
  APILimiter,
  asyncHandler(aiController.compareRoomConclusions.bind(aiController))
);

export default router;
