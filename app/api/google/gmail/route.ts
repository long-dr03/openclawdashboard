import { NextResponse } from 'next/server';
import { getOAuthClient } from '@/utils/google';
import { google } from 'googleapis';

export async function GET() {
    try {
        const auth = getOAuthClient();
        if (!auth) {
            return NextResponse.json({ error: 'Google integration not configured' }, { status: 400 });
        }

        const gmail = google.gmail({ version: 'v1', auth });

        // List messages
        const res = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 5,
            q: 'in:inbox',
        });

        const messages = res.data.messages || [];

        // Fetch details for each message
        const emails = await Promise.all(messages.map(async (msg) => {
            const detail = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id!,
                format: 'metadata',
                metadataHeaders: ['From', 'Subject', 'Date'],
            });

            const headers = detail.data.payload?.headers || [];
            const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
            const from = headers.find(h => h.name === 'From')?.value || 'Unknown';
            const date = headers.find(h => h.name === 'Date')?.value || '';

            // Basic date formatting
            let time = '';
            try {
                const d = new Date(date);
                time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            } catch {
                time = date;
            }

            return {
                id: msg.id,
                from: from.replace(/<.*>/, '').trim(), // clean name
                subject,
                time,
                read: !detail.data.labelIds?.includes('UNREAD'),
                snippet: detail.data.snippet,
            };
        }));

        return NextResponse.json(emails);
    } catch (e: any) {
        console.error('Gmail API Error:', e);
        // Return empty list on error instead of 500 to keep UI alive
        return NextResponse.json({ error: e.message, emails: [] });
    }
}
