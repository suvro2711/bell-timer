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
  private readonly niharikaSpreadsheetId: string;
  private readonly taxonomySheetName = 'ActivityTaxonomy';
  private initializationSuccessful = false;

  constructor() {
    this.spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '';
    this.statsSpreadsheetId = process.env.MY_STATS_SHEETS_SPREADSHEET_ID || '';
    this.niharikaSpreadsheetId = process.env.NIHARIKA_DAILY_RATING_SHEETS_SPREADSHEET_ID || '';
  }

  private async getFirstSheetName(tokens: OAuthTokens, spreadsheetId: string): Promise<string> {
    const sheets = this.getSheetsClient(tokens);
    const metadata = await sheets.spreadsheets.get({ spreadsheetId });
    return metadata.data.sheets?.[0]?.properties?.title || 'Sheet1';
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

  async getNiharikaRatings(tokens: OAuthTokens, sheetName?: string): Promise<any[]> {
    if (!tokens || !this.niharikaSpreadsheetId) {
      console.log('Niharika spreadsheet not configured or not authenticated');
      return [];
    }

    const sheetsClient = this.getSheetsClient(tokens);
    const resolvedSheetName = sheetName || await this.getFirstSheetName(tokens, this.niharikaSpreadsheetId);

    try {
      const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.niharikaSpreadsheetId,
        range: `'${resolvedSheetName}'!A:Z`,
      });

      const rows = response.data.values || [];
      if (rows.length === 0) return [];

      const headers = rows[0].map((h: string) => h.trim().toLowerCase());

      return rows.slice(1).map((row, index) => {
        const item: Record<string, any> = { rowNumber: index + 2 };
        headers.forEach((header: string, colIndex: number) => {
          item[header] = row[colIndex] || '';
        });

        // Normalize potential misspellings and different header formats from source sheets
        if (!item.niharika_rating && item['niharika rating']) item.niharika_rating = item['niharika rating'];
        if (!item.good_action_shubhro && item['good action']) item.good_action_shubhro = item['good action'];
        if (!item.bad_action_shubhro && item['bad action']) item.bad_action_shubhro = item['bad action'];
        if (!item.shubro_rating && item['shubhro rating']) item.shubro_rating = item['shubhro rating'];
        if (!item.shubro_rating && item.shubhro_rating) item.shubro_rating = item.shubhro_rating;
        if (!item.shubhro_comments && item['comments']) item.shubhro_comments = item['comments'];
        if (!item.future_imporvement && item['future improvement']) item.future_imporvement = item['future improvement'];
        if (!item.future_imporvement && item.future_improvement) item.future_imporvement = item.future_improvement;
        if (!item.upset_reason && item['upset reason']) item.upset_reason = item['upset reason'];
        
        // Fallback: if upset_reason is still not set but there's data in column H (index 7)
        // and no header was defined for it, use it as upset_reason
        if (!item.upset_reason && row[7] && headers.length <= 7) {
          item.upset_reason = row[7];
        }

        // Calculate upset_count from upset_reason
        if (item.upset_reason) {
          const upsetStr = item.upset_reason as string;
          if (!upsetStr.includes('reason:') && !upsetStr.includes('intensity:')) {
            // Plain text entry
            item.upset_count = upsetStr.trim() ? 1 : 0;
          } else {
            // Formatted entry
            item.upset_count = upsetStr
              .split(',')
              .filter((entry: string) => entry.trim().includes('reason:'))
              .length;
          }
        } else {
          item.upset_count = 0;
        }

        return item;
      });
    } catch (error) {
      console.error('Error fetching Niharika ratings:', error);
      throw error;
    }
  }

  async createNiharikaRating(tokens: OAuthTokens, payload: {
    date: string;
    niharika_rating: number;
    good_action_shubhro: string;
    bad_action_shubhro: string;
    shubro_rating: number;
    shubhro_comments: string;
    future_imporvement: string;
    upset_reason: string;
    sheetName?: string;
  }): Promise<void> {
    if (!tokens || !this.niharikaSpreadsheetId) {
      throw new Error('Niharika spreadsheet not configured or not authenticated');
    }

    const sheetsClient = this.getSheetsClient(tokens);
    const resolvedSheetName = payload.sheetName || await this.getFirstSheetName(tokens, this.niharikaSpreadsheetId);

    // First, get the headers to find the correct columns
    const headerResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: this.niharikaSpreadsheetId,
      range: `'${resolvedSheetName}'!A1:Z1`,
    });

    let headers = headerResponse.data.values?.[0] || [];
    
    // If no headers, create them
    if (headers.length === 0) {
      headers = ['Date', 'Niharika Rating', 'Good Action', 'Bad Action', 'Shubhro Rating', 'Comments', 'Future Improvement', 'Upset Reason'];
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: this.niharikaSpreadsheetId,
        range: `'${resolvedSheetName}'!A1:H1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
    }

    // Find column indices
    const headerMap: Record<string, number> = {};
    headers.forEach((h: string, idx: number) => {
      headerMap[h.toLowerCase().trim()] = idx;
    });

    // If upset reason column doesn't exist, add it to headers
    if (headerMap['upset reason'] === undefined && headerMap['upset_reason'] === undefined) {
      headers.push('Upset Reason');
      headerMap['upset reason'] = headers.length - 1;
      
      // Update headers in sheet
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: this.niharikaSpreadsheetId,
        range: `'${resolvedSheetName}'!A1:Z1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
    }

    // Build row with correct column positions
    const maxCol = Math.max(
      headerMap['date'] ?? 0,
      headerMap['niharika rating'] ?? headerMap['niharika_rating'] ?? 1,
      headerMap['good action'] ?? headerMap['good_action_shubhro'] ?? 2,
      headerMap['bad action'] ?? headerMap['bad_action_shubhro'] ?? 3,
      headerMap['shubhro rating'] ?? headerMap['shubro_rating'] ?? 4,
      headerMap['comments'] ?? headerMap['shubhro_comments'] ?? 5,
      headerMap['future improvement'] ?? headerMap['future_imporvement'] ?? 6,
      headerMap['upset reason'] ?? headerMap['upset_reason'] ?? 7
    );

    const row = new Array(maxCol + 1).fill('');
    row[headerMap['date'] ?? 0] = payload.date;
    row[headerMap['niharika rating'] ?? headerMap['niharika_rating'] ?? 1] = payload.niharika_rating;
    row[headerMap['good action'] ?? headerMap['good_action_shubhro'] ?? 2] = payload.good_action_shubhro;
    row[headerMap['bad action'] ?? headerMap['bad_action_shubhro'] ?? 3] = payload.bad_action_shubhro;
    row[headerMap['shubhro rating'] ?? headerMap['shubro_rating'] ?? 4] = payload.shubro_rating;
    row[headerMap['comments'] ?? headerMap['shubhro_comments'] ?? 5] = payload.shubhro_comments;
    row[headerMap['future improvement'] ?? headerMap['future_imporvement'] ?? 6] = payload.future_imporvement;
    row[headerMap['upset reason'] ?? headerMap['upset_reason'] ?? 7] = payload.upset_reason;

    await sheetsClient.spreadsheets.values.append({
      spreadsheetId: this.niharikaSpreadsheetId,
      range: `'${resolvedSheetName}'!A:Z`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
  }

  async updateNiharikaRating(tokens: OAuthTokens, payload: {
    rowNumber: number;
    date: string;
    niharika_rating: number;
    good_action_shubhro: string;
    bad_action_shubhro: string;
    shubro_rating: number;
    shubhro_comments: string;
    future_imporvement: string;
    upset_reason: string;
    sheetName?: string;
  }): Promise<void> {
    if (!tokens || !this.niharikaSpreadsheetId) {
      throw new Error('Niharika spreadsheet not configured or not authenticated');
    }

    const sheetsClient = this.getSheetsClient(tokens);
    const resolvedSheetName = payload.sheetName || await this.getFirstSheetName(tokens, this.niharikaSpreadsheetId);

    // Get headers to find correct columns
    const headerResponse = await sheetsClient.spreadsheets.values.get({
      spreadsheetId: this.niharikaSpreadsheetId,
      range: `'${resolvedSheetName}'!A1:Z1`,
    });

    const headers = headerResponse.data.values?.[0] || [];
    
    // Find column indices
    const headerMap: Record<string, number> = {};
    headers.forEach((h: string, idx: number) => {
      headerMap[h.toLowerCase().trim()] = idx;
    });

    // If upset reason column doesn't exist, add it to headers
    if (headerMap['upset reason'] === undefined && headerMap['upset_reason'] === undefined) {
      headers.push('Upset Reason');
      headerMap['upset reason'] = headers.length - 1;
      
      // Update headers in sheet
      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: this.niharikaSpreadsheetId,
        range: `'${resolvedSheetName}'!A1:Z1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [headers],
        },
      });
    }

    // Build row with correct column positions
    const maxCol = Math.max(
      headerMap['date'] ?? 0,
      headerMap['niharika rating'] ?? headerMap['niharika_rating'] ?? 1,
      headerMap['good action'] ?? headerMap['good_action_shubhro'] ?? 2,
      headerMap['bad action'] ?? headerMap['bad_action_shubhro'] ?? 3,
      headerMap['shubhro rating'] ?? headerMap['shubro_rating'] ?? 4,
      headerMap['comments'] ?? headerMap['shubhro_comments'] ?? 5,
      headerMap['future improvement'] ?? headerMap['future_imporvement'] ?? 6,
      headerMap['upset reason'] ?? headerMap['upset_reason'] ?? 7
    );

    const row = new Array(maxCol + 1).fill('');
    row[headerMap['date'] ?? 0] = payload.date;
    row[headerMap['niharika rating'] ?? headerMap['niharika_rating'] ?? 1] = payload.niharika_rating;
    row[headerMap['good action'] ?? headerMap['good_action_shubhro'] ?? 2] = payload.good_action_shubhro;
    row[headerMap['bad action'] ?? headerMap['bad_action_shubhro'] ?? 3] = payload.bad_action_shubhro;
    row[headerMap['shubhro rating'] ?? headerMap['shubro_rating'] ?? 4] = payload.shubro_rating;
    row[headerMap['comments'] ?? headerMap['shubhro_comments'] ?? 5] = payload.shubhro_comments;
    row[headerMap['future improvement'] ?? headerMap['future_imporvement'] ?? 6] = payload.future_imporvement;
    row[headerMap['upset reason'] ?? headerMap['upset_reason'] ?? 7] = payload.upset_reason;

    await sheetsClient.spreadsheets.values.update({
      spreadsheetId: this.niharikaSpreadsheetId,
      range: `'${resolvedSheetName}'!A${payload.rowNumber}:Z${payload.rowNumber}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [row],
      },
    });
  }

  async deleteNiharikaRating(tokens: OAuthTokens, payload: {
    rowNumber: number;
    sheetName?: string;
  }): Promise<void> {
    if (!tokens || !this.niharikaSpreadsheetId) {
      throw new Error('Niharika spreadsheet not configured or not authenticated');
    }

    const sheetsClient = this.getSheetsClient(tokens);
    const resolvedSheetName = payload.sheetName || await this.getFirstSheetName(tokens, this.niharikaSpreadsheetId);

    const sheetMetadata = await sheetsClient.spreadsheets.get({
      spreadsheetId: this.niharikaSpreadsheetId,
    });

    const targetSheet = sheetMetadata.data.sheets?.find(
      (sheet) => sheet.properties?.title === resolvedSheetName,
    );

    const sheetId = targetSheet?.properties?.sheetId;
    if (sheetId === undefined) {
      throw new Error(`Could not find sheet ID for sheet: ${resolvedSheetName}`);
    }

    await sheetsClient.spreadsheets.batchUpdate({
      spreadsheetId: this.niharikaSpreadsheetId,
      requestBody: {
        requests: [
          {
            deleteDimension: {
              range: {
                sheetId,
                dimension: 'ROWS',
                startIndex: payload.rowNumber - 1,
                endIndex: payload.rowNumber,
              },
            },
          },
        ],
      },
    });
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

  /**
   * Returns the unique activity names logged across all monthly sheets in the
   * stats workbook (the same workbook used to save activity data).
   */
  async getUniqueActivities(tokens: OAuthTokens): Promise<string[]> {
    const activities = await this.getActivityData(tokens);
    const unique = new Set<string>();

    for (const activity of activities) {
      const name = typeof activity?.activityType === 'string' ? activity.activityType.trim() : '';
      if (name) unique.add(name);
    }

    return Array.from(unique).sort((a, b) => a.localeCompare(b));
  }

  /**
   * Ensures the ActivityTaxonomy sheet (with headers) exists in the stats workbook.
   */
  private async ensureTaxonomySheetExists(tokens: OAuthTokens): Promise<void> {
    if (!tokens || !this.statsSpreadsheetId) {
      throw new Error('Stats spreadsheet not configured or not authenticated');
    }

    const sheets = this.getSheetsClient(tokens);

    await this.retryOperation(async () => {
      const response = await sheets.spreadsheets.get({
        spreadsheetId: this.statsSpreadsheetId,
      });

      const existingSheets = response.data.sheets || [];
      const sheetExists = existingSheets.some(s => s.properties?.title === this.taxonomySheetName);

      if (!sheetExists) {
        await sheets.spreadsheets.batchUpdate({
          spreadsheetId: this.statsSpreadsheetId,
          requestBody: {
            requests: [{ addSheet: { properties: { title: this.taxonomySheetName } } }],
          },
        });

        await sheets.spreadsheets.values.update({
          spreadsheetId: this.statsSpreadsheetId,
          range: `'${this.taxonomySheetName}'!A1:C1`,
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['activity_name', 'group', 'tags_csv']],
          },
        });

        console.log(`Created taxonomy sheet: ${this.taxonomySheetName}`);
      }
    });
  }

  /**
   * Reads the saved activity group/tag mappings from the ActivityTaxonomy sheet.
   */
  async getActivityTaxonomy(tokens: OAuthTokens): Promise<Array<{ activity_name: string; group: string; tags: string[] }>> {
    if (!tokens || !this.statsSpreadsheetId) {
      console.log('Stats spreadsheet not configured or not authenticated');
      return [];
    }

    const sheetsClient = this.getSheetsClient(tokens);

    try {
      const response = await sheetsClient.spreadsheets.values.get({
        spreadsheetId: this.statsSpreadsheetId,
        range: `'${this.taxonomySheetName}'!A:C`,
      });

      const rows = response.data.values || [];
      if (rows.length <= 1) return [];

      const headers = (rows[0] || []).map((h: string) => (h || '').toString().trim().toLowerCase());
      const nameIdx = headers.indexOf('activity_name');
      const groupIdx = headers.indexOf('group');
      const tagsIdx = headers.indexOf('tags_csv');

      return rows.slice(1).reduce<Array<{ activity_name: string; group: string; tags: string[] }>>((acc, row) => {
        const activity_name = ((nameIdx >= 0 ? row[nameIdx] : row[0]) || '').toString().trim();
        if (!activity_name) return acc;

        const group = ((groupIdx >= 0 ? row[groupIdx] : row[1]) || '').toString().trim();
        const tagsCsv = ((tagsIdx >= 0 ? row[tagsIdx] : row[2]) || '').toString();
        const tags = tagsCsv
          .split(',')
          .map((tag: string) => tag.trim())
          .filter((tag: string) => tag.length > 0);

        acc.push({ activity_name, group, tags });
        return acc;
      }, []);
    } catch (error) {
      // Sheet likely does not exist yet — treat as empty.
      console.warn('Error fetching activity taxonomy (treating as empty):', error instanceof Error ? error.message : error);
      return [];
    }
  }

  /**
   * Overwrites the ActivityTaxonomy sheet with the provided mappings.
   */
  async saveActivityTaxonomy(
    tokens: OAuthTokens,
    entries: Array<{ activity_name: string; group: string; tags: string[] }>,
  ): Promise<void> {
    if (!tokens || !this.statsSpreadsheetId) {
      throw new Error('Stats spreadsheet not configured or not authenticated');
    }

    await this.ensureTaxonomySheetExists(tokens);

    const sheetsClient = this.getSheetsClient(tokens);

    const normalized = entries
      .map(entry => {
        const activity_name = (entry.activity_name || '').trim();
        const group = (entry.group || '').trim();
        const tags = Array.from(
          new Set((entry.tags || []).map(tag => tag.trim()).filter(tag => tag.length > 0)),
        );
        return { activity_name, group, tags };
      })
      .filter(entry => entry.activity_name.length > 0);

    const values = [
      ['activity_name', 'group', 'tags_csv'],
      ...normalized.map(entry => [entry.activity_name, entry.group, entry.tags.join(', ')]),
    ];

    await this.retryOperation(async () => {
      await sheetsClient.spreadsheets.values.clear({
        spreadsheetId: this.statsSpreadsheetId,
        range: `'${this.taxonomySheetName}'!A:C`,
      });

      await sheetsClient.spreadsheets.values.update({
        spreadsheetId: this.statsSpreadsheetId,
        range: `'${this.taxonomySheetName}'!A1`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values },
      });

      console.log(`Saved ${normalized.length} activity taxonomy entries`);
    });
  }
}

// Singleton instance
export const googleSheetsService = new GoogleSheetsService();
