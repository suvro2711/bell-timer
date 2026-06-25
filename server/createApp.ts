import express from "express";
import session from "express-session";
import createMemoryStore from "memorystore";
import { createServer } from "http";
import { registerRoutes } from "./routes";

/**
 * Creates and configures the Express app with all routes registered.
 * Does NOT start the HTTP server or set up Vite — suitable for tests.
 */
export async function createApp() {
  const app = express();
  const httpServer = createServer(app);

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  const MemoryStore = createMemoryStore(session);
  app.use(
    session({
      secret: "test-secret",
      resave: false,
      saveUninitialized: false,
      store: new MemoryStore({ checkPeriod: 86400000 }),
      cookie: { secure: false, httpOnly: true, maxAge: 86400000, sameSite: "lax" },
    }),
  );

  await registerRoutes(httpServer, app);

  return { app, httpServer };
}
