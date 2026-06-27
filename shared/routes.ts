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
            groups: z.array(z.string()).default([]),
            tags: z.array(z.string()).default([]),
            is_background: z.boolean().default(false),
          })
        ),
      }),
    },
  },
  activityGroups: {
    list: {
      path: "/api/activity-groups",
    },
    save: {
      path: "/api/activity-groups",
      input: z.object({
        groups: z.array(
          z.object({
            name: z.string().min(1),
            parent: z.string().nullable().default(null),
          })
        ),
      }),
    },
  },
};

export const activityTaxonomyEntrySchema = z.object({
  activity_name: z.string().min(1),
  groups: z.array(z.string()).default([]),
  tags: z.array(z.string()).default([]),
  is_background: z.boolean().default(false),
});

export type ActivityTaxonomyEntry = z.infer<typeof activityTaxonomyEntrySchema>;

export const groupNodeSchema = z.object({
  name: z.string().min(1),
  parent: z.string().nullable().default(null),
});

export type GroupNode = z.infer<typeof groupNodeSchema>;
