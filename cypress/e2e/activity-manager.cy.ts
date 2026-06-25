/// <reference types="cypress" />

// Helper: pick an option from a react-select restricted multi-select
// wrapperId is the data-testid of the <td> wrapping the select
function rsSelect(wrapperId: string, optionLabel: string) {
  cy.get(`[data-testid="${wrapperId}"]`).find(".rs__control").click();
  cy.get(".rs__menu").contains(optionLabel).click();
}

// Helper: create a new option in a CreatableSelect
function rsCreate(wrapperId: string, value: string) {
  cy.get(`[data-testid="${wrapperId}"]`).find(".rs__control input").type(value);
  cy.get(".rs__menu").contains(`Add "${value}"`).click();
}

describe("Activity Manager page", () => {
  const ACTIVITIES_URL = "/api/activity-taxonomy/activities";
  const TAXONOMY_URL = "/api/activity-taxonomy";
  const GROUPS_URL = "/api/activity-groups";

  beforeEach(() => {
    cy.stubAuth();
    cy.intercept("GET", GROUPS_URL, { statusCode: 200, fixture: "activity-groups.json" }).as(
      "groups",
    );
  });

  it("renders unique activities from the API", () => {
    cy.intercept("GET", ACTIVITIES_URL, {
      statusCode: 200,
      body: ["Deep Work", "Run", "Sleep"],
    }).as("uniqueActivities");
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");

    cy.visit("/activity-manager");
    cy.wait(["@uniqueActivities", "@taxonomy", "@groups"]);

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
    cy.wait(["@uniqueActivities", "@taxonomy", "@groups"]);

    // Groups pre-filled as react-select multi-value pills
    cy.get('[data-testid="groups-select-Deep Work"]').contains("Work").should("exist");
    cy.get('[data-testid="tags-select-Deep Work"]').contains("focus").should("exist");
    cy.get('[data-testid="tags-select-Deep Work"]').contains("billable").should("exist");
    cy.get('[data-testid="groups-select-Run"]').contains("Fitness").should("exist");
    cy.get('[data-testid="tags-select-Run"]').contains("cardio").should("exist");
  });

  it("sends a correct POST payload with groups[], tags[], and is_background", () => {
    cy.intercept("GET", ACTIVITIES_URL, {
      statusCode: 200,
      body: ["Deep Work"],
    }).as("uniqueActivities");
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");
    cy.intercept("POST", TAXONOMY_URL, { statusCode: 200, body: { success: true } }).as("save");

    cy.visit("/activity-manager");
    cy.wait(["@uniqueActivities", "@taxonomy", "@groups"]);

    rsSelect("groups-select-Deep Work", "Work");
    rsCreate("tags-select-Deep Work", "focus");
    rsCreate("tags-select-Deep Work", "billable");
    cy.get('[data-testid="background-checkbox-Deep Work"]').click();

    cy.get('[data-testid="save-button"]').click();

    cy.wait("@save").its("request.body").should("deep.equal", {
      entries: [
        {
          activity_name: "Deep Work",
          groups: ["Work"],
          tags: ["focus", "billable"],
          is_background: true,
        },
      ],
    });

    cy.contains("Saved").should("be.visible");
  });

  it("persists saved values after reload", () => {
    cy.intercept("GET", ACTIVITIES_URL, { statusCode: 200, body: ["Deep Work"] }).as(
      "uniqueActivities",
    );
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomyEmpty");
    cy.intercept("POST", TAXONOMY_URL, { statusCode: 200, body: { success: true } }).as("save");

    cy.visit("/activity-manager");
    cy.wait(["@uniqueActivities", "@taxonomyEmpty", "@groups"]);

    rsSelect("groups-select-Deep Work", "Work");
    rsCreate("tags-select-Deep Work", "focus");
    cy.get('[data-testid="save-button"]').click();
    cy.wait("@save");

    cy.intercept("GET", TAXONOMY_URL, {
      statusCode: 200,
      body: [{ activity_name: "Deep Work", groups: ["Work"], tags: ["focus"], is_background: false }],
    }).as("taxonomySaved");

    cy.reload();
    cy.wait(["@uniqueActivities", "@taxonomySaved", "@groups"]);

    cy.get('[data-testid="groups-select-Deep Work"]').contains("Work").should("exist");
    cy.get('[data-testid="tags-select-Deep Work"]').contains("focus").should("exist");
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
    cy.intercept("GET", "/api/sessions", { statusCode: 200, body: [] });

    cy.visit("/");
    cy.get('button[aria-label="Menu"]').click();
    cy.contains("a", "Activity Manager").click();

    cy.wait(["@uniqueActivities", "@taxonomy", "@groups"]);
    cy.contains("h1", "Activity Manager").should("be.visible");
  });

  it("opens the Group Manager modal, adds a group, and POSTs to save", () => {
    cy.intercept("GET", ACTIVITIES_URL, { statusCode: 200, body: ["Deep Work"] }).as(
      "uniqueActivities",
    );
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");
    cy.intercept("POST", GROUPS_URL, { statusCode: 200, body: { success: true } }).as("saveGroups");

    cy.visit("/activity-manager");
    cy.wait(["@uniqueActivities", "@taxonomy", "@groups"]);

    cy.get('[data-testid="manage-groups-button"]').click();
    cy.get('[data-testid="group-manager-dialog"]').should("be.visible");

    cy.get('[data-testid="new-group-input"]').type("Learning");
    cy.get('[data-testid="add-group-button"]').click();
    cy.get('[data-testid="group-item-Learning"]').should("exist");

    cy.get('[data-testid="save-groups-button"]').click();
    cy.wait("@saveGroups").its("request.body.groups").should("include", "Learning");
  });

  it("removes a group in the Group Manager modal before saving", () => {
    cy.intercept("GET", ACTIVITIES_URL, { statusCode: 200, body: [] }).as("uniqueActivities");
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");
    cy.intercept("POST", GROUPS_URL, { statusCode: 200, body: { success: true } }).as("saveGroups");

    cy.visit("/activity-manager");
    cy.wait(["@uniqueActivities", "@taxonomy", "@groups"]);

    cy.get('[data-testid="manage-groups-button"]').click();
    cy.get('[data-testid="group-item-Work"]').should("exist");

    cy.get('[data-testid="remove-group-Work"]').click();
    cy.get('[data-testid="group-item-Work"]').should("not.exist");

    cy.get('[data-testid="save-groups-button"]').click();
    cy.wait("@saveGroups")
      .its("request.body.groups")
      .should("not.include", "Work");
  });
});

