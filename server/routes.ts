import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  app.post(api.sessions.create.path, async (req, res) => {
    try {
      const input = api.sessions.create.input.parse(req.body);
      const session = await storage.createSession(input);
      res.status(201).json(session);
    } catch (err) {
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

  // Seed on startup (non-blocking)
  seedDatabase().catch(console.error);

  return httpServer;
}

// Optional seed function if you want to add initial data
export async function seedDatabase() {
  const sessions = await storage.getSessions();
  if (sessions.length === 0) {
    await storage.createSession({ frequency: 5, intervalSeconds: 10 });
    await storage.createSession({ frequency: 3, intervalSeconds: 60 });
  }
}
