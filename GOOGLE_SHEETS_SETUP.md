# Google Sheets Integration for My Dashboard (OAuth)

## Setup Instructions

### 1. Create Google Cloud Project & Enable APIs

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the following APIs:
   - Navigate to "APIs & Services" → "Library"
   - Search for and enable **Google Sheets API**
   - Search for and enable **Google OAuth2 API** (People API)

### 2. Configure OAuth Consent Screen

1. Go to "APIs & Services" → "OAuth consent screen"
2. Choose **External** (or **Internal** if using Google Workspace)
3. Fill in the app name (e.g., "My Dashboard")
4. Add your email as a test user
5. Add the following scopes:
   - `https://www.googleapis.com/auth/spreadsheets`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

### 3. Create OAuth Client ID

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "OAuth client ID"
3. Choose **Web application**
4. Set:
   - **Name**: My Dashboard
   - **Authorized redirect URIs**: `http://localhost:5000/api/auth/google/callback`
   - For production, add your production URL too (e.g., `https://yourdomain.com/api/auth/google/callback`)
5. Click "Create"
6. Copy the **Client ID** and **Client Secret**

### 4. Configure Environment Variables

Update your `.env` file:

```env
GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret-here
GOOGLE_REDIRECT_URI=http://localhost:5000/api/auth/google/callback

# Generate a random session secret (e.g., run: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
SESSION_SECRET=your-random-session-secret

GOOGLE_SHEETS_SPREADSHEET_ID=your-spreadsheet-id
MY_STATS_SHEETS_SPREADSHEET_ID=your-stats-spreadsheet-id
```

### 5. Create Your Google Sheet

1. Create a new Google Sheet at [sheets.google.com](https://sheets.google.com)
2. Copy the Spreadsheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
3. Paste the ID in `GOOGLE_SHEETS_SPREADSHEET_ID` in your `.env` file
4. **No need to share the sheet** — OAuth uses your own Google account to access it!

### 6. Start the Application

```bash
npm run dev
```

Visit `http://localhost:5000` and click "Sign in with Google" to authenticate.

## How It Works

1. When you open the app, you'll see a login page
2. Click "Sign in with Google" to authenticate with your Google account
3. Google will ask you to grant permission to access your spreadsheets
4. After authentication, the app stores your OAuth tokens in a server-side session
5. All Google Sheets API calls use your OAuth tokens — your data stays in your own sheets

## OAuth Flow

```
User → "Sign in with Google" → Google Consent Screen → Callback → App
```

- **Access Token**: Used to make API calls (expires after ~1 hour)
- **Refresh Token**: Used to get new access tokens automatically
- **Session**: Stored server-side for 7 days

## Sheet Structure

The integration will automatically create year-based sheets (e.g., `Sessions_2026`) with these columns:

| Timestamp | Interval Frequency (min) | Timer (min) | Total Duration (s) | Duration (MM:SS) |
|-----------|--------------------------|-------------|---------------------|-------------------|
| 2026-02-17T10:30:00.000Z | 5 | 10 | 600 | 10:00 |

## API Endpoints

| Endpoint | Auth Required | Description |
|----------|---------------|-------------|
| `GET /api/auth/status` | No | Check authentication status |
| `GET /api/auth/google` | No | Start Google OAuth flow |
| `GET /api/auth/google/callback` | No | OAuth callback handler |
| `POST /api/auth/logout` | No | Log out and clear session |
| `GET /api/health` | Yes | Health check & sheets init |
| `POST /api/sessions` | Yes | Create a new session |
| `GET /api/sessions` | Yes | List sessions |
| `DELETE /api/sessions/:id` | Yes | Delete a session |
| `GET /api/activities` | Yes | Get activity data |
| `GET /api/sheets/:id/:name` | Yes | Generic sheet data fetch |

## Notes

- **No service account needed** — OAuth uses your own Google account
- Session data is logged asynchronously and won't block the timer
- OAuth tokens are stored server-side only (never sent to the browser)
- If you're in development, add your Google account as a test user in the OAuth consent screen
- Keep your `.env` file secure (never commit it)
