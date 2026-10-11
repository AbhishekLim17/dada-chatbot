const { google } = require('googleapis');
const { logError, logWarn } = require('./logger');

async function appendToSheet(row, targetTab = 'Leads') {
  if (!process.env.GOOGLE_SERVICE_ACCOUNT_JSON || !process.env.GOOGLE_SHEET_ID) {
    logWarn('SHEET_ERROR', 'Google Sheets not configured — skipping append.');
    return false;
  }

  try {
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    
    const spreadsheetInfo = await sheets.spreadsheets.get({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
    });
    const sheetsList = spreadsheetInfo.data.sheets || [];
    const hasTab = sheetsList.some(s => s.properties.title === targetTab);
    const targetRange = hasTab ? `${targetTab}!A:Z` : (sheetsList[0]?.properties?.title || 'Sheet1') + '!A:Z';

    await sheets.spreadsheets.values.append({
      spreadsheetId:   process.env.GOOGLE_SHEET_ID,
      range:           targetRange,
      valueInputOption: 'RAW',
      requestBody:     { values: [row] },
    });
    return true;
  } catch (err) {
    logError('SHEET_ERROR', `Google Sheets append failed for tab ${targetTab}`, err);
    return false;
  }
}

module.exports = { appendToSheet };
