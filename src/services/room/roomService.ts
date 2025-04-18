import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { ChatSession } from "../../models/chatSession";
import { IRoom } from "../../types/room";
import { openaiService } from "../openaiService";
import { roomRepository } from "../../repositories/room/roomRepository";

// Define Participant type only once
type Participant = IRoom["participants"][number];

export class RoomService {
  /**
   * Create a new room
   */
  async createRoom(
    userId: string,
    guidingQuestion: string,
    password: string
  ): Promise<{
    success: boolean;
    roomId?: string;
    message: string;
    error?: string;
  }> {
    try {
      const user = await roomRepository.findUserById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const room = await roomRepository.createRoom({
        id: uuidv4(),
        password: hashedPassword,
        guidingQuestion,
        participants: [
          {
            userId,
            username: user.username,
            hasSubmitted: false,
          },
        ],
        conclusions: [],
        created: new Date(),
        status: "active",
      });

      return {
        success: true,
        roomId: room.id,
        message: "Room created successfully",
      };
    } catch (error) {
      return {
        success: false,
        message: "Error creating room",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Join an existing room
   */
  async joinRoom(
    userId: string,
    roomId: string,
    password: string
  ): Promise<{ success: boolean; message: string; error?: string }> {
    try {
      const room = await roomRepository.findRoomById(roomId);
      if (!room) {
        return { success: false, message: "Room not found" };
      }

      const user = await roomRepository.findUserById(userId);
      if (!user) {
        return { success: false, message: "User not found" };
      }

      const isValidPassword = await bcrypt.compare(password, room.password);
      if (!isValidPassword) {
        return { success: false, message: "Invalid password" };
      }

      // Check if user is already in the room
      if (room.participants.some((p: Participant) => p.userId === userId)) {
        return { success: false, message: "You are already in this room" };
      }

      if (room.participants.length >= 2) {
        return { success: false, message: "Room is full" };
      }

      // Add participant with username
      await roomRepository.addParticipant(roomId, {
        userId,
        username: user.username,
        hasSubmitted: false,
      });

      return { success: true, message: "Successfully joined room" };
    } catch (error) {
      return {
        success: false,
        message: "Error joining room",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get or create chat session for a user in a room
   */
  async getChatSession(roomId: string, userId: string): Promise<any> {
    let chatSession = await roomRepository.findChatSession(roomId, userId);

    if (!chatSession) {
      chatSession = await roomRepository.createChatSession({
        id: uuidv4(),
        roomId,
        userId,
        messages: [],
        status: "active",
        created: new Date(),
      });
    }

    return chatSession;
  }

  /**
   * Send a message in a chat session
   */
  async sendMessage(
    userId: string,
    roomId: string,
    message: string
  ): Promise<{
    success: boolean;
    response?: string;
    messages?: any[];
    message?: string;
    error?: string;
  }> {
    try {
      // Get room to access guiding question
      const room = await roomRepository.findRoomById(roomId);
      if (!room) {
        return { success: false, message: "Room not found" };
      }

      // Get or create chat session
      const chatSession = await this.getChatSession(roomId, userId);

      // Add original user message to session
      const userMessage = {
        role: "user" as const,
        content: message,
        timestamp: new Date(),
      };

      await roomRepository.addMessageToChatSession(roomId, userId, userMessage);
      chatSession.messages.push(userMessage);

      // Check if this is the first message in the chat
      const isFirstMessage = chatSession.messages.length === 1;

      // Prepare the message to send to the API
      let apiMessageContent = message;
      if (isFirstMessage && room.guidingQuestion) {
        apiMessageContent = `We are discussing the following question: "${room.guidingQuestion}"\n\nUser's message: ${message}`;
      }

      // Get AI response with modified first message for API only
      const apiMessages = chatSession.messages.map(
        (msg: any, index: number) => {
          // Only modify the last message if it's the first user message
          if (index === chatSession.messages.length - 1 && isFirstMessage) {
            return {
              role: msg.role,
              content: apiMessageContent,
            };
          }
          return {
            role: msg.role,
            content: msg.content,
          };
        }
      );

      const aiResponse = await openaiService.sendMessage(
        apiMessageContent,
        apiMessages
      );

      if (!aiResponse.success || !aiResponse.message) {
        throw new Error(aiResponse.error || "Failed to get AI response");
      }

      // Add AI response to session
      const assistantMessage = {
        role: "assistant" as const,
        content: aiResponse.message,
        timestamp: new Date(),
      };

      await roomRepository.addMessageToChatSession(
        roomId,
        userId,
        assistantMessage
      );
      chatSession.messages.push(assistantMessage);

      return {
        success: true,
        response: aiResponse.message,
        messages: chatSession.messages,
      };
    } catch (error) {
      return {
        success: false,
        message: "Error processing message",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Submit a conclusion for a room
   */
  async submitConclusion(
    userId: string,
    roomId: string,
    conclusion: string
  ): Promise<{
    success: boolean;
    message: string;
    isComplete?: boolean;
    error?: string;
  }> {
    try {
      const room = await roomRepository.findRoomById(roomId);

      if (!room) {
        return { success: false, message: "Room not found" };
      }

      // Check if user is in the room
      const participant = room.participants.find((p) => p.userId === userId);
      if (!participant) {
        return {
          success: false,
          message: "You are not a participant in this room",
        };
      }

      // Check if user has already submitted
      if (participant.hasSubmitted) {
        return {
          success: false,
          message: "You have already submitted a conclusion",
        };
      }

      // Add conclusion
      await roomRepository.addConclusion(roomId, {
        userId,
        conclusion,
        timestamp: new Date(),
      });

      // Mark participant as submitted
      await roomRepository.updateParticipantStatus(roomId, userId, true);

      // Get updated room to check for all submissions
      const updatedRoom = await roomRepository.findRoomById(roomId);
      if (!updatedRoom) {
        return { success: false, message: "Room not found after update" };
      }

      // Check if all participants have submitted
      const hasMultipleParticipants = updatedRoom.participants.length >= 2;
      const allSubmitted = updatedRoom.participants.every(
        (p) => p.hasSubmitted
      );

      // Update room status if needed
      if (hasMultipleParticipants && allSubmitted) {
        await roomRepository.updateRoom(roomId, { status: "comparing" });
      }

      const isComplete = hasMultipleParticipants && allSubmitted;
      return {
        success: true,
        message: "Conclusion submitted successfully",
        isComplete,
      };
    } catch (error) {
      return {
        success: false,
        message: "Error submitting conclusion",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get room status
   */
  async getRoomStatus(
    userId: string,
    roomId: string
  ): Promise<{
    success: boolean;
    status?: any;
    message?: string;
    error?: string;
  }> {
    try {
      const room = await roomRepository.findRoomById(roomId);

      if (!room) {
        return { success: false, message: "Room not found" };
      }

      // Check if user is in the room
      const participant = room.participants.find((p) => p.userId === userId);
      if (!participant) {
        return {
          success: false,
          message: "You are not a participant in this room",
        };
      }

      // Return the complete room data in the status response
      return {
        success: true,
        status: {
          id: room.id,
          guidingQuestion: room.guidingQuestion,
          created: room.created,
          participantCount: room.participants.length,
          conclusionCount: room.conclusions.length,
          roomStatus: room.status,
          hasSubmitted: participant.hasSubmitted,
          participants: room.participants.map((p) => ({
            username: p.username,
            hasSubmitted: p.hasSubmitted,
          })),
          comparisonChatId: room.comparisonChatId,
          finalVerdict: room.finalVerdict,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: "Error getting room status",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get chat history for a user in a room
   */
  async getChatHistory(
    userId: string,
    roomId: string
  ): Promise<{
    success: boolean;
    messages?: any[];
    message?: string;
    error?: string;
  }> {
    try {
      const chatSession = await roomRepository.findChatSession(roomId, userId);

      if (!chatSession) {
        return { success: false, message: "Chat session not found" };
      }

      return {
        success: true,
        messages: chatSession.messages,
      };
    } catch (error) {
      return {
        success: false,
        message: "Error fetching chat history",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Get session information for a room
   */
  async getSessionInfo(
    userId: string,
    roomId: string
  ): Promise<{
    success: boolean;
    sessionId?: string;
    roomStatus?: string;
    guidingQuestion?: string;
    message?: string;
    error?: string;
  }> {
    try {
      // Find the room
      const room = await roomRepository.findRoomById(roomId);

      if (!room) {
        return { success: false, message: "Room not found" };
      }

      // Check if user is a participant
      const isParticipant = room.participants.some((p) => p.userId === userId);

      if (!isParticipant) {
        return {
          success: false,
          message: "You are not a participant in this room",
        };
      }

      // Check if there's an existing session for the creator
      const creatorId = room.participants[0].userId; // Assuming the first participant is the creator
      const creatorSession = await roomRepository.findChatSession(
        roomId,
        creatorId
      );

      if (!creatorSession) {
        return {
          success: false,
          message: "No active chat session found for this room",
        };
      }

      // Return the creator's session ID for all participants to use
      return {
        success: true,
        sessionId: creatorSession.id,
        roomStatus: room.status,
        guidingQuestion: room.guidingQuestion,
      };
    } catch (error) {
      return {
        success: false,
        message: "Server error retrieving session",
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }
}

export const roomService = new RoomService();
