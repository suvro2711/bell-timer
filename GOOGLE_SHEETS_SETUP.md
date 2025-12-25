# Google Sheets Integration for Bell Timer

## Setup Instructions

### 1. Create Google Cloud Project & Enable API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google Sheets API**:
   - Navigate to "APIs & Services" → "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

### 2. Create Service Account

1. Go to "APIs & Services" → "Credentials"
2. Click "Create Credentials" → "Service Account"
3. Enter a name (e.g., "bell-timer-sheets")
4. Grant the "Editor" role
5. Click "Done"

### 3. Generate Service Account Key

1. Click on the newly created service account
2. Go to the "Keys" tab
3. Click "Add Key" → "Create new key"
4. Select "JSON" format
5. Download the JSON file

### 4. Configure Environment Variables

1. Copy `.env.example` to `.env`
2. Open the downloaded JSON file and copy its entire content
3. Paste it as a single line in the `GOOGLE_SHEETS_CREDENTIALS` variable (keep the quotes)

### 5. Create and Share Google Sheet

1. Create a new Google Sheet at [sheets.google.com](https://sheets.google.com)
2. Share the sheet with the service account email (found in the JSON file as `client_email`)
   - Grant "Editor" permissions
3. Copy the Spreadsheet ID from the URL:
   - URL format: `https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit`
   - Example: If URL is `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
   - ID is: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`
4. Paste the ID in `GOOGLE_SHEETS_SPREADSHEET_ID` in your `.env` file

### 6. Start the Application

```bash
npm run dev
```

## Sheet Structure

The integration will automatically create the following columns in your sheet:

| Timestamp | Frequency | Interval (s) | Total Duration (s) | Duration (MM:SS) |
|-----------|-----------|--------------|-------------------|------------------|
| 2025-12-25T10:30:00.000Z | 5 | 10 | 50 | 0:50 |

## Notes

- The integration is optional. If not configured, the app will continue to work normally
- Session data is logged asynchronously and won't block the timer functionality
- Make sure to keep your service account credentials secure (never commit `.env` file)
