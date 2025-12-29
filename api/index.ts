import express from "express";
import { registerRoutes } from "../server/routes.js";

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Register API routes
registerRoutes(null as any, app);

// Export for Vercel serverless
export default app;
