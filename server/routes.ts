import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { googleSheetsService } from "./google-sheets";
import { registerHealthRoutes } from "./routes-health";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register health check route
  registerHealthRoutes(app);

  // Initialize Google Sheets on startup - create year sheet if needed
  (async () => {
    try {
      await googleSheetsService.initializeSheet();
      console.log('Google Sheets initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Sheets:', error);
    }
  })();

  app.post(api.sessions.create.path, async (req, res) => {
    try {
      console.log('POST /api/sessions received:', req.body);
      const input = api.sessions.create.input.parse(req.body);
      console.log('Parsed input:', input);
      const session = await storage.createSession(input);
      console.log('Session created:', session);
      
      res.status(201).json(session);
    } catch (err) {
      console.error('Error in POST /api/sessions:', err);
      if (err instanceof z.ZodError) {
        return res.status(400).json({
          message: err.errors[0].message,
          field: err.errors[0].path.join('.'),
        });
      }
      throw err;
    }
  });

  app.get(api.sessions.list.path, async (req, res) => {
    const sessions = await storage.getSessions();
    res.json(sessions);
  });

  app.delete("/api/sessions/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const deleted = await storage.deleteSession(id);
      if (!deleted) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  return httpServer;
}
