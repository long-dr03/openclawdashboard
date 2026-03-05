import { NextResponse } from 'next/server';
import { proxyToAgent } from '@/utils/proxy';
import { getOAuthClient } from '@/utils/google';
import { google } from 'googleapis';

export async function GET(req: Request) {
    try {
        // 1. Try proxy first (for Vercel)
        const proxyResponse = await proxyToAgent(req, '/api/google/calendar');
        if (proxyResponse) return proxyResponse;

        // 2. Local logic (for VPS)
        const auth = getOAuthClient();
        if (!auth) {
            return NextResponse.json({ error: 'Google integration not configured' }, { status: 400 });
        }

        const calendar = google.calendar({ version: 'v3', auth });
        const now = new Date();
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const res = await calendar.events.list({
            calendarId: 'primary',
            timeMin: now.toISOString(),
            timeMax: endOfDay.toISOString(),
            maxResults: 10,
            singleEvents: true,
            orderBy: 'startTime',
        });

        const events = (res.data.items || []).map(event => {
            const start = event.start?.dateTime || event.start?.date;
            let time = 'All Day';
            if (event.start?.dateTime) {
                const d = new Date(event.start.dateTime);
                time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            return {
                id: event.id,
                title: event.summary || '(No Title)',
                time,
                link: event.htmlLink,
                type: 'meeting',
            };
        });

        return NextResponse.json(events);
    } catch (e: any) {
        console.error('Calendar API Error:', e);
        return NextResponse.json({ error: e.message, events: [] });
    }
}
