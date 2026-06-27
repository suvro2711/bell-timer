/// <reference types="cypress" />

// ─────────────────────────────────────────────────────────────────────────────
// Real integration spec – Activity Groups
//
// Hits the REAL Express server + REAL Google Sheets.  No mocks, no stubs.
//
// HOW TO RUN:
//   1. Set MY_STATS_SHEETS_SPREADSHEET_ID in your .env to a DEDICATED
//      throwaway test spreadsheet (do NOT use your real data spreadsheet).
//   2. Start the dev server: npm run dev
//   3. In a second terminal: npm run e2e:real
//      (This opens Cypress with CYPRESS_REAL_E2E=1.)
//   4. When Cypress opens the browser and the first test runs, Google's
//      sign-in page will appear.  Complete sign-in manually.  The session
//      is cached for the rest of the run (cy.session).
//
// CLEANUP:
//   afterEach always restores the full pre-test snapshot via a direct POST,
//   so every test is idempotent even if an assertion fails mid-test.
//
// WHY THIS EXISTS:
//   The regular suite stubs all API calls so it never exercises the real
//   server schema.  This spec would have caught the production 400 error
//   ("expected string, received object") instantly.
// ─────────────────────────────────────────────────────────────────────────────

type GroupNode = { name: string; parent: string | null };

const TEST_PREFIX = "__cyTest_";

function uniqueName(suffix = ""): string {
  return `${TEST_PREFIX}${Date.now()}${suffix ? `_${suffix}` : ""}`;
}

// Guard: skip the entire file if CYPRESS_REAL_E2E is not set so this spec
// never runs accidentally inside the default `npm run e2e` suite.
// (The default suite also excludes *.real.cy.* via excludeSpecPattern.)
before(() => {
  if (!Cypress.env("REAL_E2E")) {
    throw new Error(
      "This spec requires CYPRESS_REAL_E2E=1.  Run it via: npm run e2e:real",
    );
  }
});

describe("Activity Groups – real server + real Google Sheets", () => {
  let snapshot: GroupNode[];

  before(() => {
    // Authenticate once; cy.session reuses the cookie for the whole run.
    cy.realLogin();
  });

  beforeEach(() => {
    // Capture the current sheet contents so afterEach can restore them.
    cy.request<GroupNode[]>("GET", "/api/activity-groups").then((resp) => {
      expect(resp.status).to.eq(200);
      snapshot = resp.body;
    });
  });

  afterEach(() => {
    // Always restore — even if the test assertion failed.
    // This is the "delete the test record" step: because saveActivityGroups
    // is a full clear-and-rewrite, restoring the snapshot removes every
    // test-created row.
    cy.request("POST", "/api/activity-groups", { groups: snapshot }).then((resp) => {
      expect(resp.status).to.eq(200);
    });
  });

  // ─── THE CRITICAL TEST ──────────────────────────────────────────────────────
  // This is the test that would have caught the production 400 bug.
  // It asserts the POST actually returns 200 (not 400) – i.e. the client's
  // GroupNode[] payload is accepted by the REAL server Zod schema.

  it("save sends GroupNode objects and the real server returns 200 (not 400)", () => {
    const name = uniqueName();

    cy.visit("/activity-groups");

    cy.get('[data-testid="new-group-input"]').type(name);
    cy.get('[data-testid="add-group-button"]').click();
    cy.get(`[data-testid="group-item-${name}"]`).should("exist");

    // Intercept WITHOUT stubbing – let the request reach the real server.
    cy.intercept("POST", "/api/activity-groups").as("realSave");
    cy.get('[data-testid="save-groups-button"]').click();

    cy.wait("@realSave").then((interception) => {
      // ← this assertion fails when server schema ≠ client payload shape
      expect(interception.response?.statusCode).to.eq(
        200,
        "Server rejected the payload — schema drift detected. " +
          "Check that groups is z.array(z.object({name,parent})), not z.array(z.string()).",
      );

      // Verify the payload the client actually sent is the object shape.
      const groups = interception.request.body.groups as GroupNode[];
      expect(groups).to.be.an("array");
      groups.forEach((g) => {
        expect(g, `group "${g.name}" must be an object`).to.be.an("object");
        expect(g).to.have.property("name").that.is.a("string").and.not.empty;
        expect(g).to.have.property("parent");
      });
    });

    // Success toast, not error toast.
    cy.contains("Save failed").should("not.exist");
    cy.contains("Saved").should("be.visible");

    // Round-trip: the new group must actually exist in the real sheet.
    cy.request<GroupNode[]>("GET", "/api/activity-groups").then((resp) => {
      const found = resp.body.find((g) => g.name === name);
      expect(found, `Group "${name}" not found in sheet after save`).to.exist;
      expect(found!.parent).to.be.null;
    });
  });

  it("adds a child group with a parent and persists the relationship correctly", () => {
    // We need at least one existing group to use as a parent.
    // If the sheet is empty, seed one first.
    const parentName =
      snapshot.length > 0
        ? snapshot[0].name
        : (() => {
            const seed = uniqueName("parent");
            cy.request("POST", "/api/activity-groups", {
              groups: [{ name: seed, parent: null }],
            });
            return seed;
          })();

    const childName = uniqueName("child");

    cy.visit("/activity-groups");

    cy.get('[data-testid="new-group-input"]').type(childName);
    cy.get('[data-testid="new-group-parent"]').click();
    cy.contains('[role="option"]', parentName).click();
    cy.get('[data-testid="add-group-button"]').click();

    cy.intercept("POST", "/api/activity-groups").as("realSave");
    cy.get('[data-testid="save-groups-button"]').click();

    cy.wait("@realSave").its("response.statusCode").should("eq", 200);
    cy.contains("Save failed").should("not.exist");
    cy.contains("Saved").should("be.visible");

    // Verify the parent relationship was stored correctly in the real sheet.
    cy.request<GroupNode[]>("GET", "/api/activity-groups").then((resp) => {
      const child = resp.body.find((g) => g.name === childName);
      expect(child, `Child group "${childName}" not found`).to.exist;
      expect(child!.parent).to.eq(
        parentName,
        `Expected parent "${parentName}", got "${child!.parent}"`,
      );
    });
  });

  it("deleting a group persists correctly via save (group is gone after round-trip)", () => {
    // Seed a throwaway leaf group directly so we have something to delete.
    const toDelete = uniqueName("delete");
    cy.request("POST", "/api/activity-groups", {
      groups: [...snapshot, { name: toDelete, parent: null }],
    });

    cy.visit("/activity-groups");

    // Wait for the tree to include our seeded group.
    cy.get(`[data-testid="group-item-${toDelete}"]`).should("exist");

    cy.get(`[data-testid="group-item-${toDelete}"]`).trigger("mouseover");
    cy.get(`[data-testid="remove-group-${toDelete}"]`).click({ force: true });
    cy.get(`[data-testid="group-item-${toDelete}"]`).should("not.exist");

    cy.intercept("POST", "/api/activity-groups").as("realSave");
    cy.get('[data-testid="save-groups-button"]').click();

    cy.wait("@realSave").its("response.statusCode").should("eq", 200);
    cy.contains("Saved").should("be.visible");

    // Confirm the sheet no longer contains the deleted group.
    cy.request<GroupNode[]>("GET", "/api/activity-groups").then((resp) => {
      const found = resp.body.find((g) => g.name === toDelete);
      expect(found, `Deleted group "${toDelete}" still present in sheet`).to.be.undefined;
    });
  });
});
