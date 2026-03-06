import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CEO_DIR = process.env.OPENCLAW_CONFIG_DIR || path.resolve(process.cwd(), '..', 'openclaw-multi', 'ceo');
const CONFIG_PATH = path.join(CEO_DIR, 'config.json');

function getGatewayConfig() {
    try {
        if (fs.existsSync(CONFIG_PATH)) {
            const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
            return {
                port: config.gateway?.port || 18789,
                token: config.gateway?.auth?.token || '',
            };
        }
    } catch { }
    return { port: 18789, token: '' };
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const tags = body.tags || [];
        const tagStr = tags.length > 0 ? tags.join(', ') : 'Kinh tế, Công nghệ';
        
        const message = `Hãy tìm kiếm và tóm tắt các bản tin quan trọng nhất hiện nay về các chủ đề: ${tagStr}.`;

        const gw = getGatewayConfig();

        // Gửi lệnh tới Gateway qua OpenAI-compatible endpoint với timeout dài hơn
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 seconds timeout

        try {
            const response = await fetch(`http://127.0.0.1:${gw.port}/v1/chat/completions`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${gw.token}`
                },
                body: JSON.stringify({
                    model: 'ceo',
                    messages: [{ role: 'user', content: message }],
                }),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const err = await response.text();
                throw new Error(`Gateway error: ${err}`);
            }

            const result = await response.json() as { choices?: { message?: { content?: string } }[] };
            const summary = result.choices?.[0]?.message?.content || 'Không có kết quả';
            return NextResponse.json({ success: true, summary });
        } catch (fetchError: any) {
            if (fetchError.name === 'AbortError') {
                throw new Error('Gateway request timed out (agent is too slow)');
            }
            throw fetchError;
        }
    } catch (error: any) {
        console.error('News-now error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
