import request from "supertest";
import express, { Express, Request, Response, NextFunction } from "express";

const mockValidator = (req: Request, res: Response, next: NextFunction) =>
  next(); // has to be imported here or else the test file wont run
import roomRoutes from "../routes/roomRoutes";
import { RoomService } from "../services/room/roomService";
import { AuthRequest } from "../types/auth";
import { IChatSession } from "../types/chat";

// --- Mock Dependencies ---

// Mock RoomService (same as before)
jest.mock("../services/room/roomService");
const MockRoomService = RoomService as jest.MockedClass<typeof RoomService>;
let mockRoomServiceInstance: jest.Mocked<RoomService>; // Instance holder

// Mock Authentication Middleware
// We assume authenticateToken adds 'userId' to req if successful
jest.mock("../middleware/auth", () => ({
  authenticateToken: (
    req: AuthRequest<any, any, any>,
    res: Response,
    next: NextFunction
  ) => {
    // Check for a specific header or condition to simulate unauthenticated
    if (req.headers["simulate-unauthenticated"]) {
      // Don't add userId for unauthenticated simulation
      next();
    } else {
      // Simulate successful authentication
      req.userId = "test-user-id";
      next();
    }
  },
}));

// Mock Rate Limiter Middleware
jest.mock("../middleware/rateLimiter", () => ({
  APILimiter: (req: Request, res: Response, next: NextFunction) => next(),
}));

// Mock Validation Middleware
// Make all validators simply call next() for route testing purposes
// We assume they are unit tested elsewhere

jest.mock("../middleware/validationMiddleware", () => ({
  roomValidators: {
    createRoom: mockValidator,
    roomIdParam: mockValidator,
    joinRoom: mockValidator,
    sendMessage: mockValidator,
    submitConclusion: mockValidator,
    // Add any other validators used in roomRoutes if necessary
  },
}));

// Mock Error Handler (optional, but good practice if you rely on its behavior)
// This simple mock just passes errors along. Adjust if your handler does more.
jest.mock("../middleware/errorHandler", () => ({
  asyncHandler:
    (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
      return Promise.resolve(fn(req, res, next)).catch(next);
    },
}));

// --- Test Suite Setup ---

