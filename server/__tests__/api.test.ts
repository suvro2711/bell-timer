import { describe, it, expect, vi, beforeAll, beforeEach } from "vitest";
import request from "supertest";
import type { Express } from "express";

// ─── Mock auth: bypass OAuth for all requests ─────────────────────────────────
vi.mock("../routes-auth", () => ({
  requireAuth: (_req: any, _res: any, next: any) => next(),
  getTokensFromSession: () => ({ access_token: "test-token", refresh_token: "test-refresh" }),
  registerAuthRoutes: () => {},
}));

// ─── Mock Google Sheets service ────────────────────────────────────────────────
vi.mock("../google-sheets", () => ({
  googleSheetsService: {
    // activity-groups
    getActivityGroups: vi.fn().mockResolvedValue([]),
    saveActivityGroups: vi.fn().mockResolvedValue(undefined),
    // activity-taxonomy
    getActivityTaxonomy: vi.fn().mockResolvedValue([]),
    saveActivityTaxonomy: vi.fn().mockResolvedValue(undefined),
    getUniqueActivities: vi.fn().mockResolvedValue([]),
    // health / init
    isConfigured: vi.fn().mockReturnValue(true),
    isInitialized: vi.fn().mockReturnValue(true),
    initializeSheet: vi.fn().mockResolvedValue(undefined),
    // sessions
    getRecentSessions: vi.fn().mockResolvedValue([]),
    createSession: vi.fn().mockResolvedValue({ id: 1, intervalFrequency: 5, timer: 25, createdAt: new Date() }),
    // generic sheet + activities
    getSheetData: vi.fn().mockResolvedValue([]),
    getActivityData: vi.fn().mockResolvedValue([]),
    // niharika
    getNiharikaRatings: vi.fn().mockResolvedValue([]),
    createNiharikaRating: vi.fn().mockResolvedValue(undefined),
    updateNiharikaRating: vi.fn().mockResolvedValue(undefined),
    deleteNiharikaRating: vi.fn().mockResolvedValue(undefined),
  },
}));

import { googleSheetsService } from "../google-sheets";
import { createApp } from "../createApp";
import { api } from "@shared/routes";

let app: Express;

beforeAll(async () => {
  const result = await createApp();
  app = result.app;
});

beforeEach(() => {
  vi.clearAllMocks();
});

// ─────────────────────────────────────────────────────────────────────────────
// Activity Groups
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/activity-groups", () => {
  it("returns 200 with the list from the service", async () => {
    const nodes = [
      { name: "Work", parent: null },
      { name: "Deep Work", parent: "Work" },
      { name: "Fitness", parent: null },
    ];
    vi.mocked(googleSheetsService.getActivityGroups).mockResolvedValueOnce(nodes);

    const res = await request(app).get("/api/activity-groups");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(nodes);
    expect(googleSheetsService.getActivityGroups).toHaveBeenCalledOnce();
  });

  it("returns 200 with an empty array when no groups are saved", async () => {
    vi.mocked(googleSheetsService.getActivityGroups).mockResolvedValueOnce([]);

    const res = await request(app).get("/api/activity-groups");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("returns 500 when the service throws", async () => {
    vi.mocked(googleSheetsService.getActivityGroups).mockRejectedValueOnce(new Error("Sheets unavailable"));

    const res = await request(app).get("/api/activity-groups");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Sheets unavailable");
  });
});

