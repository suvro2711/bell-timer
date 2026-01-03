import { google } from 'googleapis';
import { z } from 'zod';

// Schema for session data to be sent to Google Sheets
export const googleSheetsSessionSchema = z.object({
  intervalFrequency: z.number(),
  timer: z.number(),
  timestamp: z.string(),
  totalDuration: z.number(),
});

export type GoogleSheetsSession = z.infer<typeof googleSheetsSessionSchema>;

// Initialize Google Sheets API
export class GoogleSheetsService {
  private sheets;
  private auth;
  private spreadsheetId: string;
  private statsSpreadsheetId: string;
  private initializationAttempted = false;
  private initializationSuccessful = false;

  constructor() {
    // You'll need to set these environment variables
    const credentials = process.env.GOOGLE_SHEETS_CREDENTIALS 
      ? JSON.parse(process.env.GOOGLE_SHEETS_CREDENTIALS)
      : null;
    
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
    this.statsSpreadsheetId = process.env.MY_STATS_SHEETS_SPREADSHEET_ID || '';

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
            values: [['Timestamp', 'Interval Frequency (min)', 'Timer (min)', 'Total Duration (s)', 'Duration (MM:SS)']],
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
          session.intervalFrequency,
          session.timer,
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
      // Get all sheets to find year-based sheets
      const spreadsheet = await this.sheets!.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheets = spreadsheet.data.sheets || [];
      const yearSheets = sheets
        .map(sheet => sheet.properties?.title)
        .filter((title): title is string => {
          return !!title && title.startsWith('Sessions_');
        })
        .sort((a, b) => {
          const yearA = parseInt(a.split('_')[1]);
          const yearB = parseInt(b.split('_')[1]);
          return yearB - yearA; // Most recent year first
        });

      console.log(`Found ${yearSheets.length} year sheets:`, yearSheets);

      let allSessions: GoogleSheetsSession[] = [];

      // Read from each year sheet
      for (const sheetName of yearSheets) {
        try {
          const response = await this.sheets!.spreadsheets.values.get({
            spreadsheetId: this.spreadsheetId,
            range: `${sheetName}!A2:E`,
          });

          const rows = response.data.values || [];
          
          const sessions = rows
            .map(row => {
              if (row.length < 4) return null;
              
              return {
                timestamp: row[0],
                intervalFrequency: parseInt(row[1]),
                timer: parseInt(row[2]),
                totalDuration: parseInt(row[3]),
              };
            })
            .filter((session): session is GoogleSheetsSession => session !== null);

          allSessions = allSessions.concat(sessions);
        } catch (error) {
          console.warn(`Error reading sheet ${sheetName}:`, error);
        }
      }

      // Sort by timestamp (most recent first) and limit
      allSessions.sort((a, b) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      });

      const limitedSessions = allSessions.slice(0, limit);
      console.log(`Loaded ${limitedSessions.length} sessions from ${yearSheets.length} year sheets`);
      return limitedSessions;
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
      // Extract year from timestamp to find the correct sheet
      const sessionDate = new Date(timestamp);
      const year = sessionDate.getFullYear();
      const sheetName = `Sessions_${year}`;
      
      // Get all rows to find the matching timestamp
      const response = await this.sheets!.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A2:E`,
      });

      const rows = response.data.values || [];
      
      // Find the row index (1-based, +1 for header, +1 for 0-based to 1-based)
      const rowIndex = rows.findIndex(row => row[0] === timestamp);
      
      if (rowIndex === -1) {
        console.log(`Session with timestamp ${timestamp} not found in sheet ${sheetName}`);
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

  // Fetch activity data from stats spreadsheet
  async getActivityData(): Promise<any[]> {
    if (!this.sheets || !this.statsSpreadsheetId) {
      console.log('Stats spreadsheet not configured');
      return [];
    }

    try {
      console.log('Fetching activity data from spreadsheet:', this.statsSpreadsheetId);
      
      // Get all sheet names
      const sheetsResponse = await this.sheets.spreadsheets.get({
        spreadsheetId: this.statsSpreadsheetId,
      });

      const sheets = sheetsResponse.data.sheets || [];
      console.log('Found sheets:', sheets.map(s => s.properties?.title));
      const allActivities: any[] = [];

      // Read from all sheets
      for (const sheet of sheets) {
        const sheetName = sheet.properties?.title || '';
        console.log(`Reading from sheet: ${sheetName}`);
        
        // Read the data from this sheet
        const response = await this.sheets.spreadsheets.values.get({
          spreadsheetId: this.statsSpreadsheetId,
          range: `'${sheetName}'!A:E`, // Activity type, Duration(hours), From, To, Comment
        });

        const rows = response.data.values || [];
        console.log(`Sheet ${sheetName} has ${rows.length} rows`);
        
        // Skip if no data
        if (rows.length === 0) continue;

        // Check if first row is a header
        const hasHeader = rows[0]?.some((cell: string) => 
          cell && typeof cell === 'string' && 
          ['Activity', 'Duration', 'From', 'To', 'Comment'].some(h => 
            cell.toLowerCase().includes(h.toLowerCase())
          )
        );

        const startRow = hasHeader ? 1 : 0;
        console.log(`Sheet ${sheetName} header: ${hasHeader}, starting from row ${startRow}`);

        // Parse rows
        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 3) continue; // Need at least activity, duration, from

          const [activityType, durationStr, fromStr, toStr, comment] = row;
          
          if (!activityType || !fromStr) continue;

          allActivities.push({
            activityType: activityType.trim(),
            duration: durationStr?.trim() || '00:00',
            from: fromStr.trim(),
            to: toStr?.trim() || fromStr.trim(),
            comment: comment?.trim() || '',
          });
        }
      }

      console.log(`Total activities fetched: ${allActivities.length}`);
      return allActivities;
    } catch (error) {
      console.error('Error fetching activity data:', error);
      return [];
    }
  }

  // Generic method to fetch data from any spreadsheet/sheet
  async getSheetData(spreadsheetId: string, sheetName: string): Promise<any[]> {
    if (!this.sheets) {
      throw new Error('Google Sheets not configured');
    }

    try {
      console.log(`Fetching data from spreadsheet ${spreadsheetId}, sheet ${sheetName}`);
      
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: spreadsheetId,
        range: `'${sheetName}'!A:Z`, // Read all columns
      });

      const rows = response.data.values || [];
      console.log(`Retrieved ${rows.length} rows`);
      
      if (rows.length === 0) {
        return [];
      }

      // Check if first row is a header
      const hasHeader = rows[0]?.some((cell: string) => 
        cell && typeof cell === 'string' && cell.trim().length > 0
      );

      if (hasHeader) {
        // Return as array of objects with headers as keys
        const headers = rows[0];
        return rows.slice(1).map(row => {
          const obj: any = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });
      } else {
        // Return raw rows
        return rows;
      }
    } catch (error) {
      console.error(`Error fetching sheet data:`, error);
      throw error;
    }
  }
}

// Singleton instance
export const googleSheetsService = new GoogleSheetsService();
