import { NextResponse } from 'next/server';
import { proxyToAgent } from '@/utils/proxy';
import fs from 'fs';
import path from 'path';

const CEO_DIR = process.env.OPENCLAW_CONFIG_DIR || path.resolve(process.cwd(), '..', 'openclaw-multi', 'ceo');
const CONFIG_PATH = path.join(CEO_DIR, 'config.json');

export async function POST(request: Request) {
    try {
        // 1. Try proxy first (for Vercel)
        const proxyResponse = await proxyToAgent(request, '/api/broadcast');
        if (proxyResponse) return proxyResponse;

        // 2. Local logic
        const body = await request.clone().json();
        const { subject, message, priority, targets, agents: legacyAgents } = body;
        const recipients = targets || legacyAgents || [];

        if (!message || message.trim().length === 0) {
            return NextResponse.json({ success: false, error: 'Message content is required' }, { status: 400 });
        }

        let config: {
            gateway?: { auth?: { token?: string } };
            bindings?: { agentId: string; match?: { channel: string; accountId?: string } }[];
            channels?: { telegram?: { accounts?: Record<string, { botToken: string; allowFrom: string[] }> } };
        } = {};
        try {
            if (fs.existsSync(CONFIG_PATH)) {
                config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
            }
        } catch (e: unknown) {
            console.warn('[BROADCAST] Could not read config:', e);
        }

        const gatewayToken = config.gateway?.auth?.token || '';
        const results: {
            agentId: string;
            chatId?: string;
            method: string;
            success: boolean;
            error?: string | null;
            reply?: string | null;
        }[] = [];

        for (const targetId of recipients) {
            const bindings = (config.bindings || []).filter((b) => b.agentId === targetId);
            const tgBinding = bindings.find((b) => b.match?.channel === 'telegram');
            const zaloBinding = bindings.find((b) => b.match?.channel === 'zalo');

            const accountId = tgBinding?.match?.accountId;
            // Tìm kiếm sâu hơn trong accounts
            const telegramConfig = config.channels?.telegram as any;
            const tgAccount = accountId ? telegramConfig?.accounts?.[accountId] : telegramConfig;
            
            const botToken = tgAccount?.botToken;
            const allowedUsers = tgAccount?.allowFrom || [];

            if (botToken && botToken.length > 5 && allowedUsers && allowedUsers.length > 0) {
                for (const chatId of allowedUsers) {
                    try {
                        const text = subject
                            ? `📢 *${subject}*\n\n${message}\n\n_Priority: ${priority || 'normal'}_`
                            : `📢 ${message}`;

                        const telegramRes = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                chat_id: chatId,
                                text: text,
                                parse_mode: 'Markdown',
                            }),
                        });
                        const telegramData = (await telegramRes.json()) as { ok: boolean; description?: string };
                        results.push({
                            agentId: targetId,
                            chatId,
                            method: 'telegram',
                            success: telegramData.ok === true,
                            error: telegramData.ok ? null : telegramData.description,
                        });
                    } catch (tgErr: unknown) {
                        const errMsg = tgErr instanceof Error ? tgErr.message : String(tgErr);
                        results.push({ agentId: targetId, chatId, method: 'telegram', success: false, error: errMsg });
                    }
                }
            }

            if (zaloBinding && gatewayToken) {
                try {
                    const broadcastText = subject ? `📢 ${subject}\n\n${message}` : `📢 ${message}`;
                    const resp = await fetch('http://127.0.0.1:18789/v1/chat/completions', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${gatewayToken}`
                        },
                        body: JSON.stringify({
                            model: targetId,
                            messages: [{ role: "user", content: `[BROADCAST] ${broadcastText}` }],
                        })
                    });
                    const respData = (await resp.json()) as { choices?: { message?: { content?: string } }[] };
                    results.push({
                        agentId: targetId,
                        method: 'zalo-gateway',
                        success: resp.ok,
                        reply: respData.choices?.[0]?.message?.content?.substring(0, 100) || null,
                    });
                } catch (zaloErr: unknown) {
                    const errMsg = zaloErr instanceof Error ? zaloErr.message : String(zaloErr);
                    results.push({ agentId: targetId, method: 'zalo-gateway', success: false, error: errMsg });
                }
            }
        }

        return NextResponse.json({
            success: true,
            timestamp: new Date().toISOString(),
            recipientCount: recipients.length,
            sent: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length,
            results,
        });
    } catch (e: unknown) {
        console.error('[BROADCAST] Error:', e);
        const errMsg = e instanceof Error ? e.message : "Invalid request";
        return NextResponse.json({ success: false, error: errMsg }, { status: 400 });
    }
}
