import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { config } from "./config/config";
import { logger } from "./utils/logger";
import { AppError } from "./errors/AppError";

// Import routes
import authRoutes from "./routes/authRoutes";
import roomRoutes from "./routes/roomRoutes";
import aiRoutes from "./routes/aiRoutes";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";

// Initialize express app
const app = express();

// Middlewares
app.use(cors());
app.use(bodyParser.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`, {
    ip: req.ip,
    userAgent: req.get("user-agent"),
  });
  next();
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/ai", aiRoutes);

// 404 handler for undefined routes
app.all("*", notFoundHandler);

// Global error handling middleware
app.use(errorHandler);

// Connect to database and start server
const startServer = async () => {
  try {
    await mongoose.connect(
      config.database.url,
      config.database.options as mongoose.ConnectOptions
    );
    logger.info("Connected to MongoDB");

    const PORT = config.server.port || 3000;
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  } catch (error) {
    logger.error("Failed to connect to MongoDB", { error });
    process.exit(1);
  }
};

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception", { error: error.stack });
  process.exit(1);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection", { reason, promise });
  process.exit(1);
});

// Start the server
startServer();

// For testing purposes
export default app;
