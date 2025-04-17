// src/routes/roomRoutes.ts
import express, { Response } from "express";
import { v4 as uuidv4 } from "uuid";
import bcrypt from "bcrypt";
import { Room } from "../models/room";
import { User } from "../models/user";
import { authenticateToken } from "../middleware/auth";
import { AuthRequest } from "../types/auth";
import { IRoom } from "../types/room";
import { openaiService } from "../services/openaiService";
import { APILimiter } from "../middleware/rateLimiter";
import { ChatSession } from "../models/chatSession";
import { RequestHandler } from "express";

type Participant = IRoom["participants"][number];

type RoomRequestHandler = RequestHandler<{ roomId: string }, any, any>;

const router = express.Router();

// Types for request parameters and body
interface CreateRoomBody {
  guidingQuestion: string;
  password: string;
}

interface RoomParams {
  roomId: string;
}

interface JoinRoomBody {
  password: string;
}

interface SubmitConclusionBody {
  conclusion: string;
}

const getChatSession = async (roomId: string, userId: string) => {
  let chatSession = await ChatSession.findOne({
    roomId,
    userId,
  });

  if (!chatSession) {
    chatSession = new ChatSession({
      id: uuidv4(),
      roomId,
      userId,
      messages: [],
      status: "active",
      created: new Date(),
    });
    await chatSession.save();
  }

  return chatSession;
};