describe("POST /api/activity-groups", () => {
  it("returns 200 and calls the service with the provided groups", async () => {
    vi.mocked(googleSheetsService.saveActivityGroups).mockResolvedValueOnce(undefined);

    const groups = [
      { name: "Work", parent: null },
      { name: "Deep Work", parent: "Work" },
    ];
    const res = await request(app)
      .post("/api/activity-groups")
      .send({ groups });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(googleSheetsService.saveActivityGroups).toHaveBeenCalledWith(
      expect.any(Object),
      groups,
    );
  });

  it("defaults a missing parent to null", async () => {
    vi.mocked(googleSheetsService.saveActivityGroups).mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post("/api/activity-groups")
      .send({ groups: [{ name: "Work" }] });

    expect(res.status).toBe(200);
    expect(googleSheetsService.saveActivityGroups).toHaveBeenCalledWith(
      expect.any(Object),
      [{ name: "Work", parent: null }],
    );
  });

  it("accepts an empty groups array", async () => {
    vi.mocked(googleSheetsService.saveActivityGroups).mockResolvedValueOnce(undefined);

    const res = await request(app).post("/api/activity-groups").send({ groups: [] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
  });

  it("returns 400 when groups is missing (Zod validation)", async () => {
    const res = await request(app).post("/api/activity-groups").send({});

    expect(res.status).toBe(400);
    expect(googleSheetsService.saveActivityGroups).not.toHaveBeenCalled();
  });

  it("returns 400 when a group has an empty name (Zod min(1))", async () => {
    const res = await request(app)
      .post("/api/activity-groups")
      .send({ groups: [{ name: "Work", parent: null }, { name: "", parent: null }] });

    expect(res.status).toBe(400);
    expect(googleSheetsService.saveActivityGroups).not.toHaveBeenCalled();
  });

  it("returns 400 when groups is not an array", async () => {
    const res = await request(app)
      .post("/api/activity-groups")
      .send({ groups: "Work" });

    expect(res.status).toBe(400);
  });

  it("returns 500 when the service throws", async () => {
    vi.mocked(googleSheetsService.saveActivityGroups).mockRejectedValueOnce(new Error("Write failed"));

    const res = await request(app)
      .post("/api/activity-groups")
      .send({ groups: [{ name: "Work", parent: null }] });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Write failed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Activity Taxonomy — unique activities
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/activity-taxonomy/activities", () => {
  it("returns 200 with unique activity names from the service", async () => {
    vi.mocked(googleSheetsService.getUniqueActivities).mockResolvedValueOnce(["Deep Work", "Run", "Sleep"]);

    const res = await request(app).get("/api/activity-taxonomy/activities");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(["Deep Work", "Run", "Sleep"]);
  });

  it("returns 500 when the service throws", async () => {
    vi.mocked(googleSheetsService.getUniqueActivities).mockRejectedValueOnce(new Error("Sheet read failed"));

    const res = await request(app).get("/api/activity-taxonomy/activities");

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Sheet read failed");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Activity Taxonomy — mappings
// ─────────────────────────────────────────────────────────────────────────────

describe("GET /api/activity-taxonomy", () => {
  it("returns 200 with taxonomy entries from the service", async () => {
    const entries = [
      { activity_name: "Deep Work", groups: ["Work"], tags: ["focus"], is_background: false },
      { activity_name: "Travel", groups: ["Personal"], tags: [], is_background: true },
    ];
    vi.mocked(googleSheetsService.getActivityTaxonomy).mockResolvedValueOnce(entries);

    const res = await request(app).get("/api/activity-taxonomy");

    expect(res.status).toBe(200);
    expect(res.body).toEqual(entries);
  });

  it("returns 200 with an empty array when no mappings exist", async () => {
    vi.mocked(googleSheetsService.getActivityTaxonomy).mockResolvedValueOnce([]);

    const res = await request(app).get("/api/activity-taxonomy");

    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });
});

describe("POST /api/activity-taxonomy", () => {
  const validEntry = {
    activity_name: "Deep Work",
    groups: ["Work"],
    tags: ["focus", "billable"],
    is_background: false,
  };

  it("returns 200 and calls the service with the entries", async () => {
    vi.mocked(googleSheetsService.saveActivityTaxonomy).mockResolvedValueOnce(undefined);

    const res = await request(app)
      .post("/api/activity-taxonomy")
      .send({ entries: [validEntry] });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true });
    expect(googleSheetsService.saveActivityTaxonomy).toHaveBeenCalledWith(
      expect.any(Object),
      [validEntry],
    );
  });

  it("coerces missing optional fields to their defaults", async () => {
    vi.mocked(googleSheetsService.saveActivityTaxonomy).mockResolvedValueOnce(undefined);

    // Only activity_name — groups, tags, is_background should default
    const res = await request(app)
      .post("/api/activity-taxonomy")
      .send({ entries: [{ activity_name: "Run" }] });

    expect(res.status).toBe(200);
    expect(googleSheetsService.saveActivityTaxonomy).toHaveBeenCalledWith(
      expect.any(Object),
      [{ activity_name: "Run", groups: [], tags: [], is_background: false }],
    );
  });

  it("returns 400 when entries is missing", async () => {
    const res = await request(app).post("/api/activity-taxonomy").send({});

    expect(res.status).toBe(400);
    expect(googleSheetsService.saveActivityTaxonomy).not.toHaveBeenCalled();
  });

  it("returns 400 when an entry has an empty activity_name (Zod min(1))", async () => {
    const res = await request(app)
      .post("/api/activity-taxonomy")
      .send({ entries: [{ activity_name: "" }] });

    expect(res.status).toBe(400);
    expect(googleSheetsService.saveActivityTaxonomy).not.toHaveBeenCalled();
  });

  it("returns 400 when groups is not an array", async () => {
    const res = await request(app)
      .post("/api/activity-taxonomy")
      .send({ entries: [{ activity_name: "Run", groups: "Work" }] });

    expect(res.status).toBe(400);
  });

  it("returns 500 when the service throws", async () => {
    vi.mocked(googleSheetsService.saveActivityTaxonomy).mockRejectedValueOnce(new Error("Quota exceeded"));

    const res = await request(app)
      .post("/api/activity-taxonomy")
      .send({ entries: [validEntry] });

    expect(res.status).toBe(500);
    expect(res.body.message).toBe("Quota exceeded");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Client-payload contract – guards against client↔server schema drift.
//
// These tests parse the exact payload shape the client sends against the REAL
// Zod schema.  They will turn red the instant someone changes the schema or
// the client payload without updating the other side.
// ─────────────────────────────────────────────────────────────────────────────
describe("Client-payload contract – POST /api/activity-groups", () => {
  it("GroupNode[] (objects with name+parent) is accepted by the server schema", () => {
    const payload = {
      groups: [
        { name: "Work", parent: null },
        { name: "Deep Work", parent: "Work" },
        { name: "Fitness", parent: null },
      ],
    };
    const result = api.activityGroups.save.input.safeParse(payload);
    expect(result.success).toBe(true);
  });

  it("rejects an array of plain strings (regression guard: schema expects objects, not strings)", () => {
    // This is the exact failure mode that caused the production 400 error:
    // a stale server still validated groups as z.array(z.string()) while the
    // client sent GroupNode objects.  This test catches that drift instantly.
    const result = api.activityGroups.save.input.safeParse({
      groups: ["Work", "Deep Work"],
    });
    expect(result.success).toBe(false);
    expect(result.error?.errors[0]).toMatchObject({
      code: "invalid_type",
      expected: "object",
      received: "string",
    });
  });

  it("defaults parent to null when the field is omitted", () => {
    const result = api.activityGroups.save.input.safeParse({
      groups: [{ name: "Work" }],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.groups[0].parent).toBe(null);
    }
  });

  it("rejects a group with an empty name", () => {
    const result = api.activityGroups.save.input.safeParse({
      groups: [{ name: "", parent: null }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a group object missing the name field entirely", () => {
    const result = api.activityGroups.save.input.safeParse({
      groups: [{ parent: null }],
    });
    expect(result.success).toBe(false);
  });
});
