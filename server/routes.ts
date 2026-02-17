import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import { googleSheetsService } from "./google-sheets";
import { registerHealthRoutes } from "./routes-health";
import { registerAuthRoutes, requireAuth, getTokensFromSession } from "./routes-auth";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Register auth routes (login, callback, status, logout) — no auth required
  registerAuthRoutes(app);

  // Register health check route
  registerHealthRoutes(app);

  // All routes below require OAuth authentication
  app.post(api.sessions.create.path, requireAuth, async (req, res) => {
    try {
      const tokens = getTokensFromSession(req);
      console.log('POST /api/sessions received:', req.body);
      const input = api.sessions.create.input.parse(req.body);
      console.log('Parsed input:', input);
      const session = await storage.createSession(tokens, input);
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

  app.get(api.sessions.list.path, requireAuth, async (req, res) => {
    const sessions = await storage.getSessions();
    res.json(sessions);
  });

  app.post("/api/verify-pin", async (req, res) => {
    try {
      const { pin } = req.body;
      const correctPin = process.env.APP_PIN;

      if (!correctPin) {
        return res.status(500).json({ valid: false, error: "PIN not configured" });
      }

      const valid = pin === correctPin;
      res.json({ valid });
    } catch (err) {
      console.error("Error verifying PIN:", err);
      res.status(500).json({ valid: false, error: "Verification failed" });
    }
  });

  app.delete("/api/sessions/:id", requireAuth, async (req, res) => {
    try {
      const tokens = getTokensFromSession(req);
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid session ID" });
      }

      const deleted = await storage.deleteSession(tokens, id);
      if (!deleted) {
        return res.status(404).json({ error: "Session not found" });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Error deleting session:', error);
      res.status(500).json({ error: "Failed to delete session" });
    }
  });

  // Get activity data endpoint
  app.get('/api/activities', requireAuth, async (req, res) => {
    try {
      const tokens = getTokensFromSession(req);
      console.log('GET /api/activities - fetching activity data');
      const activities = await googleSheetsService.getActivityData(tokens);
      console.log(`Returning ${activities.length} activities`);
      res.json(activities);
    } catch (error) {
      console.error('Error fetching activities:', error);
      res.status(500).json({ error: 'Failed to fetch activities', message: error instanceof Error ? error.message : 'Unknown error' });
    }
  });

  // Generic endpoint to fetch data from any spreadsheet/sheet
  app.get('/api/sheets/:spreadsheetId/:sheetName', requireAuth, async (req, res) => {
    try {
      const tokens = getTokensFromSession(req);
      const { spreadsheetId, sheetName } = req.params;
      console.log(`GET /api/sheets/${spreadsheetId}/${sheetName}`);

      const data = await googleSheetsService.getSheetData(tokens, spreadsheetId, sheetName);
      console.log(`Returning ${data.length} rows from ${sheetName}`);
      res.json(data);
    } catch (error) {
      console.error('Error fetching sheet data:', error);
      res.status(500).json({
        error: 'Failed to fetch sheet data',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  return httpServer;
}
