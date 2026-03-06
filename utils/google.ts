import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const APP_DIR = process.cwd();
const ROOT_DIR = process.env.OPENCLAW_CONFIG_DIR || path.resolve(APP_DIR, '..', 'openclaw-multi', 'ceo');
const GOOGLE_CREDS_PATH = path.join(ROOT_DIR, 'google-credentials.json');

// Scopes for Gmail and Calendar
const SCOPES = [
    'https://www.googleapis.com/auth/gmail.readonly',
    'https://www.googleapis.com/auth/gmail.send',
    'https://www.googleapis.com/auth/calendar.events',
];

export function getGoogleConfig() {
    if (!fs.existsSync(GOOGLE_CREDS_PATH)) return null;
    try {
        const raw = fs.readFileSync(GOOGLE_CREDS_PATH, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

export function saveGoogleTokens(tokens: any) {
    try {
        let creds: any = {};
        if (fs.existsSync(GOOGLE_CREDS_PATH)) {
            try { creds = JSON.parse(fs.readFileSync(GOOGLE_CREDS_PATH, 'utf-8')); } catch { }
        }

        creds.tokens = tokens;
        fs.writeFileSync(GOOGLE_CREDS_PATH, JSON.stringify(creds, null, 2));
    } catch (e) {
        console.error('Failed to save Google tokens:', e);
    }
}

export function saveGoogleCredentials(clientId: string, clientSecret: string) {
    try {
        let creds: any = {};
        if (fs.existsSync(GOOGLE_CREDS_PATH)) {
            try { creds = JSON.parse(fs.readFileSync(GOOGLE_CREDS_PATH, 'utf-8')); } catch { }
        }

        creds.clientId = clientId.trim().replace(/\/$/, '');
        creds.clientSecret = clientSecret.trim();
        fs.writeFileSync(GOOGLE_CREDS_PATH, JSON.stringify(creds, null, 2));
    } catch (e) {
        console.error('Failed to save Google credentials:', e);
    }
}

export function getOAuthClient() {
    const config = getGoogleConfig();
    if (!config || !config.clientId || !config.clientSecret) return null;

    // Standard Next.js redirect URI
    const redirectUri = process.env.DOMAIN
        ? `${process.env.DOMAIN}/api/auth/google/callback`
        : 'http://localhost:3000/api/auth/google/callback';

    // Robustly clean credentials
    const clientId = config.clientId.trim().replace(/\/$/, '');
    const clientSecret = config.clientSecret.trim();

    const oAuth2Client = new google.auth.OAuth2(
        clientId,
        clientSecret,
        redirectUri
    );

    if (config.tokens) {
        oAuth2Client.setCredentials(config.tokens);
    }

    return oAuth2Client;
}

export function getAuthUrl() {
    const oAuth2Client = getOAuthClient();
    if (!oAuth2Client) return null;

    return oAuth2Client.generateAuthUrl({
        access_type: 'offline', // Request refresh token
        scope: SCOPES,
        prompt: 'consent' // Force consent to ensure we get a refresh token
    });
}
