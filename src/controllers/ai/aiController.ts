import { Response } from "express";
import { AuthRequest } from "../../types/auth";
import { aiService } from "../../services/ai/aiService";

// Interface for request bodies
export interface ChatMessageBody {
  message: string;
}

export interface ComparisonBody {
  conclusion1: string;
  conclusion2: string;
  guidingQuestion: string;
  username1: string;
  username2: string;
}

export interface RoomParams {
  roomId: string;
}

export class AiController {
  /**
   * Test simple message
   */
  async testChat(req: AuthRequest<{}, {}, ChatMessageBody>, res: Response) {
    const { message } = req.body;

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    try {
      const response = await aiService.sendChatMessage(message);
      return res.json(response);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error processing message",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  /**
   * Test comparison
   */
  async testCompare(req: AuthRequest<{}, {}, ComparisonBody>, res: Response) {
    const { conclusion1, conclusion2, guidingQuestion, username1, username2 } =
      req.body;

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    try {
      const response = await aiService.compareConclusions(
        conclusion1,
        conclusion2,
        guidingQuestion,
        username1,
        username2
      );
      return res.json(response);
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error comparing conclusions",
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
  }

  /**
   * Compare room conclusions
   */
  async compareRoomConclusions(req: AuthRequest<RoomParams>, res: Response) {
    const { roomId } = req.params;

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    try {
      const result = await aiService.compareRoomConclusions(roomId);

      if (result.success) {
        return res.json(result);
      } else {
        // Map error messages to appropriate status codes
        let statusCode = 500;
        if (result.error === "Room not found") {
          statusCode = 404;
        } else if (
          result.error ===
            "Room is not ready for comparison. Both participants must submit their conclusions first." ||
          result.error === "Invalid number of conclusions for comparison" ||
          result.error === "Could not find participants for conclusions"
        ) {
          statusCode = 400;
        }

        return res.status(statusCode).json({
          success: false,
          message: result.error,
        });
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error comparing conclusions",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
}

export const aiController = new AiController();
