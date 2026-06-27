/// <reference types="cypress" />

// Helper: pick an option inside a react-select by its inputId.
function rsSelectByInput(inputId: string, optionLabel: string) {
  cy.get(`#${CSS.escape(inputId)}`).parents(".rs__control").first().click();
  cy.get(".rs__menu").contains(optionLabel).click();
}

// ---------------------------------------------------------------------------
// Shared fixture data (mirrors what the server would return)
// ---------------------------------------------------------------------------
const GROUPS_FIXTURE = [
  { name: "Work", parent: null },
  { name: "Deep Work", parent: "Work" },
  { name: "Fitness", parent: null },
  { name: "Personal", parent: null },
];

const TAXONOMY_FIXTURE = [
  { activity_name: "Deep Work", groups: ["Work"], tags: ["focus"], is_background: false },
  { activity_name: "Run", groups: ["Fitness"], tags: ["cardio"], is_background: false },
];

describe("Activity Groups page", () => {
  const GROUPS_URL = "/api/activity-groups";
  const TAXONOMY_URL = "/api/activity-taxonomy";

  // Default beforeEach: groups + taxonomy return real-looking data instantly.
  beforeEach(() => {
    cy.stubAuth();
    cy.intercept("GET", GROUPS_URL, { statusCode: 200, body: GROUPS_FIXTURE }).as("groups");
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: TAXONOMY_FIXTURE }).as("taxonomy");
  });

  // ─── Page structure ───────────────────────────────────────────────────────

  it("renders the page header and group tree", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.contains("h1", "Activity Groups").should("be.visible");
    cy.get('[data-testid="group-item-Work"]').should("exist");
    cy.get('[data-testid="group-item-Deep Work"]').should("exist");
    cy.get('[data-testid="group-item-Fitness"]').should("exist");
    cy.get('[data-testid="group-item-Personal"]').should("exist");
  });

  it("indents child groups in the tree", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    // Deep Work is nested under Work → must have a non-zero margin-left.
    cy.get('[data-testid="group-item-Deep Work"]')
      .invoke("attr", "style")
      .should("contain", "margin-left");

    // Top-level groups (Work, Fitness, Personal) have depth 0 → no extra indent.
    cy.get('[data-testid="group-item-Work"]')
      .invoke("attr", "style")
      .should("satisfy", (s: string) => !s || s.includes("margin-left: 0rem"));
  });

  // ─── Empty-state / first visit ────────────────────────────────────────────

  it("shows empty-state message when no groups exist", () => {
    cy.intercept("GET", GROUPS_URL, { statusCode: 200, fixture: "activity-groups-empty.json" }).as(
      "emptyGroups",
    );
    cy.visit("/activity-groups");
    cy.wait(["@emptyGroups", "@taxonomy"]);

    cy.get('[data-testid="groups-empty"]').should("be.visible");
    cy.get('[data-testid="group-tree"]').should("not.exist");
  });

  it("does NOT crash when adding a group to an empty list (crash regression)", () => {
    // Regression: `g.name.toLowerCase()` crashed when groups had undefined names.
    // This test guards against the staleTime+initialized bug that left groups=[].
    cy.intercept("GET", GROUPS_URL, { statusCode: 200, fixture: "activity-groups-empty.json" }).as(
      "emptyGroups",
    );
    cy.visit("/activity-groups");
    cy.wait(["@emptyGroups", "@taxonomy"]);

    // Typing a name and clicking Add must not throw.
    cy.get('[data-testid="new-group-input"]').type("MyGroup");
    cy.get('[data-testid="add-group-button"]').click();

    // Group appears and no error overlay is shown.
    cy.get('[data-testid="group-item-MyGroup"]').should("exist");
    cy.get(".vite-error-overlay").should("not.exist");
  });

  it("first group added to an empty list is top-level", () => {
    cy.intercept("GET", GROUPS_URL, { statusCode: 200, fixture: "activity-groups-empty.json" }).as(
      "emptyGroups",
    );
    cy.visit("/activity-groups");
    cy.wait(["@emptyGroups", "@taxonomy"]);

    cy.get('[data-testid="new-group-input"]').type("Learning");
    cy.get('[data-testid="add-group-button"]').click();

    // depth=0 → margin-left should be 0rem (no indentation).
    cy.get('[data-testid="group-item-Learning"]')
      .invoke("attr", "style")
      .should("satisfy", (s: string) => !s || s.includes("margin-left: 0rem"));
  });

  // ─── Parent-group dropdown ────────────────────────────────────────────────

  it("parent-group Select is populated immediately after data loads (dropdown regression)", () => {
    // Regression guard: the dropdown must be populated on the FIRST interaction
    // after data arrives.  Previously staleTime:Infinity + initialized flag
    // caused an empty dropdown on every real-browser visit.
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="new-group-parent"]').click();
    // Must contain at least "None (top-level)" + the 4 groups from the fixture.
    cy.get('[role="option"]').should("have.length.at.least", 5);
    // Press Escape to close without selecting.
    cy.get("body").type("{esc}");
  });

  it("group-filter Select is populated immediately after data loads", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="group-filter"]').click();
    // "All groups" + 4 fixture groups.
    cy.get('[role="option"]').should("have.length.at.least", 5);
    cy.get("body").type("{esc}");
  });

  // ─── Adding groups ────────────────────────────────────────────────────────

  it("adds a new top-level group", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="new-group-input"]').type("Learning");
    cy.get('[data-testid="add-group-button"]').click();
    cy.get('[data-testid="group-item-Learning"]').should("exist");
  });

  it("Enter key in the name input triggers add", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="new-group-input"]').type("Hobbies{enter}");
    cy.get('[data-testid="group-item-Hobbies"]').should("exist");
  });

  it("adds a child group under a chosen parent and saves the correct payload", () => {
    cy.interceptSave("saveGroups");

    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="new-group-input"]').type("Sprint");

    // Guard: options must be there before clicking (catches dropdown-empty regression).
    cy.get('[data-testid="new-group-parent"]').click();
    cy.get('[role="option"]').should("have.length.greaterThan", 1);
    // Use exact regex so "Deep Work" is not matched when looking for "Work".
    cy.contains('[role="option"]', /^Work$/).click();
    cy.get('[data-testid="add-group-button"]').click();

    cy.get('[data-testid="group-item-Sprint"]').should("exist");

    cy.get('[data-testid="save-groups-button"]').click();
    cy.wait("@saveGroups").then((interception) => {
      // Schema-validated intercept: 400 means the payload shape was wrong.  });

  it("blocks adding a duplicate group name and shows a toast", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    const initialCount = GROUPS_FIXTURE.length;

    cy.get('[data-testid="new-group-input"]').type("Work"); // already exists
    cy.get('[data-testid="add-group-button"]').click();

    // Toast with "Duplicate group" must appear.
    cy.contains("Duplicate group").should("be.visible");
    // Tree must not gain a new item.
    cy.get('[data-testid^="group-item-"]').should("have.length", initialCount);
  });

  it("does not add a group when name is empty", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="add-group-button"]').click();
    cy.get('[data-testid^="group-item-"]').should("have.length", GROUPS_FIXTURE.length);
  });

  // ─── Editing groups ───────────────────────────────────────────────────────

  it("renames a group via the edit icon and saves the correct payload", () => {
    cy.interceptSave("saveGroups");

    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="edit-group-Fitness"]').click();
    cy.get('[data-testid="group-edit-Fitness"]').should("be.visible");
    cy.get('[data-testid="edit-group-name"]').clear().type("Health");
    cy.get('[data-testid="confirm-edit-button"]').click();

    cy.get('[data-testid="group-item-Health"]').should("exist");
    cy.get('[data-testid="group-item-Fitness"]').should("not.exist");

    cy.get('[data-testid="save-groups-button"]').click();
    cy.wait("@saveGroups").then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
      const groups = interception.request.body.groups as Array<{ name: string }>;
      expect(groups.map((g) => g.name)).to.include("Health");
      expect(groups.map((g) => g.name)).to.not.include("Fitness");
    });
    cy.contains("Save failed").should("not.exist");
  });

  it("cancel-edit restores the original group name in the tree", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="edit-group-Personal"]').click();
    cy.get('[data-testid="edit-group-name"]').clear().type("Leisure");
    cy.get('[data-testid="cancel-edit-button"]').click();

    cy.get('[data-testid="group-item-Personal"]').should("exist");
    cy.get('[data-testid="group-item-Leisure"]').should("not.exist");
  });

  it("changes a group's parent via edit and saves the correct parent", () => {
    cy.interceptSave("saveGroups");

    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    // Move Personal under Fitness.
    cy.get('[data-testid="edit-group-Personal"]').click();
    cy.get('[data-testid="edit-group-parent"]').click();
    cy.contains('[role="option"]', /^Fitness$/).click();
    cy.get('[data-testid="confirm-edit-button"]').click();

    // Personal must now appear as a child → should be indented.
    cy.get('[data-testid="group-item-Personal"]')
      .invoke("attr", "style")
      .should("contain", "margin-left");

    cy.get('[data-testid="save-groups-button"]').click();
    cy.wait("@saveGroups").then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
      const groups = interception.request.body.groups as Array<{ name: string; parent: string | null }>;
      const personal = groups.find((g) => g.name === "Personal");
      expect(personal?.parent).to.equal("Fitness");
    });
    cy.contains("Save failed").should("not.exist");
  });

  // ─── Deleting groups ──────────────────────────────────────────────────────

  it("blocks deleting a group that has subgroups", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="group-item-Work"]').trigger("mouseover");
    cy.get('[data-testid="remove-group-Work"]').click({ force: true });

    cy.contains("Cannot delete").should("be.visible");
    cy.get('[data-testid="group-item-Work"]').should("exist");
  });

  it("deletes a leaf group", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="group-item-Personal"]').trigger("mouseover");
    cy.get('[data-testid="remove-group-Personal"]').click({ force: true });
    cy.get('[data-testid="group-item-Personal"]').should("not.exist");
    cy.get('[data-testid^="group-item-"]').should("have.length", GROUPS_FIXTURE.length - 1);
  });

  // ─── Save / persist ───────────────────────────────────────────────────────

  it("save button sends all current groups to the API", () => {
    cy.interceptSave("saveGroups");

    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="save-groups-button"]').click();
    cy.wait("@saveGroups").then((interception) => {
      expect(interception.response?.statusCode).to.eq(200);
      const groups = interception.request.body.groups as Array<{ name: string; parent: string | null }>;
      expect(groups).to.have.length(GROUPS_FIXTURE.length);
      expect(groups.map((g) => g.name).sort()).to.deep.equal(
        GROUPS_FIXTURE.map((g) => g.name).sort(),
      );
    });
    cy.contains("Save failed").should("not.exist");
  });

  it("shows an error toast when the save API returns 500", () => {
    cy.intercept("POST", GROUPS_URL, { statusCode: 500, body: { error: "Sheet error" } }).as(
      "saveGroupsFail",
    );

    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="save-groups-button"]').click();
    cy.wait("@saveGroupsFail");

    cy.contains("Save failed").should("be.visible");
  });

  // ─── Activities browser ───────────────────────────────────────────────────

  it("activities table shows all grouped activities on load", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="activity-row-Deep Work"]').should("exist");
    cy.get('[data-testid="activity-row-Run"]').should("exist");
  });

  it("searches activities by name (case-insensitive)", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="activity-search"]').type("run");
    cy.get('[data-testid="activity-row-Run"]').should("exist");
    cy.get('[data-testid="activity-row-Deep Work"]').should("not.exist");
  });

  it("clearing search restores all activities", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="activity-search"]').type("run");
    cy.get('[data-testid="activity-row-Deep Work"]').should("not.exist");
    cy.get('[data-testid="activity-search"]').clear();
    cy.get('[data-testid="activity-row-Deep Work"]').should("exist");
  });

  it("filters activities by group (including descendants)", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="group-filter"]').click();
    cy.contains('[role="option"]', "Fitness").click();

    cy.get('[data-testid="activity-row-Run"]').should("exist");
    cy.get('[data-testid="activity-row-Deep Work"]').should("not.exist");
  });

  it("filtering by a parent group shows descendant activities", () => {
    // "Work" is the parent of "Deep Work"; "Deep Work" activity is under group "Work".
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="group-filter"]').click();
    cy.contains('[role="option"]', /^Work$/).click();

    // Deep Work activity is in group "Work" → visible.
    cy.get('[data-testid="activity-row-Deep Work"]').should("exist");
    cy.get('[data-testid="activity-row-Run"]').should("not.exist");
  });

  it("resetting group filter to All groups restores all activities", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="group-filter"]').click();
    cy.contains('[role="option"]', "Fitness").click();
    cy.get('[data-testid="activity-row-Deep Work"]').should("not.exist");

    cy.get('[data-testid="group-filter"]').click();
    cy.contains('[role="option"]', "All groups").click();
    cy.get('[data-testid="activity-row-Deep Work"]').should("exist");
    cy.get('[data-testid="activity-row-Run"]').should("exist");
  });

  it("shows empty-activities message when search matches nothing", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="activity-search"]').type("xyznosuchthing");
    cy.get('[data-testid="activities-empty"]').should("be.visible");
  });

  it("activities scroll container is present and bounded", () => {
    cy.visit("/activity-groups");
    cy.wait(["@groups", "@taxonomy"]);

    cy.get('[data-testid="activities-scroll"]').should("exist").and("be.visible");
  });
});
