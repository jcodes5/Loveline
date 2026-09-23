import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { createMemoryRouter } from "./routes/memories";
import { createQuoteCardRouter } from "./routes/quote-cards";
import { createDailyContentRouter } from "./routes/daily-content";
import { createAIDraftRouter } from "./routes/ai-draft";
import { createAdminSummaryRouter } from "./routes/admin-summary";
import { createLoveReactionRouter } from "./routes/love-reactions";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: "12mb" }));
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);
  app.use("/api/memories", createMemoryRouter());
  app.use("/api/quote-cards", createQuoteCardRouter());
  app.use("/api/daily-content", createDailyContentRouter());
  app.use("/api/ai", createAIDraftRouter());
  app.use("/api/admin", createAdminSummaryRouter());
  app.use("/api/love-reactions", createLoveReactionRouter());

  return app;
}
