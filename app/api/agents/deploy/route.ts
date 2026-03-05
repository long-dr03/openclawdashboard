import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define paths relative to the Next.js app
const APP_DIR = process.cwd(); // .../workspaces/ceo/my-app
const CEO_DIR = process.env.OPENCLAW_CONFIG_DIR || path.resolve(process.cwd(), '..');
const CONFIG_PATH = path.join(CEO_DIR, 'config.json');
const WORKSPACES_DIR = path.join(CEO_DIR, 'workspaces'); // Assuming workspaces are now relative to CEO_DIR

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { id, name, role, model, token } = body;

        if (!id || !name) {
            return NextResponse.json({ success: false, error: "Missing required fields (id, name)" }, { status: 400 });
        }

        // 1. Scaffold Directories
        const agentWorkspaceDir = path.join(WORKSPACES_DIR, id);
        if (!fs.existsSync(agentWorkspaceDir)) {
            fs.mkdirSync(agentWorkspaceDir, { recursive: true });
        }

        // Write Defaults
        const soulPath = path.join(agentWorkspaceDir, 'SOUL.md');
        if (!fs.existsSync(soulPath)) {
            fs.writeFileSync(soulPath, `Persona: ${name}\nRole: ${role || 'Assistant'}\n\nYou are a helpful AI assistant.`);
        }

        const agentsPath = path.join(agentWorkspaceDir, 'AGENTS.md');
        if (!fs.existsSync(agentsPath)) {
            fs.writeFileSync(agentsPath, `# ${name} Instructions\n\nYour goal is to fulfill your role efficiently.\n`);
        }

        // 2. Add to Config
        if (fs.existsSync(CONFIG_PATH)) {
            const configRaw = fs.readFileSync(CONFIG_PATH, 'utf-8');
            const config = JSON.parse(configRaw);

            // Check if exists
            const exists = config.agents.list.find((a: any) => a.id === id);
            if (!exists) {
                config.agents.list.push({
                    id,
                    workspace: `./workspaces/${id}`,
                    identity: { name },
                    model: { provider: model || 'google-antigravity/gemini-3-pro-high' }, // Default or selected
                    tools: { allow: ["*"] }
                });

                // Add Telegram Token if provided
                if (token) {
                    if (!config.channels) config.channels = {};
                    if (!config.channels.telegram) config.channels.telegram = { enabled: true, accounts: {} };
                    const botName = `${id.replace(/-/g, '_')}_bot`;
                    config.channels.telegram.accounts[botName] = { botToken: token };
                }

                fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
            } else {
                return NextResponse.json({ success: false, error: "Agent ID already exists" }, { status: 409 });
            }
        }

        return NextResponse.json({ success: true, message: `Agent ${name} deployed successfully` });

    } catch (error: any) {
        console.error("Deploy Error:", error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
