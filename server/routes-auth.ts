import { Express, Request, Response, NextFunction } from 'express';
import { googleOAuthService, OAuthTokens } from './google-oauth';

// Extend express-session types
declare module 'express-session' {
  interface SessionData {
    tokens?: OAuthTokens;
    user?: {
      email: string;
      name: string;
      picture?: string;
    };
  }
}

/**
 * Middleware to require OAuth authentication.
 * Attaches tokens to req for downstream use.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.tokens) {
    return res.status(401).json({ error: 'Not authenticated', authUrl: '/api/auth/google' });
  }

  if (!googleOAuthService.isTokenValid(req.session.tokens)) {
    // Clear invalid session
    req.session.destroy(() => {});
    return res.status(401).json({ error: 'Session expired', authUrl: '/api/auth/google' });
  }

  next();
}

/**
 * Helper to get tokens from session (use after requireAuth middleware).
 */
export function getTokensFromSession(req: Request): OAuthTokens {
  return req.session.tokens!;
}

/**
 * Register Google OAuth routes.
 */
export function registerAuthRoutes(app: Express) {
  // Check if OAuth is configured
  app.get('/api/auth/status', (req, res) => {
    const isAuthenticated = !!(req.session?.tokens && googleOAuthService.isTokenValid(req.session.tokens));
    
    res.json({
      authenticated: isAuthenticated,
      oauthConfigured: googleOAuthService.isConfigured(),
      user: isAuthenticated ? req.session.user : null,
    });
  });

  // Start Google OAuth flow
  app.get('/api/auth/google', (_req, res) => {
    if (!googleOAuthService.isConfigured()) {
      return res.status(500).json({ error: 'Google OAuth not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.' });
    }

    const authUrl = googleOAuthService.getAuthUrl();
    res.redirect(authUrl);
  });

  // Google OAuth callback
  app.get('/api/auth/google/callback', async (req, res) => {
    const code = req.query.code as string;

    if (!code) {
      return res.status(400).send('Missing authorization code');
    }

    try {
      // Exchange code for tokens
      const tokens = await googleOAuthService.getTokensFromCode(code);

      // Log granted scopes for debugging
      console.log('Granted OAuth scopes:', tokens.scope);
      if (tokens.scope && !tokens.scope.includes('spreadsheets')) {
        console.warn('WARNING: Spreadsheets scope was NOT granted! User may need to re-consent.');
      }

      // Get user info
      const userInfo = await googleOAuthService.getUserInfo(tokens);

      // Store in session
      req.session.tokens = tokens;
      req.session.user = userInfo;

      console.log(`User authenticated: ${userInfo.email}`);

      // Redirect to the app
      res.redirect('/');
    } catch (error) {
      console.error('OAuth callback error:', error);
      res.status(500).send('Authentication failed. Please try again.');
    }
  });

  // Logout
  app.post('/api/auth/logout', (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.json({ success: true });
    });
  });
}
