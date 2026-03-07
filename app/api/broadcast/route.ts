import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = '/home/admin/openclaw-multi/ceo/config.json';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { subject, message, priority, targets } = body;
        
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        const results = [];

        if (!targets || targets.length === 0) {
            return NextResponse.json({ success: false, error: 'No targets specified' }, { status: 400 });
        }

        // Test connectivity
        try {
            await fetch('https://api.telegram.org', { method: 'HEAD' });
        } catch (connErr: any) {
            return NextResponse.json({ success: false, error: `Connectivity error: ${connErr.message}` }, { status: 500 });
        }

        for (const targetId of targets) {
            const binding = config.bindings?.find((b: any) => b.agentId === targetId && b.match?.channel === 'telegram');
            if (!binding) {
                results.push({ agentId: targetId, success: false, error: 'No telegram binding' });
                continue;
            }

            const accountId = binding.match.accountId;
            const tgAccount = config.channels?.telegram?.accounts?.[accountId];
            
            if (!tgAccount || !tgAccount.botToken) {
                results.push({ agentId: targetId, success: false, error: `Token missing for ${accountId}` });
                continue;
            }

            const chatIds = tgAccount.allowFrom || [];
            if (chatIds.length === 0) {
                results.push({ agentId: targetId, success: false, error: `allowFrom is empty for ${accountId}` });
                continue;
            }

            for (const chatId of chatIds) {
                try {
                    const text = `📢 *${subject || 'THÔNG BÁO'}*\n\n${message}\n\n_Ưu tiên: ${priority || 'Bình thường'}_`;
                    
                    const res = await fetch(`https://api.telegram.org/bot${tgAccount.botToken}/sendMessage`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            chat_id: String(chatId),
                            text: text,
                            parse_mode: 'Markdown'
                        })
                    });
                    
                    const data = await res.json();
                    results.push({ 
                        agentId: targetId, 
                        chatId: String(chatId), 
                        success: data.ok === true, 
                        error: data.ok ? null : data.description
                    });
                } catch (err: any) {
                    results.push({ agentId: targetId, chatId: String(chatId), success: false, error: err.message });
                }
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
}
