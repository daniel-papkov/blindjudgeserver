import { Response } from "express";
import { AuthRequest } from "../../types/auth";
import { IRoom } from "../../types/room";
import { RoomService } from "../../services/room/roomService";

// Types for controllers
export interface CreateRoomBody {
  guidingQuestion: string;
  password: string;
}

export interface RoomParams {
  roomId: string;
}

export interface JoinRoomBody {
  password: string;
}

export interface SubmitConclusionBody {
  conclusion: string;
}

export class RoomController {
  private roomService: RoomService;

  constructor() {
    this.roomService = new RoomService();
  }

  /**
   * Create a new room
   */
  async createRoom(req: AuthRequest<{}, {}, CreateRoomBody>, res: Response) {
    const { guidingQuestion, password } = req.body;
    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await this.roomService.createRoom(
      req.userId,
      guidingQuestion,
      password
    );

    if (result.success) {
      return res.status(201).json(result);
    } else {
      const statusCode = result.message === "User not found" ? 404 : 500;
      return res.status(statusCode).json(result);
    }
  }

  /**
   * Join an existing room
   */
  async joinRoom(
    req: AuthRequest<RoomParams, {}, JoinRoomBody>,
    res: Response
  ) {
    const { roomId } = req.params;
    const { password } = req.body;

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await this.roomService.joinRoom(
      req.userId,
      roomId,
      password
    );

    if (result.success) {
      return res.json(result);
    } else {
      // Map error messages to appropriate status codes
      let statusCode = 500;
      if (
        result.message === "Room not found" ||
        result.message === "User not found"
      ) {
        statusCode = 404;
      } else if (result.message === "Invalid password") {
        statusCode = 401;
      } else if (result.message === "You are already in this room") {
        statusCode = 400;
      } else if (result.message === "Room is full") {
        statusCode = 403;
      }

      return res.status(statusCode).json(result);
    }
  }

  /**
   * Initialize a chat session for a room
   */
  async initChat(req: AuthRequest<RoomParams>, res: Response) {
    const { roomId } = req.params;

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    try {
      // Use the getChatSession service method which creates a session if it doesn't exist
      const chatSession = await this.roomService.getChatSession(
        roomId,
        req.userId
      );

      return res.status(200).json({
        success: true,
        sessionId: chatSession.id,
        messages: chatSession.messages,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error initializing chat session",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Send a message in a chat session
   */
  async sendMessage(
    req: AuthRequest<RoomParams, {}, { message: string }>,
    res: Response
  ) {
    const { roomId } = req.params;
    const { message } = req.body;

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Message cannot be empty",
      });
    }

    const result = await this.roomService.sendMessage(
      req.userId,
      roomId,
      message
    );

    if (result.success) {
      return res.json(result);
    } else {
      // Map error messages to appropriate status codes
      let statusCode = 500;
      if (result.message === "Room not found") {
        statusCode = 404;
      }

      return res.status(statusCode).json(result);
    }
  }

  /**
   * Get chat history for a room
   */
  async getChatHistory(req: AuthRequest<RoomParams>, res: Response) {
    const { roomId } = req.params;

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await this.roomService.getChatHistory(req.userId, roomId);

    if (result.success) {
      return res.json(result);
    } else {
      const statusCode =
        result.message === "Chat session not found" ? 404 : 500;
      return res.status(statusCode).json(result);
    }
  }

  /**
   * Set conclusion from last AI chat message
   */
  async concludeFromChat(req: AuthRequest<RoomParams>, res: Response) {
    const { roomId } = req.params;

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    try {
      const chatSession = await this.roomService.getChatSession(
        roomId,
        req.userId
      );

      // Find the last AI message
      const lastAIMessage = [...chatSession.messages]
        .reverse()
        .find((msg) => msg.role === "assistant");

      if (!lastAIMessage) {
        return res.status(400).json({
          success: false,
          message: "No AI responses found in chat",
        });
      }

      const conclusion = lastAIMessage.content;

      // Submit the conclusion from the last AI message
      const result = await this.roomService.submitConclusion(
        req.userId,
        roomId,
        conclusion
      );

      if (result.success) {
        return res.json({
          success: true,
          message: "Conclusion set from last AI response",
          isComplete: result.isComplete,
        });
      } else {
        // Map error messages to appropriate status codes
        let statusCode = 500;
        if (result.message === "Room not found") {
          statusCode = 404;
        } else if (
          result.message === "You are not a participant in this room"
        ) {
          statusCode = 403;
        } else if (
          result.message === "You have already submitted a conclusion"
        ) {
          statusCode = 400;
        }

        return res.status(statusCode).json(result);
      }
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: "Error setting conclusion from chat",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Submit a conclusion manually
   */
  async submitConclusion(
    req: AuthRequest<RoomParams, {}, SubmitConclusionBody>,
    res: Response
  ) {
    const { roomId } = req.params;
    const { conclusion } = req.body;

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await this.roomService.submitConclusion(
      req.userId,
      roomId,
      conclusion
    );

    if (result.success) {
      return res.json(result);
    } else {
      // Map error messages to appropriate status codes
      let statusCode = 500;
      if (result.message === "Room not found") {
        statusCode = 404;
      } else if (result.message === "You are not a participant in this room") {
        statusCode = 403;
      } else if (result.message === "You have already submitted a conclusion") {
        statusCode = 400;
      }

      return res.status(statusCode).json(result);
    }
  }

  /**
   * Get room status
   */
  async getRoomStatus(req: AuthRequest<RoomParams>, res: Response) {
    const { roomId } = req.params;

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await this.roomService.getRoomStatus(req.userId, roomId);

    if (result.success) {
      return res.json(result);
    } else {
      // Map error messages to appropriate status codes
      let statusCode = 500;
      if (result.message === "Room not found") {
        statusCode = 404;
      } else if (result.message === "You are not a participant in this room") {
        statusCode = 403;
      }

      return res.status(statusCode).json(result);
    }
  }

  /**
   * Get session information
   */
  async getSessionInfo(req: AuthRequest<RoomParams>, res: Response) {
    const { roomId } = req.params;

    if (!req.userId) {
      return res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
    }

    const result = await this.roomService.getSessionInfo(req.userId, roomId);

    if (result.success) {
      return res.json(result);
    } else {
      // Map error messages to appropriate status codes
      let statusCode = 500;
      if (result.message === "Room not found") {
        statusCode = 404;
      } else if (result.message === "You are not a participant in this room") {
        statusCode = 403;
      } else if (
        result.message === "No active chat session found for this room"
      ) {
        statusCode = 404;
      }

      return res.status(statusCode).json(result);
    }
  }
}

export const roomController = new RoomController();