describe("Room Routes API (/api/rooms)", () => {
  let app: Express;

  beforeAll(() => {
    // Create a new Express app instance for testing
    app = express();
    // Add essential middleware (like body parsing)
    app.use(express.json());
    app.use(express.urlencoded({ extended: true }));

    // Mount the room routes under a base path (e.g., /api/rooms)
    // Make sure this base path matches how you use it in your main app setup
    app.use("/api/rooms", roomRoutes);

    // Optional: Add a generic error handler for unhandled errors in tests
    app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
      console.error("Unhandled error in test:", err);
      res.status(500).json({ message: "Internal Server Error in Test" });
    });
  });

  beforeEach(() => {
    // Reset mocks and get the mocked service instance before each test
    MockRoomService.mockClear();
    // If RoomService is instantiated within the controller, mock its prototype methods
    mockRoomServiceInstance =
      MockRoomService.prototype as jest.Mocked<RoomService>;

    // Reset specific method mocks if needed (clearAllMocks usually handles this)
    // e.g., mockRoomServiceInstance.createRoom.mockClear();
  });

  // --- Test Cases ---

  // POST /api/rooms - Create Room
  describe("POST /api/rooms", () => {
    const createRoomPayload = {
      guidingQuestion: "Test Question",
      password: "password123",
    };

    it("should create a room successfully (201)", async () => {
      const successResult = {
        success: true,
        roomId: "new-room-id",
        message: "Room created",
      };
      mockRoomServiceInstance.createRoom.mockResolvedValue(successResult);

      const response = await request(app)
        .post("/api/rooms")
        .send(createRoomPayload)
        .expect("Content-Type", /json/)
        .expect(201);

      expect(response.body).toEqual(successResult);
      expect(mockRoomServiceInstance.createRoom).toHaveBeenCalledWith(
        "test-user-id", // Added by mocked authenticateToken
        createRoomPayload.guidingQuestion,
        createRoomPayload.password
      );
    });

    it("should return 401 if authentication fails (simulated)", async () => {
      // Our mock auth middleware checks for this header
      const response = await request(app)
        .post("/api/rooms")
        .set("simulate-unauthenticated", "true") // Signal mock auth to fail
        .send(createRoomPayload)
        .expect("Content-Type", /json/)
        .expect(401); // Controller should return 401 if req.userId is missing

      expect(response.body).toEqual({
        success: false,
        message: "Unauthorized",
      });
      expect(mockRoomServiceInstance.createRoom).not.toHaveBeenCalled();
    });

    it("should return 404 if user not found by service", async () => {
      const errorResult = { success: false, message: "User not found" };
      mockRoomServiceInstance.createRoom.mockResolvedValue(errorResult);

      const response = await request(app)
        .post("/api/rooms")
        .send(createRoomPayload)
        .expect("Content-Type", /json/)
        .expect(404);

      expect(response.body).toEqual(errorResult);
    });

    it("should return 500 for other service errors", async () => {
      const errorResult = { success: false, message: "Database error" };
      mockRoomServiceInstance.createRoom.mockResolvedValue(errorResult);

      const response = await request(app)
        .post("/api/rooms")
        .send(createRoomPayload)
        .expect("Content-Type", /json/)
        .expect(500);

      expect(response.body).toEqual(errorResult);
    });

    // Add tests for validation failures if you DON'T mock the validators completely
    // e.g., it('should return 400 if guidingQuestion is missing', async () => { ... });
  });

  // POST /api/rooms/:roomId/join - Join Room
  describe("POST /api/rooms/:roomId/join", () => {
    const roomId = "join-room-123";
    const joinPayload = { password: "room-password" };

    it("should allow a user to join a room successfully (200)", async () => {
      const successResult = {
        success: true,
        message: "Joined room successfully",
      };
      mockRoomServiceInstance.joinRoom.mockResolvedValue(successResult);

      const response = await request(app)
        .post(`/api/rooms/${roomId}/join`)
        .send(joinPayload)
        .expect("Content-Type", /json/)
        .expect(200); // Default success status

      expect(response.body).toEqual(successResult);
      expect(mockRoomServiceInstance.joinRoom).toHaveBeenCalledWith(
        "test-user-id",
        roomId,
        joinPayload.password
      );
    });

    it("should return 401 if authentication fails (simulated)", async () => {
      const response = await request(app)
        .post(`/api/rooms/${roomId}/join`)
        .set("simulate-unauthenticated", "true")
        .send(joinPayload)
        .expect("Content-Type", /json/)
        .expect(401);

      expect(response.body).toEqual({
        success: false,
        message: "Unauthorized",
      });
      expect(mockRoomServiceInstance.joinRoom).not.toHaveBeenCalled();
    });

    it("should return 404 if room not found by service", async () => {
      const errorResult = { success: false, message: "Room not found" };
      mockRoomServiceInstance.joinRoom.mockResolvedValue(errorResult);

      const response = await request(app)
        .post(`/api/rooms/${roomId}/join`)
        .send(joinPayload)
        .expect("Content-Type", /json/)
        .expect(404);

      expect(response.body).toEqual(errorResult);
    });

    it("should return 401 for invalid password from service", async () => {
      const errorResult = { success: false, message: "Invalid password" };
      mockRoomServiceInstance.joinRoom.mockResolvedValue(errorResult);

      const response = await request(app)
        .post(`/api/rooms/${roomId}/join`)
        .send(joinPayload)
        .expect("Content-Type", /json/)
        .expect(401);

      expect(response.body).toEqual(errorResult);
    });

    // Add tests for other specific errors (400, 403, 500) based on controller logic
    it("should return 403 if room is full", async () => {
      const errorResult = { success: false, message: "Room is full" };
      mockRoomServiceInstance.joinRoom.mockResolvedValue(errorResult);
      const response = await request(app)
        .post(`/api/rooms/${roomId}/join`)
        .send(joinPayload)
        .expect(403);
      expect(response.body).toEqual(errorResult);
    });
  });

  // POST /api/rooms/:roomId/chat/init - Initialize Chat
  describe("POST /api/rooms/:roomId/chat/init", () => {
    const roomId = "chat-init-room-456";
    const timestamp = new Date();

    // Fix: Use non-optional properties to avoid TypeScript errors
    const mockChatSession = {
      id: "session-123",
      messages: [{ role: "assistant", content: "Chat started", timestamp }],
      // Add other required IChatSession properties as needed
    };

    it("should initialize chat successfully (200)", async () => {
      // Mock the service response - cast only if needed for other properties
      mockRoomServiceInstance.getChatSession.mockResolvedValue(
        mockChatSession as IChatSession
      );

      const response = await request(app)
        .post(`/api/rooms/${roomId}/chat/init`)
        .send() // No body needed for this endpoint
        .expect("Content-Type", /json/)
        .expect(200);

      // Fix: Update expectation to match JSON serialization
      // When the message gets serialized to JSON, Date objects become strings
      expect(response.body).toEqual({
        success: true,
        sessionId: mockChatSession.id,
        messages: [
          {
            role: "assistant",
            content: "Chat started",
            // Using the timestamp we defined above
            timestamp: timestamp.toISOString(),
          },
        ],
      });

      expect(mockRoomServiceInstance.getChatSession).toHaveBeenCalledWith(
        roomId,
        "test-user-id"
      );
    });

    // POST /api/rooms/:roomId/chat/message - Send Message
    describe("POST /api/rooms/:roomId/chat/message", () => {
      const roomId = "chat-message-room-789";
      const messagePayload = { message: "Hello from test!" };

      it("should send a message successfully (200)", async () => {
        const successResult = {
          success: true,
          message: "Message sent",
          newMessage: { role: "user", content: messagePayload.message },
        };
        mockRoomServiceInstance.sendMessage.mockResolvedValue(successResult);

        const response = await request(app)
          .post(`/api/rooms/${roomId}/chat/message`)
          .send(messagePayload)
          .expect(200);

        expect(response.body).toEqual(successResult);
        expect(mockRoomServiceInstance.sendMessage).toHaveBeenCalledWith(
          "test-user-id",
          roomId,
          messagePayload.message
        );
      });

      it("should return 401 if authentication fails (simulated)", async () => {
        const response = await request(app)
          .post(`/api/rooms/${roomId}/chat/message`)
          .set("simulate-unauthenticated", "true")
          .send(messagePayload)
          .expect(401);
        expect(response.body).toHaveProperty("message", "Unauthorized");
        expect(mockRoomServiceInstance.sendMessage).not.toHaveBeenCalled();
      });

      it("should return 400 if message payload is empty/missing (controller logic)", async () => {
        const response = await request(app)
          .post(`/api/rooms/${roomId}/chat/message`)
          .send({ message: " " }) // Send whitespace
          .expect(400);
        expect(response.body).toEqual({
          success: false,
          message: "Message cannot be empty",
        });
        expect(mockRoomServiceInstance.sendMessage).not.toHaveBeenCalled();
      });

      it("should return 404 if room not found by service", async () => {
        const errorResult = { success: false, message: "Room not found" };
        mockRoomServiceInstance.sendMessage.mockResolvedValue(errorResult);
        const response = await request(app)
          .post(`/api/rooms/${roomId}/chat/message`)
          .send(messagePayload)
          .expect(404);
        expect(response.body).toEqual(errorResult);
      });

      it("should return 500 for other service errors", async () => {
        const errorResult = {
          success: false,
          message: "Failed to process message",
        };
        mockRoomServiceInstance.sendMessage.mockResolvedValue(errorResult);
        const response = await request(app)
          .post(`/api/rooms/${roomId}/chat/message`)
          .send(messagePayload)
          .expect(500);
        expect(response.body).toEqual(errorResult);
      });
    });

    // GET /api/rooms/:roomId/chat/history - Get Chat History
    describe("GET /api/rooms/:roomId/chat/history", () => {
      const roomId = "history-room-abc";
      const chatHistory = [
        { role: "user", content: "Question" },
        { role: "assistant", content: "Answer" },
      ];

      it("should get chat history successfully (200)", async () => {
        const successResult = { success: true, messages: chatHistory };
        mockRoomServiceInstance.getChatHistory.mockResolvedValue(successResult);

        const response = await request(app)
          .get(`/api/rooms/${roomId}/chat/history`)
          .expect("Content-Type", /json/)
          .expect(200);

        expect(response.body).toEqual(successResult);
        expect(mockRoomServiceInstance.getChatHistory).toHaveBeenCalledWith(
          "test-user-id",
          roomId
        );
      });

      it("should return 401 if authentication fails (simulated)", async () => {
        const response = await request(app)
          .get(`/api/rooms/${roomId}/chat/history`)
          .set("simulate-unauthenticated", "true")
          .expect(401);
        expect(response.body).toHaveProperty("message", "Unauthorized");
        expect(mockRoomServiceInstance.getChatHistory).not.toHaveBeenCalled();
      });

      it("should return 404 if chat session not found by service", async () => {
        const errorResult = {
          success: false,
          message: "Chat session not found",
        };
        mockRoomServiceInstance.getChatHistory.mockResolvedValue(errorResult);
        const response = await request(app)
          .get(`/api/rooms/${roomId}/chat/history`)
          .expect(404);
        expect(response.body).toEqual(errorResult);
      });

      it("should return 500 for other service errors", async () => {
        const errorResult = {
          success: false,
          message: "DB error fetching history",
        };
        mockRoomServiceInstance.getChatHistory.mockResolvedValue(errorResult);
        const response = await request(app)
          .get(`/api/rooms/${roomId}/chat/history`)
          .expect(500);
        expect(response.body).toEqual(errorResult);
      });
    });

    // POST /api/rooms/:roomId/chat/conclude - Set Conclusion from Chat
    describe("POST /api/rooms/:roomId/chat/conclude", () => {
      const roomId = "conclude-chat-room-def";
      const lastAiMessageContent = "AI conclusion text";
      const mockChatSessionWithAi: Partial<IChatSession> = {
        id: "session-789",
        messages: [
          { role: "user", content: "...", timestamp: new Date() },
          {
            role: "assistant",
            content: lastAiMessageContent,
            timestamp: new Date(),
          },
        ],
      };

      it("should set conclusion from last AI message successfully (200)", async () => {
        mockRoomServiceInstance.getChatSession.mockResolvedValue(
          mockChatSessionWithAi as IChatSession
        );
        const submitSuccess = {
          success: true,
          message: "Conclusion submitted",
          isComplete: false,
        };
        mockRoomServiceInstance.submitConclusion.mockResolvedValue(
          submitSuccess
        );

        const response = await request(app)
          .post(`/api/rooms/${roomId}/chat/conclude`)
          .send()
          .expect(200);

        expect(response.body).toEqual({
          success: true,
          message: "Conclusion set from last AI response",
          isComplete: submitSuccess.isComplete,
        });
        expect(mockRoomServiceInstance.getChatSession).toHaveBeenCalledWith(
          roomId,
          "test-user-id"
        );
        expect(mockRoomServiceInstance.submitConclusion).toHaveBeenCalledWith(
          "test-user-id",
          roomId,
          lastAiMessageContent
        );
      });

      it("should return 401 if authentication fails (simulated)", async () => {
        const response = await request(app)
          .post(`/api/rooms/${roomId}/chat/conclude`)
          .set("simulate-unauthenticated", "true")
          .send()
          .expect(401);
        expect(response.body).toHaveProperty("message", "Unauthorized");
        expect(mockRoomServiceInstance.getChatSession).not.toHaveBeenCalled();
        expect(mockRoomServiceInstance.submitConclusion).not.toHaveBeenCalled();
      });

      it("should return 400 if no AI message is found", async () => {
        const mockChatSessionNoAi: Partial<IChatSession> = {
          id: "session-000",
          messages: [{ role: "user", content: "...", timestamp: new Date() }],
        };
        mockRoomServiceInstance.getChatSession.mockResolvedValue(
          mockChatSessionNoAi as IChatSession
        );

        const response = await request(app)
          .post(`/api/rooms/${roomId}/chat/conclude`)
          .send()
          .expect(400);

        expect(response.body).toEqual({
          success: false,
          message: "No AI responses found in chat",
        });
        expect(mockRoomServiceInstance.submitConclusion).not.toHaveBeenCalled();
      });

      it("should return 500 if getChatSession fails", async () => {
        const error = new Error("Failed fetching session");
        mockRoomServiceInstance.getChatSession.mockRejectedValue(error);
        const response = await request(app)
          .post(`/api/rooms/${roomId}/chat/conclude`)
          .send()
          .expect(500);
        expect(response.body).toHaveProperty(
          "message",
          "Error setting conclusion from chat"
        );
        expect(response.body).toHaveProperty("error", error.message);
      });

      // Add tests for errors during the submitConclusion call (404, 403, 400, 500)
      it("should return 403 if user is not participant (from submitConclusion)", async () => {
        mockRoomServiceInstance.getChatSession.mockResolvedValue(
          mockChatSessionWithAi as IChatSession
        );
        const submitError = {
          success: false,
          message: "You are not a participant in this room",
        };
        mockRoomServiceInstance.submitConclusion.mockResolvedValue(submitError);

        const response = await request(app)
          .post(`/api/rooms/${roomId}/chat/conclude`)
          .send()
          .expect(403);
        expect(response.body).toEqual(submitError);
      });
    });

    // POST /api/rooms/:roomId/conclude - Submit Conclusion Manually
    describe("POST /api/rooms/:roomId/conclude", () => {
      const roomId = "manual-conclude-room-ghi";
      const conclusionPayload = {
        conclusion: "This is the manual conclusion.",
      };

      it("should submit conclusion manually successfully (200)", async () => {
        const successResult = {
          success: true,
          message: "Conclusion submitted",
          isComplete: true,
        };
        mockRoomServiceInstance.submitConclusion.mockResolvedValue(
          successResult
        );

        const response = await request(app)
          .post(`/api/rooms/${roomId}/conclude`)
          .send(conclusionPayload)
          .expect(200);

        expect(response.body).toEqual(successResult);
        expect(mockRoomServiceInstance.submitConclusion).toHaveBeenCalledWith(
          "test-user-id",
          roomId,
          conclusionPayload.conclusion
        );
      });

      it("should return 401 if authentication fails (simulated)", async () => {
        const response = await request(app)
          .post(`/api/rooms/${roomId}/conclude`)
          .set("simulate-unauthenticated", "true")
          .send(conclusionPayload)
          .expect(401);
        expect(response.body).toHaveProperty("message", "Unauthorized");
        expect(mockRoomServiceInstance.submitConclusion).not.toHaveBeenCalled();
      });

      // Add tests for specific service errors (404, 403, 400, 500)
      it("should return 400 if conclusion already submitted", async () => {
        const errorResult = {
          success: false,
          message: "You have already submitted a conclusion",
        };
        mockRoomServiceInstance.submitConclusion.mockResolvedValue(errorResult);
        const response = await request(app)
          .post(`/api/rooms/${roomId}/conclude`)
          .send(conclusionPayload)
          .expect(400);
        expect(response.body).toEqual(errorResult);
      });
    });

    // GET /api/rooms/:roomId/status - Get Room Status
    describe("GET /api/rooms/:roomId/status", () => {
      const roomId = "status-room-jkl";
      const roomStatus = {
        status: "concluded",
        participants: ["test-user-id"],
        conclusions: {},
      };

      it("should get room status successfully (200)", async () => {
        const successResult = { success: true, status: roomStatus };
        mockRoomServiceInstance.getRoomStatus.mockResolvedValue(successResult);

        const response = await request(app)
          .get(`/api/rooms/${roomId}/status`)
          .expect(200);

        expect(response.body).toEqual(successResult);
        expect(mockRoomServiceInstance.getRoomStatus).toHaveBeenCalledWith(
          "test-user-id",
          roomId
        );
      });

      it("should return 401 if authentication fails (simulated)", async () => {
        const response = await request(app)
          .get(`/api/rooms/${roomId}/status`)
          .set("simulate-unauthenticated", "true")
          .expect(401);
        expect(response.body).toHaveProperty("message", "Unauthorized");
        expect(mockRoomServiceInstance.getRoomStatus).not.toHaveBeenCalled();
      });

      // Add tests for specific service errors (404, 403, 500)
      it("should return 404 if room not found", async () => {
        const errorResult = { success: false, message: "Room not found" };
        mockRoomServiceInstance.getRoomStatus.mockResolvedValue(errorResult);
        const response = await request(app)
          .get(`/api/rooms/${roomId}/status`)
          .expect(404);
        expect(response.body).toEqual(errorResult);
      });
    });

    // GET /api/rooms/:roomId/chat/session - Get Existing Chat Session ID
    describe("GET /api/rooms/:roomId/chat/session", () => {
      const roomId = "get-session-room-mno";
      const sessionInfo = { sessionId: "existing-session-id", exists: true };

      it("should get existing session info successfully (200)", async () => {
        const successResult = { success: true, ...sessionInfo };
        mockRoomServiceInstance.getSessionInfo.mockResolvedValue(successResult);

        const response = await request(app)
          .get(`/api/rooms/${roomId}/chat/session`)
          .expect(200);

        expect(response.body).toEqual(successResult);
        expect(mockRoomServiceInstance.getSessionInfo).toHaveBeenCalledWith(
          "test-user-id",
          roomId
        );
      });

      it("should return 401 if authentication fails (simulated)", async () => {
        const response = await request(app)
          .get(`/api/rooms/${roomId}/chat/session`)
          .set("simulate-unauthenticated", "true")
          .expect(401);
        expect(response.body).toHaveProperty("message", "Unauthorized");
        expect(mockRoomServiceInstance.getSessionInfo).not.toHaveBeenCalled();
      });

      // Add tests for specific service errors (404 room, 403 participant, 404 no session, 500)
      it("should return 404 if no active chat session found", async () => {
        const errorResult = {
          success: false,
          message: "No active chat session found for this room",
        };
        mockRoomServiceInstance.getSessionInfo.mockResolvedValue(errorResult);
        const response = await request(app)
          .get(`/api/rooms/${roomId}/chat/session`)
          .expect(404);
        expect(response.body).toEqual(errorResult);
      });
    });
  });
});
