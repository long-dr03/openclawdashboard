import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CEO_DIR = process.env.OPENCLAW_CONFIG_DIR || path.resolve(process.cwd(), '..');
const CONFIG_PATH = path.join(CEO_DIR, 'config.json');
const DISABLED_AGENTS_PATH = path.join(CEO_DIR, 'disabled-agents.json');
const GOOGLE_CREDS_PATH = path.join(CEO_DIR, 'google-credentials.json');

// GET — Read config + merge disabled agents
export async function GET() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) {
            return NextResponse.json({ error: 'Config file not found' }, { status: 404 });
        }
        const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const config = JSON.parse(raw);

        // Read disabled agents
        let disabledAgents: { id: string; [key: string]: unknown }[] = [];
        if (fs.existsSync(DISABLED_AGENTS_PATH)) {
            try {
                disabledAgents = JSON.parse(fs.readFileSync(DISABLED_AGENTS_PATH, 'utf-8'));
            } catch (e: unknown) {
                console.warn('Failed to parse disabled-agents.json', e);
            }
        }

        // Merge active and disabled agents
        // Mark disabled ones with enabled: false
        const activeAgents = (config.agents?.list || []).map((a: { id: string }) => ({ ...a, enabled: true }));
        const inactiveAgents = disabledAgents.map((a: { id: string }) => ({ ...a, enabled: false }));

        // Combine into one list for the UI
        if (config.agents) {
            config.agents.list = [...activeAgents, ...inactiveAgents];
        }

        // Merge Google credentials from sidecar file
        let googleCreds: { clientId?: string; clientSecret?: string; tokens?: unknown } = {};
        if (fs.existsSync(GOOGLE_CREDS_PATH)) {
            try { googleCreds = JSON.parse(fs.readFileSync(GOOGLE_CREDS_PATH, 'utf-8')); } catch { }
        }
        config._googleIntegration = {
            clientId: googleCreds.clientId || '',
            clientSecret: googleCreds.clientSecret || '',
            hasTokens: !!googleCreds.tokens,
        };

        return NextResponse.json(config);
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

