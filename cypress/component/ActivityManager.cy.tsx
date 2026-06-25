/// <reference types="cypress" />
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { getQueryFn } from "@/lib/queryClient";
import ActivityManager from "@/pages/ActivityManager";

const ACTIVITIES_URL = "/api/activity-taxonomy/activities";
const TAXONOMY_URL = "/api/activity-taxonomy";

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
    cy.intercept("GET", ACTIVITIES_URL, {
      statusCode: 200,
      body: ["Deep Work", "Run"],
    }).as("uniqueActivities");
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");

    mountPage();
    cy.wait(["@uniqueActivities", "@taxonomy"]);

    cy.get('[data-testid="activity-row-Deep Work"]').should("exist");
    cy.get('[data-testid="activity-row-Run"]').should("exist");
  });

  it("submits the normalized save payload", () => {
    cy.intercept("GET", ACTIVITIES_URL, { statusCode: 200, body: ["Deep Work"] }).as(
      "uniqueActivities",
    );
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");
    cy.intercept("POST", TAXONOMY_URL, { statusCode: 200, body: { success: true } }).as("save");

    mountPage();
    cy.wait(["@uniqueActivities", "@taxonomy"]);

    cy.get('[data-testid="group-input-Deep Work"]').clear().type("Work");
    cy.get('[data-testid="tags-input-Deep Work"]').clear().type("focus, focus, billable");
    cy.get('[data-testid="save-button"]').click();

    cy.wait("@save").its("request.body").should("deep.equal", {
      entries: [{ activity_name: "Deep Work", group: "Work", tags: ["focus", "billable"] }],
    });
  });

  it("shows the empty state with no activities", () => {
    cy.intercept("GET", ACTIVITIES_URL, { statusCode: 200, body: [] }).as("uniqueActivities");
    cy.intercept("GET", TAXONOMY_URL, { statusCode: 200, body: [] }).as("taxonomy");

    mountPage();
    cy.wait(["@uniqueActivities", "@taxonomy"]);

    cy.get('[data-testid="activities-empty"]').should("be.visible");
  });
});
