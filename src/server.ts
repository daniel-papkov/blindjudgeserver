import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import { env } from "./config/env";
import { RateLimiter, APILimiter } from "./middleware/rateLimiter";
import authRoutes from "./routes/authRoutes";
import roomRoutes from "./routes/roomRoutes";
import aiRoutes from "./routes/aiRoutes";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Apply rate limiting
app.use("/api/", RateLimiter);
app.use("/api/ai", aiRoutes);

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

// MongoDB connection with retry logic
const connectWithRetry = () => {
  mongoose
    .connect(env.MONGODB_URI)
    .then(() => {
      console.log("Connected to MongoDB");
    })
    .catch((err) => {
      console.error("MongoDB connection error:", err);
      console.log("Retrying in 5 seconds...");
      setTimeout(connectWithRetry, 5000);
    });
};

connectWithRetry();

// Error handling middleware
app.use(
  (
    err: Error,
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    console.error(err.stack);
    res.status(500).json({
      success: false,
      message:
        env.NODE_ENV === "development" ? err.message : "Internal Server Error",
    });
  }
);

const PORT = env.PORT;
app.listen(PORT, () =>
  console.log(`Server running in ${env.NODE_ENV} mode on port ${PORT}`)
);
