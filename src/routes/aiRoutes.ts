// src/routes/aiRoutes.ts
import express, { Response, RequestHandler } from "express";
import { AuthRequest } from "../types/auth";
import { authenticateToken } from "../middleware/auth";
import { openaiService } from "../services/openaiService";
import { APILimiter } from "../middleware/rateLimiter";
import { Room } from "../models/room"; // Add Room model
import { IRoom } from "../types/room"; // Add Room interface

const router = express.Router();

// Interface for request bodies
interface ChatMessageBody {
  message: string;
}

interface ComparisonBody {
  conclusion1: string;
  conclusion2: string;
  guidingQuestion: string;
  username1: string;
  username2: string;
}

interface RoomParams {
  roomId: string;
}

// Define the RoomRequestHandler type
type RoomRequestHandler = RequestHandler<{ roomId: string }, any, any>;

// Test simple message
router.post(
  "/test/chat",
  authenticateToken,
  APILimiter,
  (req: AuthRequest<{}, {}, ChatMessageBody>, res: Response) => {
    const { message } = req.body;

    if (!message) {
      res.status(400).json({
        success: false,
        message: "Message is required",
      });
      return;
    }

    openaiService
      .sendMessage(message)
      .then((response) => {
        res.json(response);
      })
      .catch((error) => {
        res.status(500).json({
          success: false,
          message: "Error processing message",
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      });
  }
);

// Test comparison
router.post(
  "/test/compare",
  authenticateToken,
  APILimiter,
  (req: AuthRequest<{}, {}, ComparisonBody>, res: Response) => {
    const { conclusion1, conclusion2, guidingQuestion, username1, username2 } =
      req.body;

    if (
      !conclusion1 ||
      !conclusion2 ||
      !guidingQuestion ||
      !username1 ||
      !username2
    ) {
      res.status(400).json({
        success: false,
        message:
          "Both conclusions, guiding question, and usernames are required",
      });
      return;
    }

    openaiService
      .compareConclusions(
        conclusion1,
        conclusion2,
        guidingQuestion,
        username1,
        username2
      )
      .then((response) => {
        res.json(response);
      })
      .catch((error) => {
        res.status(500).json({
          success: false,
          message: "Error comparing conclusions",
          error:
            error instanceof Error ? error.message : "Unknown error occurred",
        });
      });
  }
);

// Compare room conclusions
router.post("/:roomId/compare", authenticateToken, APILimiter, (async (
  req: AuthRequest<RoomParams>,
  res: Response
) => {
  const { roomId } = req.params;

  if (!req.userId) {
    res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
    return;
  }

  try {
    const room = await Room.findOne({ id: roomId });

    if (!room) {
      res.status(404).json({
        success: false,
        message: "Room not found",
      });
      return;
    }

    // Verify room status is 'comparing'
    if (room.status !== "comparing") {
      res.status(400).json({
        success: false,
        message:
          "Room is not ready for comparison. Both participants must submit their conclusions first.",
      });
      return;
    }

    // Verify we have exactly 2 conclusions
    if (room.conclusions.length !== 2) {
      res.status(400).json({
        success: false,
        message: "Invalid number of conclusions for comparison",
      });
      return;
    }

    const [conclusion1, conclusion2] = room.conclusions;

    // Find participants for the conclusions
    const participant1 = room.participants.find(
      (p) => p.userId === conclusion1.userId
    );
    const participant2 = room.participants.find(
      (p) => p.userId === conclusion2.userId
    );

    if (!participant1 || !participant2) {
      throw new Error("Could not find participants for conclusions");
    }

    const comparison = await openaiService.compareConclusions(
      conclusion1.conclusion,
      conclusion2.conclusion,
      room.guidingQuestion,
      participant1.username,
      participant2.username
    );

    if (!comparison.success) {
      throw new Error(comparison.error || "Failed to generate comparison");
    }

    // Update room with comparison results
    room.finalVerdict = comparison.comparison;
    room.status = "completed";
    await room.save();

    res.json({
      success: true,
      comparison: comparison.comparison,
      guidingQuestion: room.guidingQuestion,
      conclusions: [
        { ...conclusion1, username: participant1.username },
        { ...conclusion2, username: participant2.username },
      ],
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error comparing conclusions",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}) as RoomRequestHandler);

export default router;
