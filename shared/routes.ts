import { z } from "zod";

// API route definitions
export const api = {
  sessions: {
    create: {
      path: "/api/sessions",
      input: z.object({
        frequency: z.number().min(1),
        intervalSeconds: z.number().min(1),
      }),
    },
    list: {
      path: "/api/sessions",
    },
    delete: {
      path: "/api/sessions/:id",
    },
  },
};
