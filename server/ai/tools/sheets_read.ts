import { google } from 'googleapis';

export interface SheetsReadInput {
  spreadsheetId: string;
  range: string;
}

export interface SheetsReadResult {
  values: any[][];
  error?: string;
}

let sheets: any = null;

function initializeSheets() {
  if (sheets) return sheets;
  
  // Check for Google credentials
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.warn('Google Sheets API credentials not configured');
    return null;
  }
  
  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GOOGLE_CLIENT_EMAIL,
        private_key: process.env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      },
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });
    
    sheets = google.sheets({ version: 'v4', auth });
    return sheets;
  } catch (error) {
    console.error('Failed to initialize Google Sheets API:', error);
    return null;
  }
}

export async function sheets_read(input: SheetsReadInput): Promise<SheetsReadResult> {
  try {
    const sheetsApi = initializeSheets();
    if (!sheetsApi) {
      return {
        values: [],
        error: 'Google Sheets API not configured'
      };
    }
    
    const response = await sheetsApi.spreadsheets.values.get({
      spreadsheetId: input.spreadsheetId,
      range: input.range,
    });
    
    return {
      values: response.data.values || []
    };
    
  } catch (error: any) {
    return {
      values: [],
      error: error.message || 'Failed to read spreadsheet'
    };
  }
}