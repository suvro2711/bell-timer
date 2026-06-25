import { z } from "zod";

// API route definitions
export const api = {
  sessions: {
    create: {
      path: "/api/sessions",
      input: z.object({
        intervalFrequency: z.number().min(1),
        timer: z.number().min(1),
      }),
    },
    list: {
      path: "/api/sessions",
    },
    delete: {
      path: "/api/sessions/:id",
    },
  },
  activityTaxonomy: {
    list: {
      path: "/api/activity-taxonomy",
    },
    save: {
      path: "/api/activity-taxonomy",
      input: z.object({
        entries: z.array(
          z.object({
            activity_name: z.string().min(1),
            group: z.string().default(""),
            tags: z.array(z.string()).default([]),
          })
        ),
      }),
    },
  },
};

export const activityTaxonomyEntrySchema = z.object({
  activity_name: z.string().min(1),
  group: z.string().default(""),
  tags: z.array(z.string()).default([]),
});

export type ActivityTaxonomyEntry = z.infer<typeof activityTaxonomyEntrySchema>;
