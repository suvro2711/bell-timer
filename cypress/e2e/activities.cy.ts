/// <reference types="cypress" />

describe("Activities page", () => {
  beforeEach(() => {
    cy.stubAuth();
  });

  it("renders the static activity catalog from categories.json", () => {
    // The page and the sync modal fetch monthly sheets; stub all of them.
    cy.intercept("GET", "/api/sheets/**", { statusCode: 200, body: [] }).as("sheets");

    cy.visit("/activities");

    cy.contains("h1", "All Activities").should("be.visible");
    // A known activity + group from categories.json.
    cy.contains("td", "Deep Work").should("exist");
    cy.contains("td", "office_work").should("exist");
  });

  it("shows unique activities in the sync modal derived from sheet data", () => {
    const sheetRows = [
      { activity_type: "Reading", duration: "00:30", from: "09:00", to: "09:30", comment: "" },
      { activity_type: "Reading", duration: "00:15", from: "10:00", to: "10:15", comment: "" },
      { activity_type: "Meditation", duration: "00:20", from: "07:00", to: "07:20", comment: "" },
    ];

    cy.intercept("GET", "/api/sheets/**", { statusCode: 200, body: sheetRows }).as("sheets");

    cy.visit("/activities");

    cy.get('[role="dialog"]').within(() => {
      cy.contains("Unique Activities").should("be.visible");
      // Deduped by activity_type: Reading appears once, Meditation once.
      cy.contains("li", "Reading").should("exist");
      cy.contains("li", "Meditation").should("exist");
      cy.get("li").should("have.length", 2);
    });
  });
});
