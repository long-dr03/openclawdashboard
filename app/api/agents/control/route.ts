import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);
const CEO_DIR = process.env.OPENCLAW_CONFIG_DIR || path.resolve(process.cwd(), '..');
const CONFIG_PATH = path.join(CEO_DIR, 'config.json');
const DISABLED_AGENTS_PATH = path.join(CEO_DIR, 'disabled-agents.json');

const PM2_PROCESS_NAME = 'openclaw-gateway';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { agentId, action } = body;

        if (!agentId || !action) {
            return NextResponse.json({ success: false, error: 'Missing agentId or action' }, { status: 400 });
        }

        console.log(`[Agent Control] Action: ${action} on agent: ${agentId}`);

        // === Action: restart-all ===
        if (action === 'restart-all') {
            try {
                const { stdout } = await execAsync(`pm2 restart ${PM2_PROCESS_NAME}`, { timeout: 10000 });
                return NextResponse.json({ success: true, message: 'OpenClaw Gateway restart triggered', output: stdout.trim() });
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                return NextResponse.json({ success: false, error: `PM2 restart failed: ${message}` }, { status: 500 });
            }
        }

        // === Action: restart ===
        if (action === 'restart') {
            try {
                const { stdout } = await execAsync(`pm2 restart ${PM2_PROCESS_NAME}`, { timeout: 10000 });
                return NextResponse.json({
                    success: true,
                    message: `Agent "${agentId}" process restarted (gateway restart)`,
                    output: stdout.trim(),
                });
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                return NextResponse.json({ success: false, error: `PM2 restart failed: ${message}` }, { status: 500 });
            }
        }

        // === Action: start/stop (Enable/Disable) ===
        if (['start', 'stop', 'enable', 'disable'].includes(action)) {
            const shouldEnable = action === 'start' || action === 'enable';
            return toggleAgentSafe(agentId, shouldEnable);
        }

        return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });

    } catch (error: unknown) {
        console.error('[Agent Control] Error:', error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

function toggleAgentSafe(agentId: string, shouldEnable: boolean) {
    try {
        if (!fs.existsSync(CONFIG_PATH)) {
            return NextResponse.json({ success: false, error: 'Config file not found at: ' + CONFIG_PATH }, { status: 404 });
        }

        const configRaw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const config = JSON.parse(configRaw);

        let disabledAgents: { id: string; [key: string]: unknown }[] = [];
        if (fs.existsSync(DISABLED_AGENTS_PATH)) {
            try { disabledAgents = JSON.parse(fs.readFileSync(DISABLED_AGENTS_PATH, 'utf-8')); } catch { }
        }

        const activeIndex = config.agents?.list?.findIndex((a: { id: string }) => a.id === agentId);
        const inactiveIndex = disabledAgents.findIndex((a: { id: string }) => a.id === agentId);

        if (shouldEnable) {
            if (activeIndex !== -1 && activeIndex !== undefined) {
                return NextResponse.json({ success: true, message: `Agent "${agentId}" is already enabled.` });
            }
            if (inactiveIndex !== -1) {
                const agent = disabledAgents[inactiveIndex];
                disabledAgents.splice(inactiveIndex, 1);
                delete agent.enabled;
                if (!config.agents) config.agents = { list: [] };
                if (!config.agents.list) config.agents.list = [];
                config.agents.list.push(agent);
            } else {
                return NextResponse.json({ success: false, error: `Agent "${agentId}" not found in disabled list` }, { status: 404 });
            }
        } else {
            if (inactiveIndex !== -1) {
                return NextResponse.json({ success: true, message: `Agent "${agentId}" is already disabled.` });
            }
            if (activeIndex !== -1 && activeIndex !== undefined) {
                const agent = config.agents.list[activeIndex];
                config.agents.list.splice(activeIndex, 1);
                delete agent.enabled;
                disabledAgents.push(agent);
            } else {
                return NextResponse.json({ success: false, error: `Agent "${agentId}" not found in active config` }, { status: 404 });
            }
        }

        config.meta = config.meta || {};
        config.meta.lastTouchedAt = new Date().toISOString();

        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        fs.writeFileSync(DISABLED_AGENTS_PATH, JSON.stringify(disabledAgents, null, 2));

        return NextResponse.json({
            success: true,
            message: `Agent "${agentId}" ${shouldEnable ? 'enabled' : 'disabled'} successfully. Restart PM2 to apply.`,
            requiresRestart: true
        });

    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ success: false, error: `Toggle failed: ${message}` }, { status: 500 });
    }
}