// Create a new room
router.post(
  "/",
  authenticateToken,
  (req: AuthRequest<{}, {}, CreateRoomBody>, res: Response) => {
    const { guidingQuestion, password } = req.body;
    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    // First get the user to get their username
    User.findById(req.userId)
      .then((user) => {
        if (!user) {
          res.status(404).json({
            success: false,
            message: "User not found",
          });
          return null;
        }

        return bcrypt.hash(password, 10).then((hashedPassword) => {
          const room = new Room({
            id: uuidv4(),
            password: hashedPassword,
            guidingQuestion,
            participants: [
              {
                userId: req.userId!,
                username: user.username,
                hasSubmitted: false,
              },
            ],
            conclusions: [],
            created: new Date(),
            status: "active",
          });

          return room.save();
        });
      })
      .then((room) => {
        if (room) {
          res.status(201).json({
            success: true,
            roomId: room.id,
            message: "Room created successfully",
          });
        }
      })
      .catch((error) => {
        res.status(500).json({
          success: false,
          message: "Error creating room",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });
  }
);

// Join a room
router.post(
  "/:roomId/join",
  authenticateToken,
  (req: AuthRequest<RoomParams, {}, JoinRoomBody>, res: Response) => {
    const { roomId } = req.params;
    const { password } = req.body;

    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    let foundRoom: any;

    Room.findOne({ id: roomId })
      .then((room) => {
        if (!room) {
          res.status(404).json({
            success: false,
            message: "Room not found",
          });
          return null;
        }

        foundRoom = room;
        return User.findById(req.userId);
      })
      .then((user) => {
        if (!user) {
          res.status(404).json({
            success: false,
            message: "User not found",
          });
          return null;
        }

        if (!foundRoom) return null;

        return bcrypt
          .compare(password, foundRoom.password)
          .then((isValidPassword) => {
            if (!isValidPassword) {
              res.status(401).json({
                success: false,
                message: "Invalid password",
              });
              return null;
            }

            // Check if user is already in the room
            if (
              foundRoom.participants.some(
                (p: Participant) => p.userId === req.userId
              )
            ) {
              res.status(400).json({
                success: false,
                message: "You are already in this room",
              });
              return null;
            }

            if (foundRoom.participants.length >= 2) {
              res.status(403).json({
                success: false,
                message: "Room is full",
              });
              return null;
            }

            // Add participant with username
            foundRoom.participants.push({
              userId: req.userId!,
              username: user.username,
              hasSubmitted: false,
            });

            return foundRoom.save();
          });
      })
      .then((room) => {
        if (room) {
          res.json({
            success: true,
            message: "Successfully joined room",
          });
        }
      })
      .catch((error) => {
        res.status(500).json({
          success: false,
          message: "Error joining room",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });
  }
);

//init chat for first time use
router.post("/:roomId/chat/init", authenticateToken, (async (
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

    const existingSession = await ChatSession.findOne({
      roomId,
      userId: req.userId,
    });

    if (existingSession) {
      res.json({
        success: true,
        sessionId: existingSession.id,
        messages: existingSession.messages,
      });
      return;
    }

    const chatSession = new ChatSession({
      id: uuidv4(),
      roomId,
      userId: req.userId,
      messages: [],
      status: "active",
      created: new Date(),
    });

    await chatSession.save();

    res.status(201).json({
      success: true,
      sessionId: chatSession.id,
      message: "Chat session initialized",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error initializing chat session",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}) as RoomRequestHandler);

// Send a message in chat session
// Correct implementation: only modify the message sent to the API, not what's stored in DB
router.post("/:roomId/chat/message", authenticateToken, APILimiter, (async (
  req: AuthRequest<RoomParams, {}, { message: string }>,
  res: Response
) => {
  const { roomId } = req.params;
  const { message } = req.body;

  if (!req.userId) {
    res.status(401).json({
      success: false,
      message: "Unauthorized",
    });
    return;
  }

  if (!message?.trim()) {
    res.status(400).json({
      success: false,
      message: "Message cannot be empty",
    });
    return;
  }

  try {
    // Get room to access guiding question
    const room = await Room.findOne({ id: roomId });
    if (!room) {
      res.status(404).json({
        success: false,
        message: "Room not found",
      });
      return;
    }

    // Get or create chat session
    const chatSession = await getChatSession(roomId, req.userId);

    // Add original user message to session
    const userMessage = {
      role: "user" as const,
      content: message, // Store the original message
      timestamp: new Date(),
    };
    chatSession.messages.push(userMessage);

    // Check if this is the first message in the chat
    const isFirstMessage = chatSession.messages.length === 1; // Now it's 1 because we just added the message

    // Prepare the message to send to the API
    let apiMessageContent = message;
    if (isFirstMessage && room.guidingQuestion) {
      apiMessageContent = `We are discussing the following question: "${room.guidingQuestion}"\n\nUser's message: ${message}`;
    }

    // Get AI response with modified first message for API only
    const apiMessages = chatSession.messages.map((msg, index) => {
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
    });

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

    chatSession.messages.push(assistantMessage);
    await chatSession.save();

    res.json({
      success: true,
      response: aiResponse.message,
      messages: chatSession.messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error processing message",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}) as RoomRequestHandler);

// Get chat history
router.get("/:roomId/chat/history", authenticateToken, (async (
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
    const chatSession = await ChatSession.findOne({
      roomId,
      userId: req.userId,
    });

    if (!chatSession) {
      res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
      return;
    }

    res.json({
      success: true,
      messages: chatSession.messages,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching chat history",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}) as RoomRequestHandler);

// Set conclusion from chat
router.post("/:roomId/chat/conclude", authenticateToken, (async (
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
    const chatSession = await ChatSession.findOne({
      roomId,
      userId: req.userId,
    });

    if (!chatSession) {
      res.status(404).json({
        success: false,
        message: "Chat session not found",
      });
      return;
    }

    // Find the last AI message
    const lastAIMessage = [...chatSession.messages]
      .reverse()
      .find((msg) => msg.role === "assistant");

    if (!lastAIMessage) {
      res.status(400).json({
        success: false,
        message: "No AI responses found in chat",
      });
      return;
    }

    const conclusion = lastAIMessage.content;

    // Use the existing conclude endpoint logic
    const room = await Room.findOne({ id: roomId });

    if (!room) {
      res.status(404).json({
        success: false,
        message: "Room not found",
      });
      return;
    }

    const participant = room.participants.find((p) => p.userId === req.userId);

    if (!participant) {
      res.status(403).json({
        success: false,
        message: "You are not a participant in this room",
      });
      return;
    }

    if (participant.hasSubmitted) {
      res.status(400).json({
        success: false,
        message: "You have already submitted a conclusion",
      });
      return;
    }

    room.conclusions.push({
      userId: req.userId,
      conclusion,
      timestamp: new Date(),
    });

    participant.hasSubmitted = true;

    const hasMultipleParticipants = room.participants.length >= 2;
    const allSubmitted = room.participants.every((p) => p.hasSubmitted);
    if (hasMultipleParticipants && allSubmitted) {
      room.status = "comparing";
    }

    await room.save();

    res.json({
      success: true,
      message: "Conclusion set from last AI response",
      isComplete: room.status === "comparing",
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error setting conclusion from chat",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}) as RoomRequestHandler);

// Submit conclusion
router.post(
  "/:roomId/conclude",
  authenticateToken,
  (req: AuthRequest<RoomParams, {}, SubmitConclusionBody>, res: Response) => {
    const { roomId } = req.params;
    const { conclusion } = req.body;

    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    Room.findOne({ id: roomId })
      .then((room) => {
        if (!room) {
          res.status(404).json({
            success: false,
            message: "Room not found",
          });
          return null;
        }

        // Check if user is in the room
        const participant = room.participants.find(
          (p) => p.userId === req.userId
        );
        if (!participant) {
          res.status(403).json({
            success: false,
            message: "You are not a participant in this room",
          });
          return null;
        }

        // Check if user has already submitted
        if (participant.hasSubmitted) {
          res.status(400).json({
            success: false,
            message: "You have already submitted a conclusion",
          });
          return null;
        }

        // Add conclusion and mark as submitted
        room.conclusions.push({
          userId: req.userId!,
          conclusion,
          timestamp: new Date(),
        });

        participant.hasSubmitted = true;

        // Check if all participants have submitted
        const hasMultipleParticipants = room.participants.length >= 2;
        const allSubmitted = room.participants.every((p) => p.hasSubmitted);

        if (hasMultipleParticipants && allSubmitted) {
          room.status = "comparing";
        }

        return room.save();
      })
      .then((room) => {
        if (room) {
          const isComplete = room.status === "comparing";
          res.json({
            success: true,
            message: "Conclusion submitted successfully",
            isComplete,
          });
        }
      })
      .catch((error) => {
        res.status(500).json({
          success: false,
          message: "Error submitting conclusion",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });
  }
);

// Get room status
router.get(
  "/:roomId/status",
  authenticateToken,
  (req: AuthRequest<RoomParams>, res: Response) => {
    const { roomId } = req.params;

    if (!req.userId) {
      res.status(401).json({
        success: false,
        message: "Unauthorized",
      });
      return;
    }

    Room.findOne({ id: roomId })
      .then((room) => {
        if (!room) {
          res.status(404).json({
            success: false,
            message: "Room not found",
          });
          return;
        }

        // Check if user is in the room
        const participant = room.participants.find(
          (p) => p.userId === req.userId
        );
        if (!participant) {
          res.status(403).json({
            success: false,
            message: "You are not a participant in this room",
          });
          return;
        }

        // Return the complete room data in the status response
        res.json({
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
            // Include other IRoom fields that are appropriate for clients to see
            comparisonChatId: room.comparisonChatId,
            finalVerdict: room.finalVerdict,
            // Note: We might not want to include sensitive data like password
          },
        });
      })
      .catch((error) => {
        res.status(500).json({
          success: false,
          message: "Error getting room status",
          error: error instanceof Error ? error.message : "Unknown error",
        });
      });
  }
);

// Get existing chat session ID
router.get("/:roomId/chat/session", authenticateToken, (async (
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
    // Find the room
    const room = await Room.findOne({ id: roomId });

    if (!room) {
      res.status(404).json({
        success: false,
        message: "Room not found",
      });
      return;
    }

    // Check if user is a participant
    const isParticipant = room.participants.some(
      (p) => p.userId === req.userId
    );

    if (!isParticipant) {
      res.status(403).json({
        success: false,
        message: "You are not a participant in this room",
      });
      return;
    }

    // Check if there's an existing session for the creator
    const creatorId = room.participants[0].userId; // Assuming the first participant is the creator
    const creatorSession = await ChatSession.findOne({
      roomId,
      userId: creatorId,
    });

    if (!creatorSession) {
      res.status(404).json({
        success: false,
        message: "No active chat session found for this room",
      });
      return;
    }

    // Return the creator's session ID for all participants to use
    res.json({
      success: true,
      sessionId: creatorSession.id,
      roomStatus: room.status,
      guidingQuestion: room.guidingQuestion,
    });
  } catch (error) {
    console.error("Error retrieving session:", error);
    res.status(500).json({
      success: false,
      message: "Server error retrieving session",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}) as RoomRequestHandler);

export default router;
