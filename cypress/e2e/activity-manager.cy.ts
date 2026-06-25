/// <reference types="cypress" />

describe("Activity Manager page", () => {
  const ACTIVITIES_URL = "/api/activity-taxonomy/activities";
  const TAXONOMY_URL = "/api/activity-taxonomy";

  beforeEach(() => {
    cy.stubAuth();
  });

  it("renders unique activities from the API", () => {
    cy.intercept("GET", ACTIVITIES_URL, {
      statusCode: 200,
      body: ["Deep Work", "Run", "Sleep"],
    }).as("uniqueActivities");
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");

    cy.visit("/activity-manager");
    cy.wait(["@uniqueActivities", "@taxonomy"]);

    cy.contains("h1", "Activity Manager").should("be.visible");
    cy.get('[data-testid="activity-row-Deep Work"]').should("exist");
    cy.get('[data-testid="activity-row-Run"]').should("exist");
    cy.get('[data-testid="activity-row-Sleep"]').should("exist");
  });

  it("pre-fills saved group/tag mappings from the taxonomy API", () => {
    cy.intercept("GET", ACTIVITIES_URL, {
      statusCode: 200,
      body: ["Deep Work", "Run"],
    }).as("uniqueActivities");
    cy.intercept("GET", TAXONOMY_URL, {
      statusCode: 200,
      fixture: "activity-taxonomy.json",
    }).as("taxonomy");

    cy.visit("/activity-manager");
    cy.wait(["@uniqueActivities", "@taxonomy"]);

    cy.get('[data-testid="group-input-Deep Work"]').should("have.value", "Work");
    cy.get('[data-testid="tags-input-Deep Work"]').should("have.value", "focus, billable");
    cy.get('[data-testid="group-input-Run"]').should("have.value", "Fitness");
    cy.get('[data-testid="tags-input-Run"]').should("have.value", "cardio");
  });

  it("sends a correct, deduped POST payload when saving", () => {
    cy.intercept("GET", ACTIVITIES_URL, {
      statusCode: 200,
      body: ["Deep Work", "Run"],
    }).as("uniqueActivities");
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");
    cy.intercept("POST", TAXONOMY_URL, { statusCode: 200, body: { success: true } }).as("save");

    cy.visit("/activity-manager");
    cy.wait(["@uniqueActivities", "@taxonomy"]);

    cy.get('[data-testid="group-input-Deep Work"]').clear().type("Work");
    // Include a duplicate and whitespace to verify normalization.
    cy.get('[data-testid="tags-input-Deep Work"]').clear().type("focus, focus ,  billable ");
    cy.get('[data-testid="group-input-Run"]').clear().type("Fitness");
    cy.get('[data-testid="tags-input-Run"]').clear().type("cardio");

    cy.get('[data-testid="save-button"]').click();

    cy.wait("@save").its("request.body").should("deep.equal", {
      entries: [
        { activity_name: "Deep Work", group: "Work", tags: ["focus", "billable"] },
        { activity_name: "Run", group: "Fitness", tags: ["cardio"] },
      ],
    });

    cy.contains("Saved").should("be.visible");
  });

  it("persists saved values after reload (re-fetch reflects them)", () => {
    cy.intercept("GET", ACTIVITIES_URL, {
      statusCode: 200,
      body: ["Deep Work", "Run"],
    }).as("uniqueActivities");

    // First load: nothing saved yet.
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomyEmpty");
    cy.intercept("POST", TAXONOMY_URL, { statusCode: 200, body: { success: true } }).as("save");

    cy.visit("/activity-manager");
    cy.wait(["@uniqueActivities", "@taxonomyEmpty"]);

    cy.get('[data-testid="group-input-Deep Work"]').clear().type("Work");
    cy.get('[data-testid="tags-input-Deep Work"]').clear().type("focus");
    cy.get('[data-testid="save-button"]').click();
    cy.wait("@save");

    // After reload, the API now returns the saved mapping.
    cy.intercept("GET", TAXONOMY_URL, {
      statusCode: 200,
      body: [{ activity_name: "Deep Work", group: "Work", tags: ["focus"] }],
    }).as("taxonomySaved");

    cy.reload();
    cy.wait(["@uniqueActivities", "@taxonomySaved"]);

    cy.get('[data-testid="group-input-Deep Work"]').should("have.value", "Work");
    cy.get('[data-testid="tags-input-Deep Work"]').should("have.value", "focus");
  });

  it("shows the empty state when there are no activities", () => {
    cy.intercept("GET", ACTIVITIES_URL, { statusCode: 200, body: [] }).as("uniqueActivities");
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");

    cy.visit("/activity-manager");
    cy.wait(["@uniqueActivities", "@taxonomy"]);

    cy.get('[data-testid="activities-empty"]').should("be.visible");
  });

  it("shows an error state when the activities API fails", () => {
    cy.intercept("GET", ACTIVITIES_URL, { statusCode: 500, body: { error: "boom" } }).as(
      "uniqueActivities",
    );
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");

    cy.visit("/activity-manager");
    cy.wait("@uniqueActivities");

    cy.get('[data-testid="activities-error"]').should("be.visible");
  });

  it("navigates to Activity Manager from the hamburger menu", () => {
    cy.intercept("GET", ACTIVITIES_URL, { statusCode: 200, body: ["Deep Work"] }).as(
      "uniqueActivities",
    );
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");
    // Home page issues other API calls; stub broadly so the page can load.
    cy.intercept("GET", "/api/sessions", { statusCode: 200, body: [] });

    cy.visit("/");
    cy.get('button[aria-label="Menu"]').click();
    cy.contains("a", "Activity Manager").click();

    cy.wait(["@uniqueActivities", "@taxonomy"]);
    cy.contains("h1", "Activity Manager").should("be.visible");
  });
});
