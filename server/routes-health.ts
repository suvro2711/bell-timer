import { Express } from "express";
import { googleSheetsService } from "./google-sheets";
import { storage } from "./storage";

export function registerHealthRoutes(app: Express) {
  // Health check endpoint that also initializes sheets and syncs data
  app.get("/api/health", async (req, res) => {
    try {
      const isConfigured = await googleSheetsService.isConfigured();
      
      if (!isConfigured) {
        return res.status(503).json({
          status: "error",
          sheetsInitialized: false,
          error: "Google Sheets not configured - missing credentials or spreadsheet ID",
        });
      }

      // Try to initialize (won't retry if already attempted)
      await googleSheetsService.initializeSheet();
      
      const isInitialized = googleSheetsService.isInitialized();
      
      // Sync data from Google Sheets to in-memory storage
      if (isInitialized) {
        await storage.syncFromGoogleSheets();
      }
      
      res.json({
        status: isInitialized ? "ok" : "degraded",
        sheetsInitialized: isInitialized,
        timestamp: new Date().toISOString(),
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
