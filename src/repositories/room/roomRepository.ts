import { Room } from "../../models/room";
import { ChatSession } from "../../models/chatSession";
import { User } from "../../models/user";
import { IRoom } from "../../types/room";
import { v4 as uuidv4 } from "uuid";

export class RoomRepository {
  /**
   * Find a room by ID
   */
  async findRoomById(roomId: string): Promise<IRoom | null> {
    return Room.findOne({ id: roomId });
  }

  /**
   * Create a new room
   */
  async createRoom(roomData: Partial<IRoom>): Promise<IRoom> {
    const room = new Room({
      id: roomData.id || uuidv4(),
      password: roomData.password,
      guidingQuestion: roomData.guidingQuestion,
      participants: roomData.participants || [],
      conclusions: roomData.conclusions || [],
      created: roomData.created || new Date(),
      status: roomData.status || "active",
      comparisonChatId: roomData.comparisonChatId,
      finalVerdict: roomData.finalVerdict,
    });

    await room.save();
    return room;
  }

  /**
   * Update a room
   */
  async updateRoom(
    roomId: string,
    updateData: Partial<IRoom>
  ): Promise<IRoom | null> {
    const room = await Room.findOne({ id: roomId });

    if (!room) {
      return null;
    }

    // Update fields that are provided
    Object.keys(updateData).forEach((key) => {
      if (updateData[key as keyof IRoom] !== undefined) {
        // @ts-ignore - we're dynamically accessing properties
        room[key] = updateData[key as keyof IRoom];
      }
    });

    await room.save();
    return room;
  }

  /**
   * Add a participant to a room
   */
  async addParticipant(
    roomId: string,
    participant: IRoom["participants"][number]
  ): Promise<IRoom | null> {
    const room = await Room.findOne({ id: roomId });

    if (!room) {
      return null;
    }

    // Add participant if not already in the room
    if (!room.participants.some((p) => p.userId === participant.userId)) {
      room.participants.push(participant);
      await room.save();
    }

    return room;
  }

  /**
   * Add a conclusion to a room
   */
  async addConclusion(
    roomId: string,
    conclusion: IRoom["conclusions"][number]
  ): Promise<IRoom | null> {
    const room = await Room.findOne({ id: roomId });

    if (!room) {
      return null;
    }

    room.conclusions.push(conclusion);
    await room.save();

    return room;
  }

  /**
   * Update participant submission status
   */
  async updateParticipantStatus(
    roomId: string,
    userId: string,
    hasSubmitted: boolean
  ): Promise<IRoom | null> {
    const room = await Room.findOne({ id: roomId });

    if (!room) {
      return null;
    }

    const participant = room.participants.find((p) => p.userId === userId);
    if (participant) {
      participant.hasSubmitted = hasSubmitted;
      await room.save();
    }

    return room;
  }

  /**
   * Get a user by ID
   */
  async findUserById(userId: string): Promise<any | null> {
    return User.findById(userId);
  }

  /**
   * Get a chat session for a room and user
   */
  async findChatSession(roomId: string, userId: string): Promise<any | null> {
    return ChatSession.findOne({ roomId, userId });
  }

  /**
   * Create a new chat session
   */
  async createChatSession(sessionData: any): Promise<any> {
    const chatSession = new ChatSession({
      id: sessionData.id || uuidv4(),
      roomId: sessionData.roomId,
      userId: sessionData.userId,
      messages: sessionData.messages || [],
      status: sessionData.status || "active",
      created: sessionData.created || new Date(),
    });

    await chatSession.save();
    return chatSession;
  }

  /**
   * Update a chat session
   */
  async updateChatSession(
    sessionId: string,
    updateData: any
  ): Promise<any | null> {
    const chatSession = await ChatSession.findOne({ id: sessionId });

    if (!chatSession) {
      return null;
    }

    // Update fields that are provided
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined) {
        // @ts-ignore - we're dynamically accessing properties
        chatSession[key] = updateData[key];
      }
    });

    await chatSession.save();
    return chatSession;
  }

  /**
   * Add a message to a chat session
   */
  async addMessageToChatSession(
    roomId: string,
    userId: string,
    message: { role: "user" | "assistant"; content: string; timestamp: Date }
  ): Promise<any | null> {
    const chatSession = await ChatSession.findOne({ roomId, userId });

    if (!chatSession) {
      return null;
    }

    chatSession.messages.push(message);
    await chatSession.save();

    return chatSession;
  }
}

export const roomRepository = new RoomRepository();
