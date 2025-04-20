import { openaiService } from "../openaiService";
import { roomRepository } from "../../repositories/room/roomRepository";

export class AiService {
  /**
   * Send a single message to OpenAI
   */
  async sendChatMessage(message: string): Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }> {
    try {
      const response = await openaiService.sendMessage(message);
      return response;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Compare two conclusions
   */
  async compareConclusions(
    conclusion1: string,
    conclusion2: string,
    guidingQuestion: string,
    username1: string,
    username2: string
  ): Promise<{
    success: boolean;
    comparison?: string;
    error?: string;
  }> {
    try {
      const response = await openaiService.compareConclusions(
        conclusion1,
        conclusion2,
        guidingQuestion,
        username1,
        username2
      );
      return response;
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }

  /**
   * Compare conclusions from a room
   */
  async compareRoomConclusions(roomId: string): Promise<{
    success: boolean;
    comparison?: string;
    guidingQuestion?: string;
    conclusions?: any[];
    error?: string;
  }> {
    try {
      const room = await roomRepository.findRoomById(roomId);

      if (!room) {
        return { success: false, error: "Room not found" };
      }

      // Verify room status is 'comparing'
      if (room.status !== "comparing") {
        return {
          success: false,
          error:
            "Room is not ready for comparison. Both participants must submit their conclusions first.",
        };
      }

      // Verify we have exactly 2 conclusions
      if (room.conclusions.length !== 2) {
        return {
          success: false,
          error: "Invalid number of conclusions for comparison",
        };
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
        return {
          success: false,
          error: "Could not find participants for conclusions",
        };
      }

      const comparison = await openaiService.compareConclusions(
        conclusion1.conclusion,
        conclusion2.conclusion,
        room.guidingQuestion,
        participant1.username,
        participant2.username
      );

      if (!comparison.success) {
        return {
          success: false,
          error: comparison.error || "Failed to generate comparison",
        };
      }

      // Update room with comparison results
      await roomRepository.updateRoom(roomId, {
        finalVerdict: comparison.comparison,
        status: "completed",
      });

      return {
        success: true,
        comparison: comparison.comparison,
        guidingQuestion: room.guidingQuestion,
        conclusions: [
          { ...conclusion1, username: participant1.username },
          { ...conclusion2, username: participant2.username },
        ],
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const aiService = new AiService();
