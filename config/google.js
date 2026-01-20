const { GoogleAuth } = require('google-auth-library');
const { google } = require('googleapis');
const path = require('path');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const CREDENTIALS = path.join(__dirname, 'svc.json');

GoogleSheet = async () => {
    const auth = await new GoogleAuth({
        keyFile: CREDENTIALS,
        scopes: SCOPES,
    });

    const sheets = google.sheets({
        version: 'v4',
        auth
    });

    return sheets;
}

module.exports = GoogleSheet;
