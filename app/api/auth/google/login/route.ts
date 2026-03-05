import { NextResponse } from 'next/server';
import { getAuthUrl, getGoogleConfig } from '@/utils/google';

export async function GET() {
    try {
        const config = getGoogleConfig();

        if (!config || !config.clientId || !config.clientSecret) {
            return NextResponse.json({
                error: 'Missing Google credentials. Please configure Client ID and Secret in settings.'
            }, { status: 400 });
        }

        const url = getAuthUrl();
        if (!url) {
            return NextResponse.json({ error: 'Failed to generate auth URL' }, { status: 500 });
        }

        // Return URL for frontend to redirect
        return NextResponse.json({ url });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
