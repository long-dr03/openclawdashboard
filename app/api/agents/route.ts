import { NextResponse } from 'next/server';
import { proxyToAgent } from '@/utils/proxy';
import fs from 'fs';
import path from 'path';
import { AppConfig, AgentConfig, SessionData } from '@/utils/types';

interface AgentInfo {
    id: string;
    name: string;
    role: string;
    model: string;
    enabled: boolean;
    telegramConnected: boolean;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    lastActive: string | null;
    lastChannel: string | null;
    sessionId: string | null;
    folder: string;
}

export async function GET(req: Request) {
    try {
        // 1. CHẾ ĐỘ VERCEL (PROXY): Gửi yêu cầu về VPS qua Cloudflare Tunnel
        const proxyResponse = await proxyToAgent(req, '/api/agents');
        if (proxyResponse) return proxyResponse;

        // 2. CHẾ ĐỘ LOCAL (TRÊN VPS): Tự tìm và đọc file cấu hình
        const MULTI_ROOT = '/home/admin/openclaw-multi';
        const agentFolders = ['ceo', 'devops', 'sales'];
        const allAgents: AgentInfo[] = [];

        for (const folder of agentFolders) {
            const CEO_DIR = path.join(MULTI_ROOT, folder);
            const CONFIG_PATH = path.join(CEO_DIR, 'config.json');
            const STATE_DIR = path.join(CEO_DIR, 'state');

            if (!fs.existsSync(CONFIG_PATH)) continue;

            try {
                const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')) as AppConfig;
                const rawAgents = config.agents?.list || [];

                // Logic đọc session để biết trạng thái hoạt động
                const readSessionData = (agentId: string): SessionData | null => {
                    try {
                        const dirs = [
                            path.join(STATE_DIR, 'agents', agentId, 'sessions'),
                            path.join(STATE_DIR, 'agents', 'main', 'sessions'),
                            path.join(STATE_DIR, 'sessions'), // Một số bản custom có thể để ở đây
                        ];
                        for (const dir of dirs) {
                            const sessFile = path.join(dir, 'sessions.json');
                            if (fs.existsSync(sessFile)) {
                                const sessions = JSON.parse(fs.readFileSync(sessFile, 'utf-8')) as Record<string, SessionData>;
                                let latest: SessionData | null = null;
                                let latestTime = 0;
                                for (const sess of Object.values(sessions)) {
                                    if (sess.updatedAt && sess.updatedAt > latestTime) {
                                        latestTime = sess.updatedAt;
                                        latest = sess;
                                    }
                                }
                                if (latest) return latest;
                            }
                        }
                    } catch { }
                    return null;
                };

                rawAgents.forEach((agent: AgentConfig) => {
                    const bindings = (config.bindings || []) as any[];
                    const agentBindings = bindings.filter((b: any) => b.agentId === agent.id);
                    
                    // Kiểm tra kết nối Telegram (hỗ trợ cả config cũ và mới)
                    const tgBinding = agentBindings.find((b: any) => b.match?.channel === 'telegram');
                    const tgAccountId = tgBinding?.match?.accountId;
                    const telegramConfig = config.channels?.telegram as any;
                    const tgAccount = tgAccountId ? telegramConfig?.accounts?.[tgAccountId] : telegramConfig;
                    const hasTgToken = tgAccount?.botToken ? tgAccount.botToken.length > 5 : false;

                    const session = readSessionData(agent.id);

                    // Xác định vai trò
                    let role = 'General Agent';
                    if (agent.id === 'ceo') role = 'Supreme Orchestrator';
                    else if (agent.id === 'sales') role = 'Sales & CRM';
                    else if (agent.id === 'devops') role = 'Infrastructure';

                    allAgents.push({
                        id: agent.id,
                        name: (agent.identity?.name as string) || agent.id,
                        role,
                        model: session?.model || (config.agents?.defaults?.model?.primary as string)?.split('/').pop() || 'unknown',
                        enabled: agent.enabled !== false,
                        telegramConnected: hasTgToken,
                        inputTokens: session?.inputTokens || 0,
                        outputTokens: session?.outputTokens || 0,
                        totalTokens: session?.totalTokens || 0,
                        lastActive: session?.updatedAt ? new Date(session.updatedAt).toISOString() : null,
                        lastChannel: session?.lastChannel || null,
                        sessionId: session?.sessionId || null,
                        folder: folder // Lưu vết thư mục
                    });
                });
            } catch (err) {
                console.error(`Error reading config in ${folder}:`, err);
            }
        }

        // Lọc bỏ các agent trùng ID (nếu có)
        const uniqueAgents = Array.from(new Map(allAgents.map(a => [a.id, a])).values());
        return NextResponse.json(uniqueAgents);

    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        console.error('[API /agents] Error:', msg);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
