import { NextResponse } from 'next/server';
import { proxyToAgent } from '@/utils/proxy';
import { getOAuthClient } from '@/utils/google';
import { google } from 'googleapis';

export async function GET(req: Request) {
    try {
        // 1. Try proxy first (for Vercel)
        const proxyResponse = await proxyToAgent(req, '/api/google/gmail');
        if (proxyResponse) return proxyResponse;

        // 2. Local logic (for VPS)
        const auth = getOAuthClient();
        if (!auth) {
            return NextResponse.json({ error: 'Google integration not configured' }, { status: 400 });
        }

        const gmail = google.gmail({ version: 'v1', auth });

        const res = await gmail.users.messages.list({
            userId: 'me',
            maxResults: 10,
            q: 'is:unread',
        });

        const emails = [];
        const messages = res.data.messages || [];

        for (const msg of messages) {
            const details = await gmail.users.messages.get({
                userId: 'me',
                id: msg.id!,
                format: 'metadata',
                metadataHeaders: ['From', 'Subject', 'Date'],
            });

            const headers = details.data.payload?.headers || [];
            const from = headers.find(h => h.name === 'From')?.value || 'Unknown Sender';
            const subject = headers.find(h => h.name === 'Subject')?.value || '(No Subject)';
            const dateStr = headers.find(h => h.name === 'Date')?.value || '';

            let time = 'Recent';
            if (dateStr) {
                const d = new Date(dateStr);
                time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            }

            emails.push({
                id: msg.id,
                from: from.split('<')[0].trim(),
                subject,
                time,
                isUnread: true,
            });
        }

        return NextResponse.json(emails);
    } catch (e: any) {
        console.error('Gmail API Error:', e);
        return NextResponse.json({ error: e.message, emails: [] });
    }
}

export async function POST(req: Request) {
    try {
        const auth = getOAuthClient();
        if (!auth) {
            return NextResponse.json({ error: 'Google integration not configured' }, { status: 400 });
        }

        const { to, subject, body } = await req.json();
        const gmail = google.gmail({ version: 'v1', auth });

        // Helper to encode email
        const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const str = [
            `To: ${to}`,
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            `Subject: ${utf8Subject}`,
            '',
            body
        ].join('\r\n');

        const encodedMessage = Buffer.from(str)
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=+$/, '');

        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: { raw: encodedMessage }
        });

        return NextResponse.json({ success: true, id: res.data.id });
    } catch (e: any) {
        console.error('Gmail Send Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
