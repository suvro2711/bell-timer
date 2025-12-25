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
  private initializationAttempted = false;
  private initializationSuccessful = false;

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

  private async retryOperation<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000
  ): Promise<T> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        console.warn(`Attempt ${attempt}/${maxRetries} failed:`, error);
        
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, delayMs * attempt));
        }
      }
    }
    
    throw lastError;
  }

  async ensureYearSheetExists(): Promise<void> {
    if (!await this.isConfigured()) {
      return;
    }

    const sheetName = this.getSheetName();

    await this.retryOperation(async () => {
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
    });
  }

  async appendSession(session: GoogleSheetsSession): Promise<void> {
    if (!await this.isConfigured()) {
      console.warn('Google Sheets not configured. Skipping...');
      return;
    }

    await this.retryOperation(async () => {
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
    });
  }

  async initializeSheet(): Promise<void> {
    if (!await this.isConfigured()) {
      console.warn('Google Sheets not configured - skipping initialization');
      return;
    }

    // Prevent multiple simultaneous initialization attempts
    if (this.initializationAttempted) {
      console.log('Sheet initialization already attempted');
      return;
    }

    this.initializationAttempted = true;

    try {
      await this.retryOperation(async () => {
        await this.ensureYearSheetExists();
      }, 5, 2000); // 5 retries with 2 second base delay
      
      this.initializationSuccessful = true;
      console.log('Google Sheets initialized successfully');
    } catch (error) {
      console.error('Failed to initialize Google Sheets after retries:', error);
      // Don't throw - allow app to continue without sheets
    }
  }

  isInitialized(): boolean {
    return this.initializationSuccessful;
  }

  async getRecentSessions(limit: number = 50): Promise<GoogleSheetsSession[]> {
    if (!await this.isConfigured()) {
      return [];
    }

    try {
      const sheetName = this.getSheetName();
      
      // Read all data from the sheet (skip header row)
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A2:E`,
      });

      const rows = response.data.values || [];
      
      // Convert rows to session objects and take the most recent ones
      const sessions: GoogleSheetsSession[] = rows
        .map(row => {
          if (row.length < 4) return null;
          
          return {
            timestamp: row[0],
            frequency: parseInt(row[1]),
            intervalSeconds: parseInt(row[2]),
            totalDuration: parseInt(row[3]),
          };
        })
        .filter((session): session is GoogleSheetsSession => session !== null)
        .reverse() // Most recent first
        .slice(0, limit);

      console.log(`Loaded ${sessions.length} sessions from Google Sheets`);
      return sessions;
    } catch (error) {
      console.error('Error reading from Google Sheets:', error);
      return [];
    }
  }

  async deleteSessionByTimestamp(timestamp: string): Promise<boolean> {
    if (!await this.isConfigured()) {
      return false;
    }

    try {
      const sheetName = this.getSheetName();
      
      // Get all rows to find the matching timestamp
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A2:E`,
      });

      const rows = response.data.values || [];
      
      // Find the row index (1-based, +1 for header, +1 for 0-based to 1-based)
      const rowIndex = rows.findIndex(row => row[0] === timestamp);
      
      if (rowIndex === -1) {
        console.log(`Session with timestamp ${timestamp} not found in sheet`);
        return false;
      }
      
      // Calculate actual row number in sheet (header is row 1, data starts at row 2)
      const sheetRowNumber = rowIndex + 2;
      
      // Get the sheet ID
      const sheetMetadata = await this.sheets!.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });
      
      const sheet = sheetMetadata.data.sheets?.find(s => s.properties?.title === sheetName);
      if (!sheet || !sheet.properties?.sheetId) {
        console.error('Could not find sheet ID');
        return false;
      }
      
      // Delete the row
      await this.sheets!.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheet.properties.sheetId,
                  dimension: 'ROWS',
                  startIndex: sheetRowNumber - 1, // 0-based for API
                  endIndex: sheetRowNumber, // Exclusive end
                },
              },
            },
          ],
        },
      });

      console.log(`Deleted row ${sheetRowNumber} from ${sheetName}`);
      return true;
    } catch (error) {
      console.error('Error deleting from Google Sheets:', error);
      return false;
    }
  }
}

// Singleton instance
export const googleSheetsService = new GoogleSheetsService();
