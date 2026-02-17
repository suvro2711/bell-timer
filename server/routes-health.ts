import { Express } from "express";
import { googleSheetsService } from "./google-sheets";
import { storage } from "./storage";
import { requireAuth, getTokensFromSession } from "./routes-auth";

export function registerHealthRoutes(app: Express) {
  // Health check endpoint that also initializes sheets and syncs data
  // Requires authentication since we need OAuth tokens
  app.get("/api/health", requireAuth, async (req, res) => {
    try {
      const tokens = getTokensFromSession(req);
      const isConfigured = googleSheetsService.isConfigured(tokens);

      if (!isConfigured) {
        return res.status(503).json({
          status: "error",
          sheetsInitialized: false,
          error: "Google Sheets not configured or not authenticated",
        });
      }

      // Try to initialize (won't retry if already attempted)
      await googleSheetsService.initializeSheet(tokens);

      const isInitialized = googleSheetsService.isInitialized();

      // Sync data from Google Sheets to in-memory storage
      if (isInitialized) {
        await storage.syncFromGoogleSheets(tokens);
      }

      res.json({
        status: isInitialized ? "ok" : "degraded",
        sheetsInitialized: isInitialized,
        timestamp: new Date().toISOString(),
        user: req.session.user,
      });
    } catch (error) {
      console.error("Health check failed:", error);
      res.status(500).json({
        status: "error",
        sheetsInitialized: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  });
}
