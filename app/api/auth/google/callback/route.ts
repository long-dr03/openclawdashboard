import { NextResponse } from 'next/server';
import { getOAuthClient, saveGoogleTokens } from '@/utils/google';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    if (error) {
        return NextResponse.json({ error: `Google Auth Error: ${error}` }, { status: 400 });
    }

    if (!code) {
        return NextResponse.json({ error: 'Missing authorization code' }, { status: 400 });
    }

    try {
        const oAuth2Client = getOAuthClient();
        if (!oAuth2Client) {
            throw new Error('OAuth client not initialized (missing credentials?)');
        }

        const { tokens } = await oAuth2Client.getToken(code);
        oAuth2Client.setCredentials(tokens);

        // Save tokens to config.json
        saveGoogleTokens(tokens);

        // Redirect back to settings with success param
        return NextResponse.redirect(new URL('/settings?google=connected', request.url));
    } catch (e: any) {
        console.error('Callback error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
