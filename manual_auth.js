
/* eslint-disable @typescript-eslint/no-require-imports */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const CONFIG_PATH = path.resolve(__dirname, '../config.json');

async function run() {
    try {
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const config = JSON.parse(raw);
        const googleConfig = config.skills.entries['google-integration'];
        
        if (!googleConfig) {
            console.error('No Google config found');
            return;
        }

        const clientId = googleConfig.clientId.trim().replace(/\/$/, '');
        const clientSecret = googleConfig.clientSecret.trim();
        const redirectUri = `${process.env.DOMAIN}/api/auth/google/callback` || 'http://localhost:3000/api/auth/google/callback';

        console.log('Client ID:', clientId);
        console.log('Redirect URI:', redirectUri);

        const oAuth2Client = new google.auth.OAuth2(
            clientId,
            clientSecret,
            redirectUri
        );

        const code = '4/0ASc3gC0M5UTTmI805sFLvXGXXtoxt0K_5Rqyhvok6bWFafVXEr-tHze6cHK8R_HKCiXdzQ'; // User provided code
        
        console.log('Exchanging code...');
        const { tokens } = await oAuth2Client.getToken(code);
        
        console.log('Tokens received!');
        console.log('Access Token:', tokens.access_token ? 'Yes' : 'No');
        console.log('Refresh Token:', tokens.refresh_token ? 'Yes' : 'No');

        // Save tokens
        googleConfig.tokens = tokens;
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        console.log('Saved tokens to config.json!');

    } catch (e) {
        console.error('Error:', e.message);
        if (e.response) {
            console.error('Response data:', e.response.data);
        }
    }
}

run();
