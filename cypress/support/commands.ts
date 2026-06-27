/// <reference types="cypress" />

import { api } from "../../shared/routes";

// ─── stubAuth ─────────────────────────────────────────────────────────────────
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

// ─── interceptSave ────────────────────────────────────────────────────────────
// Schema-validated intercept for POST /api/activity-groups.
// Parses the request body against the REAL Zod schema and replies 400 if the
// payload is invalid, 200 otherwise.  This mirrors the server exactly, so any
// client↔schema drift causes Cypress tests to fail rather than silently pass.
Cypress.Commands.add("interceptSave", (alias = "saveGroups") => {
  cy.intercept("POST", "/api/activity-groups", (req) => {
    const result = api.activityGroups.save.input.safeParse(req.body);
    if (result.success) {
      req.reply({ statusCode: 200, body: { success: true } });
    } else {
      req.reply({
        statusCode: 400,
        body: { error: "Invalid input", details: result.error.errors },
      });
    }
  }).as(alias);
});

// ─── realLogin ────────────────────────────────────────────────────────────────
// Real interactive OAuth login via cy.session.
//
// HOW TO USE:
//   Run `npm run e2e:real` (opens cypress open with CYPRESS_REAL_E2E=1).
//   Before the first test, Cypress opens the Google sign-in page in its
//   browser window.  Complete the sign-in; the server session is established.
//   cy.session caches the auth cookie for the rest of the run.
//
// PREREQUISITES:
//   • MY_STATS_SHEETS_SPREADSHEET_ID in .env must point at a DEDICATED
//     throwaway test spreadsheet (not your real data).
//   • The dev server must be running (`npm run dev`).
//
// NOTE: chromeWebSecurity: false is set in cypress.config.ts to allow the
// cross-origin redirect to accounts.google.com.
Cypress.Commands.add("realLogin", () => {
  cy.session(
    "google-oauth",
    () => {
      // Navigate to the OAuth start – server 302s to Google's sign-in page.
      cy.visit("/api/auth/google");

      // We land on accounts.google.com.  Wait here (up to 3 minutes) while
      // the user completes sign-in; then Google redirects back to localhost.
      cy.origin("https://accounts.google.com", () => {
        // This assertion re-evaluates until the hostname is no longer Google's
        // (i.e. the redirect back to localhost has happened).
        cy.location("hostname", { timeout: 180_000 }).should(
          "not.include",
          "accounts.google.com",
        );
      });

      // Back on localhost – confirm the session cookie is set.
      cy.url({ timeout: 30_000 }).should("include", "localhost:5000");
      cy.request("/api/auth/status").its("body.authenticated").should("be.true");
    },
    {
      validate() {
        // If the session cookie is still valid, skip the full login flow.
        cy.request("/api/auth/status").its("body.authenticated").should("be.true");
      },
      cacheAcrossSpecs: true,
    },
  );
});

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Cypress {
    interface Chainable {
      /** Stub the /api/auth/status endpoint as an authenticated user. */
      stubAuth(): Chainable<void>;

      /**
       * Schema-validated intercept for POST /api/activity-groups.
       * Parses req.body against the real Zod schema; replies 400 on invalid
       * payloads and 200 on valid ones.  Defaults alias to "saveGroups".
       */
      interceptSave(alias?: string): Chainable<void>;

      /**
       * Real interactive OAuth login via cy.session.
       * Opens Google sign-in in the Cypress browser; user completes auth
       * manually.  Session is cached for the rest of the run.
       * Only use in the real integration spec (npm run e2e:real).
       */
      realLogin(): Chainable<void>;
    }
  }
}

export {};
