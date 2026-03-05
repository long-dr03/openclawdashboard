import { NextResponse } from 'next/server';
import { proxyToAgent } from '@/utils/proxy';
import fs from 'fs';
import path from 'path';

export async function GET(req: Request) {
    try {
        // 1. CHẾ ĐỘ VERCEL (PROXY): Gửi yêu cầu về VPS qua Cloudflare Tunnel
        const proxyResponse = await proxyToAgent(req, '/api/agents');
        if (proxyResponse) return proxyResponse;

        // 2. CHẾ ĐỘ LOCAL (TRÊN VPS): Tự tìm và đọc file cấu hình
        const getCEODir = () => {
            // Ưu tiên biến môi trường nếu có
            if (process.env.OPENCLAW_CONFIG_DIR) return process.env.OPENCLAW_CONFIG_DIR;
            
            // Các đường dẫn khả thi dựa trên cấu trúc bạn cung cấp
            const possible = [
                '/home/admin/openclaw-multi/ceo',                 // Đường dẫn tuyệt đối trên VPS admin
                path.resolve(process.cwd(), '../openclaw-multi/ceo'), // Ngang hàng với repo dashboard
                path.resolve(process.cwd(), '..'),                 // Trường hợp chạy bên trong folder ceo
                '/home/agent/openclaw-multi/ceo',                 // Dự phòng cho user agent
            ];
            
            for (const p of possible) {
                if (fs.existsSync(path.join(p, 'config.json'))) return p;
            }
            return possible[0];
        };

        const CEO_DIR = getCEODir();
        const CONFIG_PATH = path.join(CEO_DIR, 'config.json');
        const STATE_DIR = path.join(CEO_DIR, 'state');

        console.log('[API /agents] Scanning for config at:', CONFIG_PATH);

        if (!fs.existsSync(CONFIG_PATH)) {
            return NextResponse.json({ 
                error: "Config not found", 
                tried: CONFIG_PATH,
                msg: "Dashboard không tìm thấy file config.json của OpenClaw."
            }, { status: 404 });
        }

        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        const rawAgents = config.agents?.list || [];

        // Logic đọc session để biết trạng thái hoạt động (giữ nguyên như cũ)
        const readSessionData = (agentId: string) => {
            try {
                const dirs = [
                    path.join(STATE_DIR, 'agents', agentId, 'sessions'),
                    path.join(STATE_DIR, 'agents', 'main', 'sessions'),
                ];
                for (const dir of dirs) {
                    const sessFile = path.join(dir, 'sessions.json');
                    if (fs.existsSync(sessFile)) {
                        const sessions = JSON.parse(fs.readFileSync(sessFile, 'utf-8'));
                        let latest: any = null;
                        let latestTime = 0;
                        for (const [, sess] of Object.entries(sessions) as [string, any][]) {
                            if (sess.updatedAt && sess.updatedAt > latestTime) {
                                latestTime = sess.updatedAt;
                                latest = sess;
                            }
                        }
                        if (latest) return latest;
                    }
                }
            } catch (e) { }
            return null;
        };

        const agents = rawAgents.map((agent: any) => {
            const bindings = (config.bindings || []).filter((b: any) => b.agentId === agent.id);
            
            // Kiểm tra kết nối Telegram
            const tgBinding = bindings.find((b: any) => b.match?.channel === 'telegram');
            const tgAccountId = tgBinding?.match?.accountId;
            const tgAccount = tgAccountId ? config.channels?.telegram?.accounts?.[tgAccountId] : null;
            const hasTgToken = tgAccount?.botToken ? tgAccount.botToken.length > 5 : false;

            const session = readSessionData(agent.id);

            // Xác định vai trò
            let role = 'General Agent';
            if (agent.id === 'ceo') role = 'Supreme Orchestrator';
            else if (agent.id === 'sales') role = 'Sales & CRM';
            else if (agent.id === 'devops') role = 'Infrastructure';

            return {
                id: agent.id,
                name: agent.identity?.name || agent.id,
                role,
                model: session?.model || config.agents?.defaults?.model?.primary?.split('/').pop() || 'unknown',
                enabled: agent.enabled !== false,
                telegramConnected: hasTgToken,
                // Dữ liệu hoạt động (cho StatsCard)
                inputTokens: session?.inputTokens || 0,
                outputTokens: session?.outputTokens || 0,
                totalTokens: session?.totalTokens || 0,
                lastActive: session?.updatedAt ? new Date(session.updatedAt).toISOString() : null,
                lastChannel: session?.lastChannel || null,
                sessionId: session?.sessionId || null,
            };
        });

        return NextResponse.json(agents);
    } catch (error: any) {
        console.error('[API /agents] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
