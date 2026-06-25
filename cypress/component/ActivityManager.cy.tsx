/// <reference types="cypress" />
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { getQueryFn } from "@/lib/queryClient";
import ActivityManager from "@/pages/ActivityManager";

const ACTIVITIES_URL = "/api/activity-taxonomy/activities";
const TAXONOMY_URL = "/api/activity-taxonomy";
const GROUPS_URL = "/api/activity-groups";

function mountPage() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { queryFn: getQueryFn({ on401: "throw" }), retry: false },
      mutations: { retry: false },
    },
  });

  cy.mount(
    <QueryClientProvider client={queryClient}>
      <ActivityManager />
      <Toaster />
    </QueryClientProvider>,
  );
}

describe("ActivityManager component", () => {
  it("renders unique activities returned by the API", () => {
    cy.intercept("GET", ACTIVITIES_URL, { statusCode: 200, body: ["Deep Work", "Run"] }).as(
      "uniqueActivities",
    );
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");
    cy.intercept("GET", GROUPS_URL, { statusCode: 200, body: ["Work", "Fitness"] }).as("groups");

    mountPage();
    cy.wait(["@uniqueActivities", "@taxonomy", "@groups"]);

    cy.get('[data-testid="activity-row-Deep Work"]').should("exist");
    cy.get('[data-testid="activity-row-Run"]').should("exist");
  });

  it("submits the correct payload with groups[], tags[], and is_background", () => {
    cy.intercept("GET", ACTIVITIES_URL, { statusCode: 200, body: ["Deep Work"] }).as(
      "uniqueActivities",
    );
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");
    cy.intercept("GET", GROUPS_URL, { statusCode: 200, body: ["Work", "Fitness"] }).as("groups");
    cy.intercept("POST", TAXONOMY_URL, { statusCode: 200, body: { success: true } }).as("save");

    mountPage();
    cy.wait(["@uniqueActivities", "@taxonomy", "@groups"]);

    // Pick group from restricted select
    cy.get('[data-testid="groups-select-Deep Work"]').find(".rs__control").click();
    cy.get(".rs__menu").contains("Work").click();

    // Create tags with creatable select
    cy.get('[data-testid="tags-select-Deep Work"]').find(".rs__control input").type("focus");
    cy.get(".rs__menu").contains('Add "focus"').click();
    cy.get('[data-testid="tags-select-Deep Work"]').find(".rs__control input").type("billable");
    cy.get(".rs__menu").contains('Add "billable"').click();

    // Toggle background checkbox
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
  });

  it("shows the empty state with no activities", () => {
    cy.intercept("GET", ACTIVITIES_URL, { statusCode: 200, body: [] }).as("uniqueActivities");
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");
    cy.intercept("GET", GROUPS_URL, { statusCode: 200, body: [] }).as("groups");

    mountPage();
    cy.wait(["@uniqueActivities", "@taxonomy", "@groups"]);

    cy.get('[data-testid="activities-empty"]').should("be.visible");
  });
});