// PUT — Update config (handle enable/disable move)
export async function PUT(request: Request) {
    try {
        const updates = await request.json();

        if (!fs.existsSync(CONFIG_PATH)) {
            return NextResponse.json({ error: 'Config file not found' }, { status: 404 });
        }

        // Read current state
        const configRaw = fs.readFileSync(CONFIG_PATH, 'utf-8');
        const config = JSON.parse(configRaw);

        let disabledAgents: { id: string; [key: string]: any }[] = [];
        if (fs.existsSync(DISABLED_AGENTS_PATH)) {
            try {
                disabledAgents = JSON.parse(fs.readFileSync(DISABLED_AGENTS_PATH, 'utf-8'));
            } catch { }
        }

        // Helper to find agent in either list
        const findAgent = (id: string) => {
            const active = config.agents?.list?.find((a: { id: string }) => a.id === id);
            if (active) return { agent: active, source: 'active' };
            const inactive = disabledAgents.find((a: { id: string }) => a.id === id);
            if (inactive) return { agent: inactive, source: 'inactive' };
            return null;
        };

        // Process agent updates
        if (updates.agents?.list) {
            for (const updatedAgent of updates.agents.list) {
                const found = findAgent(updatedAgent.id);

                if (found) {
                    const agent = found.agent;

                    // Update properties
                    if (updatedAgent.identity) agent.identity = { ...agent.identity, ...updatedAgent.identity };
                    if (updatedAgent.workspace) agent.workspace = updatedAgent.workspace;
                    if (updatedAgent.model !== undefined) {
                        if (updatedAgent.model === '') delete agent.model;
                        else agent.model = updatedAgent.model;
                    }

                    // Handle Enable/Disable Move
                    if (updatedAgent.enabled !== undefined) {
                        const shouldEnable = updatedAgent.enabled;

                        // Disable: Move Active -> Inactive
                        if (!shouldEnable) {
                            if (found.source === 'active') {
                                // Remove from config
                                config.agents.list = config.agents.list.filter((a: { id: string }) => a.id !== agent.id);
                                // Add to disabled list
                                // Ensure we clean 'enabled' prop before saving to file (avoid schema errors if moved back)
                                const agentToSave = { ...agent };
                                delete agentToSave.enabled;
                                disabledAgents.push(agentToSave);
                            } else {
                                // Already inactive, just update the object in place
                                Object.assign(agent, updatedAgent);
                                delete agent.enabled; // ensure clean
                            }
                        }

                        // Enable: Move Inactive -> Active
                        if (shouldEnable) {
                            if (found.source === 'inactive') {
                                // Remove from disabled list
                                disabledAgents = disabledAgents.filter((a: { id: string }) => a.id !== agent.id);
                                // Add to config
                                const agentToSave = { ...agent };
                                delete agentToSave.enabled;
                                config.agents.list.push(agentToSave);
                            } else {
                                // Already active, just update
                                Object.assign(agent, updatedAgent);
                                delete agent.enabled;
                            }
                        }
                    } else {
                        // Just regular update, keep in current list
                        // Logic already applied to 'agent' reference above, but need to ensure 'enabled' isn't saved
                        delete agent.enabled;
                    }
                }
            }
        }

        // --- Standard Config Updates (same as before) ---

        // Update defaults
        if (updates.agents?.defaults) {
            config.agents = config.agents || {};
            config.agents.defaults = { ...config.agents.defaults, ...updates.agents.defaults };
            if (updates.agents.defaults.model) {
                config.agents.defaults.model = { ...config.agents.defaults.model, ...updates.agents.defaults.model };
            }
        }

        // Update Telegram tokens
        if (updates.channels?.telegram?.accounts) {
            for (const [accountId, accountData] of Object.entries(updates.channels.telegram.accounts as Record<string, { botToken?: string; allowFrom?: string[] }>)) {
                if (config.channels?.telegram?.accounts?.[accountId]) {
                    if (accountData.botToken !== undefined) config.channels.telegram.accounts[accountId].botToken = accountData.botToken;
                    if (accountData.allowFrom !== undefined) config.channels.telegram.accounts[accountId].allowFrom = accountData.allowFrom;
                }
            }
        }

        // Update Gateway
        if (updates.gateway) {
            config.gateway = { ...config.gateway, ...updates.gateway };
            if (updates.gateway.auth) config.gateway.auth = { ...config.gateway.auth, ...updates.gateway.auth };
        }

        // Update skills/models/API keys (but NOT google-integration creds)
        if (updates.skills?.entries) {
            config.skills = config.skills || {};
            config.skills.entries = config.skills.entries || {};
            // Remove google-integration from updates (handled via sidecar)
            delete updates.skills.entries['google-integration'];
            config.skills.entries = { ...config.skills.entries, ...updates.skills.entries };
        }

        // Save Google credentials to sidecar file (never to config.json)
        if (updates._googleIntegration) {
            let googleCreds: { clientId?: string; clientSecret?: string } = {};
            if (fs.existsSync(GOOGLE_CREDS_PATH)) {
                try { googleCreds = JSON.parse(fs.readFileSync(GOOGLE_CREDS_PATH, 'utf-8')); } catch { }
            }
            if (updates._googleIntegration.clientId !== undefined) {
                googleCreds.clientId = (updates._googleIntegration.clientId as string).trim().replace(/\/$/, '');
            }
            if (updates._googleIntegration.clientSecret !== undefined) {
                googleCreds.clientSecret = (updates._googleIntegration.clientSecret as string).trim();
            }
            fs.writeFileSync(GOOGLE_CREDS_PATH, JSON.stringify(googleCreds, null, 2));
        }
        // Update models (Deep merge for providers)
        if (updates.models?.providers) {
            config.models = config.models || {};
            config.models.providers = config.models.providers || {};

            for (const [providerId, providerData] of Object.entries(updates.models.providers as Record<string, unknown>)) {
                if (config.models.providers[providerId]) {
                    // Deep merge existing provider
                    config.models.providers[providerId] = {
                        ...(config.models.providers[providerId] as Record<string, unknown>),
                        ...(providerData as Record<string, unknown>)
                    };
                } else {
                    // New provider
                    config.models.providers[providerId] = providerData;
                }
            }
        }

        // Clean up 'enabled' property from config.agents.list just in case
        if (config.agents?.list) {
            config.agents.list.forEach((a: { enabled?: boolean }) => delete a.enabled);
        }

        // Timestamp
        config.meta = config.meta || {};
        config.meta.lastTouchedAt = new Date().toISOString();

        // Write files
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        fs.writeFileSync(DISABLED_AGENTS_PATH, JSON.stringify(disabledAgents, null, 2));

        return NextResponse.json({ success: true, message: 'Configuration saved successfully' });
    } catch (e: unknown) {
        console.error('[Config API] Save error:', e);
        const message = e instanceof Error ? e.message : String(e);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
