const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

async function test() {
    try {
        const creds = JSON.parse(fs.readFileSync('/home/admin/openclaw-multi/ceo/google-credentials.json'));
        const oauth2Client = new google.auth.OAuth2(
            creds.clientId,
            creds.clientSecret
        );
        oauth2Client.setCredentials(creds.tokens);

        const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
        const res = await gmail.users.labels.list({ userId: 'me' });
        console.log('✅ Google API Success! Labels found:', res.data.labels.length);
    } catch (e) {
        console.error('❌ Google API Error:', e.message);
    }
}

test();
