import { google } from 'googleapis';
import { z } from 'zod';

// Schema for session data to be sent to Google Sheets
export const googleSheetsSessionSchema = z.object({
  frequency: z.number(),
  intervalSeconds: z.number(),
  timestamp: z.string(),
  totalDuration: z.number(),
});

export type GoogleSheetsSession = z.infer<typeof googleSheetsSessionSchema>;

// Initialize Google Sheets API
export class GoogleSheetsService {
  private sheets;
  private auth;
  private spreadsheetId: string;

  constructor() {
    // You'll need to set these environment variables
    const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS 
      ? JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS)
      : null;
    
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';

    if (credentials) {
      this.auth = new google.auth.GoogleAuth({
        credentials,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });
      
      this.sheets = google.sheets({ version: 'v4', auth: this.auth });
    }
  }

  async isConfigured(): Promise<boolean> {
    return !!this.sheets && !!this.spreadsheetId;
  }

  private getSheetName(): string {
    const year = new Date().getFullYear();
    return `Sessions_${year}`;
  }

  async ensureYearSheetExists(): Promise<void> {
    if (!await this.isConfigured()) {
      return;
    }

    const sheetName = this.getSheetName();

    try {
      // Get all sheets in the spreadsheet
      const response = await this.sheets!.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheets = response.data.sheets || [];
      const sheetExists = sheets.some(sheet => sheet.properties?.title === sheetName);

      if (!sheetExists) {
        // Create new sheet for this year
        await this.sheets!.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [
              {
                addSheet: {
                  properties: {
                    title: sheetName,
                  },
                },
              },
            ],
          },
        });

        console.log(`Created new sheet: ${sheetName}`);

        // Add headers to the new sheet
        await this.sheets!.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: `${sheetName}!A1:E1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['Timestamp', 'Frequency', 'Interval (s)', 'Total Duration (s)', 'Duration (MM:SS)']],
          },
        });

        console.log(`Initialized headers for ${sheetName}`);
      }
    } catch (error) {
      console.error('Error ensuring year sheet exists:', error);
      throw error;
    }
  }

  async appendSession(session: GoogleSheetsSession): Promise<void> {
    if (!await this.isConfigured()) {
      console.warn('Google Sheets not configured. Skipping...');
      return;
    }

    try {
      // Ensure the current year's sheet exists
      await this.ensureYearSheetExists();

      const sheetName = this.getSheetName();
      const values = [
        [
          session.timestamp,
          session.frequency,
          session.intervalSeconds,
          session.totalDuration,
          `${Math.floor(session.totalDuration / 60)}:${(session.totalDuration % 60).toString().padStart(2, '0')}`,
        ],
      ];

      await this.sheets!.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:E`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values,
        },
      });

      console.log(`Session successfully logged to Google Sheets (${sheetName})`);
    } catch (error) {
      console.error('Error writing to Google Sheets:', error);
      throw new Error('Failed to write to Google Sheets');
    }
  }

  async initializeSheet(): Promise<void> {
    if (!await this.isConfigured()) {
      return;
    }

    try {
      // Ensure current year's sheet exists with headers
      await this.ensureYearSheetExists();
    } catch (error) {
      console.error('Error initializing sheet:', error);
    }
  }
}

// Singleton instance
export const googleSheetsService = new GoogleSheetsService();
