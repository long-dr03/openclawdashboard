import { NextResponse } from 'next/server';
import { proxyToAgent } from '@/utils/proxy';
import fs from 'fs';
import path from 'path';

const CEO_DIR = process.env.OPENCLAW_CONFIG_DIR || path.resolve(process.cwd(), '..');
const CONFIG_PATH = path.join(CEO_DIR, 'config.json');
const STATE_DIR = path.join(CEO_DIR, 'state');

function readSessionData(agentId: string) {
    try {
        const dirs = [
            path.join(STATE_DIR, 'agents', agentId, 'sessions'),
            path.join(STATE_DIR, 'agents', 'main', 'sessions'),
        ];

        for (const dir of dirs) {
            const sessFile = path.join(dir, 'sessions.json');
            if (fs.existsSync(sessFile)) {
                const raw = fs.readFileSync(sessFile, 'utf-8');
                const sessions = JSON.parse(raw);

                let latest: any = null;
                let latestTime = 0;

                for (const [, sess] of Object.entries(sessions) as [string, any][]) {
                    if (sess.updatedAt && sess.updatedAt > latestTime) {
                        latestTime = sess.updatedAt;
                        latest = sess;
                    }
                }

                if (latest) {
                    return {
                        sessionId: latest.sessionId,
                        model: latest.model || null,
                        modelProvider: latest.modelProvider || null,
                        inputTokens: latest.inputTokens || 0,
                        outputTokens: latest.outputTokens || 0,
                        totalTokens: latest.totalTokens || 0,
                        updatedAt: latest.updatedAt || null,
                        lastChannel: latest.lastChannel || latest.origin?.provider || null,
                        chatType: latest.chatType || latest.origin?.chatType || null,
                    };
                }
            }
        }
    } catch (e: any) {
        console.warn(`[API /agents] Session read error for ${agentId}:`, e.message);
    }
    return null;
}

export async function GET(req: Request) {
    try {
        // 1. Try proxy first (for Vercel)
        const proxyResponse = await proxyToAgent(req, '/api/agents');
        if (proxyResponse) return proxyResponse;

        // 2. Fallback to local (for local dev)
        if (!fs.existsSync(CONFIG_PATH)) {
            return NextResponse.json([]);
        }

        const configRaw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const config = JSON.parse(configRaw);
        const rawAgents = config.agents?.list || [];

        const agents = rawAgents.map((agent: any) => {
            const bindings = (config.bindings || []).filter((b: any) => b.agentId === agent.id);
            const tgBinding = bindings.find((b: any) => b.match?.channel === 'telegram');
            const tgAccountId = tgBinding?.match?.accountId;
            const tgAccount = tgAccountId ? config.channels?.telegram?.accounts?.[tgAccountId] : null;
            const hasTgToken = tgAccount?.botToken ? tgAccount.botToken.length > 5 : false;
            const zaloBinding = bindings.find((b: any) => b.match?.channel === 'zalo');
            const hasZalo = !!zaloBinding;

            const session = readSessionData(agent.id);

            let role = 'General';
            if (agent.id === 'ceo') role = 'Orchestrator';
            else if (agent.id === 'sales') role = 'Sales & CRM';
            else if (agent.id === 'marketing') role = 'Marketing Research';
            else if (agent.id === 'devops') role = 'Infrastructure';

            return {
                id: agent.id,
                name: agent.identity?.name || agent.id,
                role,
                model: session?.model || config.agents?.defaults?.model?.primary?.split('/').pop() || 'unknown',
                modelProvider: session?.modelProvider || 'google',
                enabled: agent.enabled !== false,
                workspace: agent.workspace || `./workspaces/${agent.id}`,
                default: agent.default || false,
                telegramConnected: hasTgToken,
                zaloConnected: hasZalo,
                inputTokens: session?.inputTokens || 0,
                outputTokens: session?.outputTokens || 0,
                totalTokens: session?.totalTokens || 0,
                lastActive: session?.updatedAt ? new Date(session.updatedAt).toISOString() : null,
                lastChannel: session?.lastChannel || null,
                sessionId: session?.sessionId || null,
                toolsAllow: agent.tools?.allow || [],
            };
        });

        return NextResponse.json(agents);
    } catch (error: any) {
        console.error('[API /agents] Error:', error.message);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
