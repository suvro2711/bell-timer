import dotenv from 'dotenv';
dotenv.config();
import { sheets_v4 } from 'googleapis';
import { z } from 'zod';
import { googleOAuthService, OAuthTokens } from './google-oauth';

// Schema for session data to be sent to Google Sheets
export const googleSheetsSessionSchema = z.object({
  intervalFrequency: z.number(),
  timer: z.number(),
  timestamp: z.string(),
  totalDuration: z.number(),
});

export type GoogleSheetsSession = z.infer<typeof googleSheetsSessionSchema>;

/**
 * GoogleSheetsService now uses OAuth tokens from the user's session
 * instead of a static service account credential.
 * All methods that touch Sheets require tokens to be passed in.
 */
export class GoogleSheetsService {
  private readonly spreadsheetId: string;
  private readonly statsSpreadsheetId: string;
  private initializationSuccessful = false;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
    this.statsSpreadsheetId = process.env.MY_STATS_SHEETS_SPREADSHEET_ID || '';
  }

  private getSheetsClient(tokens: OAuthTokens): sheets_v4.Sheets {
    return googleOAuthService.createSheetsClient(tokens);
  }

  isConfigured(tokens?: OAuthTokens): boolean {
    return !!(tokens && this.spreadsheetId && googleOAuthService.isConfigured());
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

  async ensureYearSheetExists(tokens: OAuthTokens): Promise<void> {
    if (!this.isConfigured(tokens)) return;

    const sheets = this.getSheetsClient(tokens);
    const sheetName = this.getSheetName();

    await this.retryOperation(async () => {
      const response = await sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const existingSheets = response.data.sheets || [];
      const sheetExists = existingSheets.some(s => s.properties?.title === sheetName);

      if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.spreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: sheetName } } }],
          },
        });

        console.log(`Created new sheet: ${sheetName}`);

        await sheets.spreadsheets.values.update({
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

  async appendDataToSheet(
    tokens: OAuthTokens,
    spreadsheetId: string,
    sheetName: string,
    data: any[][]
  ): Promise<void> {
    if (!this.isConfigured(tokens)) {
      console.warn('Google Sheets not configured. Skipping...');
      return;
    }

    const sheets = this.getSheetsClient(tokens);

    await this.retryOperation(async () => {
      await sheets.spreadsheets.values.append({
        spreadsheetId,
        range: `${sheetName}`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: data },
      });
      console.log(`Data successfully appended to Google Sheets (${sheetName})`);
    });
  }

  async appendSession(tokens: OAuthTokens, session: GoogleSheetsSession): Promise<void> {
    if (!this.isConfigured(tokens)) {
      console.warn('Google Sheets not configured. Skipping...');
      return;
    }

    const sheets = this.getSheetsClient(tokens);

    await this.retryOperation(async () => {
      await this.ensureYearSheetExists(tokens);

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

      await sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A:E`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      console.log(`Session successfully logged to Google Sheets (${sheetName})`);
    });
  }

  async updateDataInSheet(
    tokens: OAuthTokens,
    spreadsheetId: string,
    sheetName: string,
    data: any[][],
    startCell: string = "A1"
  ): Promise<void> {
    if (!this.isConfigured(tokens)) {
      console.warn('Google Sheets not configured. Skipping...');
      return;
    }

    if (!data[0]) {
      console.warn('No data provided to updateDataInSheet.');
      return;
    }
    const firstRow = data[0];
    if (!firstRow) {
      console.warn('First row of data is undefined.');
      return;
    }
    const endCol = String.fromCodePoint("A".codePointAt(0)! + firstRow.length - 1);
    const endRow = (data.length) + (Number.parseInt(startCell.replaceAll(/\D/g, "")) || 1) - 1;
    const range = `${sheetName}!${startCell}:${endCol}${endRow}`;

    const sheets = this.getSheetsClient(tokens);

    await this.retryOperation(async () => {
      await sheets.spreadsheets.values.update({
        spreadsheetId,
        range,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: data },
      });
      console.log(`Data successfully updated in Google Sheets (${range})`);
    });
  }

  async initializeSheet(tokens: OAuthTokens): Promise<void> {
    if (!this.isConfigured(tokens)) {
      console.warn('Google Sheets not configured - missing tokens or spreadsheet ID');
      return;
    }

    // Skip if already successfully initialized
    if (this.initializationSuccessful) {
      console.log('Google Sheets already initialized');
      return;
    }

    console.log('Attempting to initialize Google Sheets...');

    try {
      await this.retryOperation(async () => {
        await this.ensureYearSheetExists(tokens);
      }, 5, 2000);

      this.initializationSuccessful = true;
      console.log('✓ Google Sheets initialized successfully');
    } catch (error) {
      console.error('✗ Failed to initialize Google Sheets after retries:', error instanceof Error ? error.message : error);
      // Don't throw - allow app to continue without sheets
    }
  }

  isInitialized(): boolean {
    return this.initializationSuccessful;
  }

  async getRecentSessions(tokens: OAuthTokens, limit: number = 50): Promise<GoogleSheetsSession[]> {
    if (!this.isConfigured(tokens)) return [];

    const sheets = this.getSheetsClient(tokens);

    try {
      const spreadsheet = await sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const existingSheets = spreadsheet.data.sheets || [];
      const yearSheets = existingSheets
        .map(s => s.properties?.title)
        .filter((title): title is string => !!title && title.startsWith('Sessions_'))
        .sort((a, b) => {
          const yearA = parseInt(a.split('_')[1]);
          const yearB = parseInt(b.split('_')[1]);
          return yearB - yearA;
        });

      console.log(`Found ${yearSheets.length} year sheets:`, yearSheets);

      let allSessions: GoogleSheetsSession[] = [];

      for (const sheetName of yearSheets) {
        try {
          const response = await sheets.spreadsheets.values.get({
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

      allSessions.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      const limitedSessions = allSessions.slice(0, limit);
      console.log(`Loaded ${limitedSessions.length} sessions from ${yearSheets.length} year sheets`);
      return limitedSessions;
    } catch (error) {
      console.error('Error reading from Google Sheets:', error);
      return [];
    }
  }

  async deleteSessionByTimestamp(tokens: OAuthTokens, timestamp: string): Promise<boolean> {
    if (!this.isConfigured(tokens)) return false;

    const sheets = this.getSheetsClient(tokens);

    try {
      const sessionDate = new Date(timestamp);
      const year = sessionDate.getFullYear();
      const sheetName = `Sessions_${year}`;

      const response = await sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: `${sheetName}!A2:E`,
      });

      const rows = response.data.values || [];
      const rowIndex = rows.findIndex(row => row[0] === timestamp);

      if (rowIndex === -1) {
        console.log(`Session with timestamp ${timestamp} not found in sheet ${sheetName}`);
        return false;
      }

      const sheetRowNumber = rowIndex + 2;

      const sheetMetadata = await sheets.spreadsheets.get({
        spreadsheetId: this.spreadsheetId,
      });

      const sheet = sheetMetadata.data.sheets?.find(s => s.properties?.title === sheetName);
      if (!sheet || !sheet.properties?.sheetId) {
        console.error('Could not find sheet ID');
        return false;
      }

      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: this.spreadsheetId,
        requestBody: {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheet.properties.sheetId,
                  dimension: 'ROWS',
                  startIndex: sheetRowNumber - 1,
                  endIndex: sheetRowNumber,
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

  async getActivityData(tokens: OAuthTokens): Promise<any[]> {
    if (!tokens || !this.statsSpreadsheetId) {
      console.log('Stats spreadsheet not configured or not authenticated');
      return [];
    }

    const sheetsClient = this.getSheetsClient(tokens);

    try {
      console.log('Fetching activity data from spreadsheet:', this.statsSpreadsheetId);

      const sheetsResponse = await sheetsClient.spreadsheets.get({
        spreadsheetId: this.statsSpreadsheetId,
      });

      const existingSheets = sheetsResponse.data.sheets || [];
      console.log('Found sheets:', existingSheets.map(s => s.properties?.title));
      const allActivities: any[] = [];

      for (const sheet of existingSheets) {
        const sheetName = sheet.properties?.title || '';
        console.log(`Reading from sheet: ${sheetName}`);

        const response = await sheetsClient.spreadsheets.values.get({
          spreadsheetId: this.statsSpreadsheetId,
          range: `'${sheetName}'!A:E`,
        });

        const rows = response.data.values || [];
        console.log(`Sheet ${sheetName} has ${rows.length} rows`);

        if (rows.length === 0) continue;

        const hasHeader = rows[0]?.some((cell: string) =>
          cell && typeof cell === 'string' &&
          ['Activity', 'Duration', 'From', 'To', 'Comment'].some(h =>
            cell.toLowerCase().includes(h.toLowerCase())
          )
        );

        const startRow = hasHeader ? 1 : 0;

        for (let i = startRow; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length < 3) continue;

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

  async getSheetData(tokens: OAuthTokens, spreadsheetId: string, sheetName: string): Promise<any[]> {
    if (!tokens) {
      throw new Error('Not authenticated');
    }

    const sheetsClient = this.getSheetsClient(tokens);

    try {
      console.log(`Fetching data from spreadsheet ${spreadsheetId}, sheet ${sheetName}`);

      const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId,
        range: `'${sheetName}'!A:Z`,
      });

      const rows = response.data.values || [];
      console.log(`Retrieved ${rows.length} rows`);

      if (rows.length === 0) return [];

      const hasHeader = rows[0]?.some((cell: string) =>
        cell && typeof cell === 'string' && cell.trim().length > 0
      );

      if (hasHeader) {
        const headers = rows[0];
        return rows.slice(1).map(row => {
          const obj: any = {};
          headers.forEach((header: string, index: number) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });
      } else {
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
