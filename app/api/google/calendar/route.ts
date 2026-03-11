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

        try {
            const res = await calendar.events.list({
                calendarId: 'primary',
                timeMin: now.toISOString(),
                timeMax: endOfDay.toISOString(),
                maxResults: 15,
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
        } catch (apiErr: any) {
            console.error('Calendar API Error Detail:', apiErr);
            if (apiErr.message?.includes('invalid_grant')) {
                return NextResponse.json({ error: 'Google session expired. Please reconnect.', needsAuth: true }, { status: 401 });
            }
            throw apiErr;
        }
    } catch (e: any) {
        console.error('Calendar API Error:', e);
        return NextResponse.json({ error: e.message, events: [] });
    }
}

export async function POST(req: Request) {
    try {
        const auth = getOAuthClient();
        if (!auth) {
            return NextResponse.json({ error: 'Google integration not configured' }, { status: 400 });
        }

        const { summary, description, startTime, endTime } = await req.json();
        const calendar = google.calendar({ version: 'v3', auth });

        const res = await calendar.events.insert({
            calendarId: 'primary',
            requestBody: {
                summary,
                description,
                start: { dateTime: startTime },
                end: { dateTime: endTime },
            },
        });

        return NextResponse.json({ success: true, id: res.data.id });
    } catch (e: any) {
        console.error('Calendar Add Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
