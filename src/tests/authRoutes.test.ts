import request from "supertest";
import express from "express";
import authRoutes from "../routes/authRoutes";
import { User } from "../models/user";

jest.mock("../models/user");

const app = express();
app.use(express.json());
app.use("/api/auth", authRoutes); // ✅ make sure this matches

describe("POST /api/auth/signup", () => {
  it("should create a new user and return a token", async () => {
    const saveMock = jest.fn().mockResolvedValueOnce(undefined);
    const mockUser = {
      id: "user123",
      username: "testuser",
      email: "test@example.com",
      password: "hashedpassword",
      save: saveMock,
    };

    (User as any).findOne = jest.fn().mockResolvedValueOnce(null);
    (User as any).prototype.save = saveMock;
    (User as any).prototype.id = mockUser.id;
    (User as any).prototype.username = mockUser.username;

    const res = await request(app).post("/api/auth/signup").send({
      username: "testuser",
      email: "test@example.com",
      password: "password123",
    });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("token");
    expect(res.body.username).toBe("testuser");
  });
});

describe("POST /api/auth/login", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should return a token if credentials are valid", async () => {
    const comparePasswordMock = jest.fn().mockResolvedValue(true);

    (User.findOne as jest.Mock).mockResolvedValue({
      id: "mockUserId",
      username: "testuser",
      comparePassword: comparePasswordMock,
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "testpass",
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("token");
    expect(res.body.username).toBe("testuser");
    expect(comparePasswordMock).toHaveBeenCalled();
  });

  it("should return 401 if user not found", async () => {
    (User.findOne as jest.Mock).mockResolvedValue(null);

    const res = await request(app).post("/api/auth/login").send({
      email: "notfound@example.com",
      password: "testpass",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });

  it("should return 401 if password is invalid", async () => {
    const comparePasswordMock = jest.fn().mockResolvedValue(false);

    (User.findOne as jest.Mock).mockResolvedValue({
      comparePassword: comparePasswordMock,
    });

    const res = await request(app).post("/api/auth/login").send({
      email: "test@example.com",
      password: "wrongpass",
    });

    expect(res.status).toBe(401);
    expect(res.body.message).toBe("Invalid credentials");
  });
});
