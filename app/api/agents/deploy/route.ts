import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Define paths relative to the OpenClaw CEO directory
const MULTI_ROOT = '/home/admin/openclaw-multi';
const CEO_DIR = path.join(MULTI_ROOT, 'ceo');
const CONFIG_PATH = path.join(CEO_DIR, 'config.json');
const WORKSPACES_DIR = path.join(CEO_DIR, 'workspace', 'agents'); 

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

        // Write Defaults with the custom Role
        const soulPath = path.join(agentWorkspaceDir, 'SOUL.md');
        if (!fs.existsSync(soulPath)) {
            const soulContent = `Persona: ${name}
Role: ${role || 'Assistant'}

You are a highly skilled AI agent specializing in ${role || 'general tasks'}.
Your goal is to provide expert assistance and execute complex workflows within the OpenClaw ecosystem.
Maintain a professional and efficient tone.`;
            fs.writeFileSync(soulPath, soulContent);
        }

        const identityPath = path.join(agentWorkspaceDir, 'IDENTITY.md');
        if (!fs.existsSync(identityPath)) {
            fs.writeFileSync(identityPath, `# Identity: ${name}\n\nYou are ${name}, a ${role || 'specialized agent'}.`);
        }

        const agentsPath = path.join(agentWorkspaceDir, 'AGENTS.md');
        if (!fs.existsSync(agentsPath)) {
            fs.writeFileSync(agentsPath, `# ${name} Instructions\n\n1. Analyze user requests thoroughly.\n2. Use available tools to fulfill tasks.\n3. Collaborate with other agents if necessary.\n`);
        }

        // 2. Add to Config
        if (fs.existsSync(CONFIG_PATH)) {
            const configRaw = fs.readFileSync(CONFIG_PATH, 'utf-8');
            const config = JSON.parse(configRaw);

            if (!config.agents) config.agents = { list: [] };
            if (!config.agents.list) config.agents.list = [];

            // Check if exists
            const exists = config.agents.list.find((a: { id: string }) => a.id === id);
            if (!exists) {
                // Use the relative path for workspace in config
                config.agents.list.push({
                    id,
                    workspace: `./workspace/agents/${id}`,
                    identity: { name },
                    // Map the selected model or use a sensible default from config
                    model: { primary: model || config.agents.defaults?.model?.primary || 'simpleverse/q-coder-model' },
                    tools: { allow: ["*"] },
                    enabled: true
                });

                // Add Telegram Token if provided
                if (token) {
                    if (!config.channels) config.channels = {};
                    if (!config.channels.telegram) config.channels.telegram = { enabled: true, accounts: {} };
                    if (!config.channels.telegram.accounts) config.channels.telegram.accounts = {};
                    
                    const botName = `${id.replace(/-/g, '_')}_bot`;
                    config.channels.telegram.accounts[botName] = { 
                        botToken: token,
                        allowFrom: ["*"] 
                    };

                    // Add binding
                    if (!config.bindings) config.bindings = [];
                    config.bindings.push({
                        agentId: id,
                        match: {
                            channel: "telegram",
                            accountId: botName
                        }
                    });
                }

                fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
                return NextResponse.json({ success: true, message: `Agent ${name} deployed successfully. Please restart the gateway to apply changes.` });
            } else {
                return NextResponse.json({ success: false, error: "Agent ID already exists" }, { status: 409 });
            }
        } else {
            return NextResponse.json({ success: false, error: "OpenClaw configuration not found at " + CONFIG_PATH }, { status: 500 });
        }

    } catch (error: unknown) {
        console.error("Deploy Error:", error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}
