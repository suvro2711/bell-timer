/// <reference types="cypress" />

// Custom command to stub the auth status endpoint as an authenticated user.
Cypress.Commands.add("stubAuth", () => {
  cy.intercept("GET", "/api/auth/status", {
    statusCode: 200,
    body: {
      authenticated: true,
      oauthConfigured: true,
      user: {
        email: "tester@example.com",
        name: "Test User",
        picture: "",
      },
    },
  }).as("authStatus");
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /**
       * Stub the /api/auth/status endpoint as an authenticated user.
       */
      stubAuth(): Chainable<void>;
    }
  }
}

export {};
