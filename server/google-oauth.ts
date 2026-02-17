import dotenv from 'dotenv';
dotenv.config();
import { google } from 'googleapis';

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expiry_date?: number;
  token_type?: string;
  scope?: string;
}

export interface GoogleUserInfo {
  email: string;
  name: string;
  picture?: string;
}

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
];

class GoogleOAuthService {
  private clientId: string;
  private clientSecret: string;
  private redirectUri: string;

  constructor() {
    this.clientId = process.env.GOOGLE_CLIENT_ID || '';
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
    this.redirectUri = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback';
  }

  isConfigured(): boolean {
    return !!(this.clientId && this.clientSecret);
  }

  /**
   * Create an OAuth2 client (without user tokens).
   */
  createOAuth2Client() {
    return new google.auth.OAuth2(
      this.clientId,
      this.clientSecret,
      this.redirectUri,
    );
  }

  /**
   * Create an OAuth2 client authenticated with the user's tokens.
   */
  createAuthenticatedClient(tokens: OAuthTokens) {
    const oauth2Client = this.createOAuth2Client();
    oauth2Client.setCredentials(tokens);

    // Listen for token refresh events so we can update stored tokens
    oauth2Client.on('tokens', (newTokens) => {
      console.log('OAuth tokens refreshed');
      // Merge new tokens (refresh_token is only sent on first authorization)
      if (newTokens.refresh_token) {
        tokens.refresh_token = newTokens.refresh_token;
      }
      tokens.access_token = newTokens.access_token!;
      tokens.expiry_date = newTokens.expiry_date!;
    });

    return oauth2Client;
  }

  /**
   * Generate the Google OAuth consent URL.
   */
  getAuthUrl(): string {
    const oauth2Client = this.createOAuth2Client();
    return oauth2Client.generateAuthUrl({
      access_type: 'offline', // Gets refresh_token
      prompt: 'consent',      // Force consent to always get refresh_token
      scope: SCOPES,
    });
  }

  /**
   * Exchange an authorization code for tokens.
   */
  async getTokensFromCode(code: string): Promise<OAuthTokens> {
    const oauth2Client = this.createOAuth2Client();
    const { tokens } = await oauth2Client.getToken(code);
    return tokens as OAuthTokens;
  }

  /**
   * Get user info from Google using the access token.
   */
  async getUserInfo(tokens: OAuthTokens): Promise<GoogleUserInfo> {
    const oauth2Client = this.createAuthenticatedClient(tokens);
    const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
    const { data } = await oauth2.userinfo.get();
    return {
      email: data.email || '',
      name: data.name || '',
      picture: data.picture || undefined,
    };
  }

  /**
   * Create a Google Sheets instance authenticated with the user's OAuth tokens.
   */
  createSheetsClient(tokens: OAuthTokens) {
    const oauth2Client = this.createAuthenticatedClient(tokens);
    return google.sheets({ version: 'v4', auth: oauth2Client });
  }

  /**
   * Check if the tokens are still valid (not expired).
   */
  isTokenValid(tokens: OAuthTokens): boolean {
    if (!tokens.access_token) return false;
    if (tokens.expiry_date && Date.now() >= tokens.expiry_date) {
      // Token expired, but if we have a refresh token we can refresh it
      return !!tokens.refresh_token;
    }
    return true;
  }
}

export const googleOAuthService = new GoogleOAuthService();
