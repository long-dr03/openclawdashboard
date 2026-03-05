'use client';

import { useState, useEffect, useCallback } from 'react';
import { Settings, Key, Brain, Server, Shield, Eye, EyeOff, Save, RotateCcw, Power, Bot, Pencil, Check, X, ChevronDown, ChevronRight } from 'lucide-react';

interface AgentConfig {
    id: string;
    identity?: { name?: string };
    model?: string;
    workspace?: string;
    enabled?: boolean;
    default?: boolean;
    tools?: { allow?: string[] };
}

interface TelegramAccount {
    botToken: string;
    allowFrom: number[];
}

export default function SettingsPage() {
    const [config, setConfig] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
    const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);
    const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
    const [dirty, setDirty] = useState(false);

    // Editable fields
    const [agents, setAgents] = useState<AgentConfig[]>([]);
    const [telegramAccounts, setTelegramAccounts] = useState<Record<string, TelegramAccount>>({});
    const [defaultModel, setDefaultModel] = useState('');
    const [maxConcurrent, setMaxConcurrent] = useState(4);
    const [gatewayPort, setGatewayPort] = useState(18789);
    const [gatewayToken, setGatewayToken] = useState('');
    const [allowedUsers, setAllowedUsers] = useState('');
    const [googleApiKey, setGoogleApiKey] = useState('');
    const [moonshotBaseUrl, setMoonshotBaseUrl] = useState('');
    const [googleClientId, setGoogleClientId] = useState('');
    const [googleClientSecret, setGoogleClientSecret] = useState('');
    const [isGoogleConnected, setIsGoogleConnected] = useState(false);
    const [availableModels, setAvailableModels] = useState<{ id: string; name: string }[]>([]);

    const showToastMsg = (type: string, msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchConfig = useCallback(async () => {
        try {
            const res = await fetch('/api/config');
            const data = await res.json();
            if (!data.error) {
                setConfig(data);
                // Populate fields
                setAgents(data.agents?.list || []);
                setTelegramAccounts(data.channels?.telegram?.accounts || {});
                setDefaultModel(data.agents?.defaults?.model?.primary || '');
                setMaxConcurrent(data.agents?.defaults?.maxConcurrent || 4);
                setGatewayPort(data.gateway?.port || 18789);
                setGatewayToken(data.gateway?.auth?.token || '');
                setGoogleApiKey(data.skills?.entries?.['nano-banana-pro']?.apiKey || '');
                setMoonshotBaseUrl(data.models?.providers?.moonshot?.baseUrl || '');
                
                // Google Integration (from sidecar file via API)
                const googleConfig = data._googleIntegration;
                setGoogleClientId(googleConfig?.clientId || '');
                setGoogleClientSecret(googleConfig?.clientSecret || '');
                setIsGoogleConnected(!!googleConfig?.hasTokens);

                // Parse available models from agents.defaults.models
                const models = Object.entries(data.agents?.defaults?.models || {}).map(([id, val]: [string, any]) => ({
                    id, 
                    name: val.alias || id
                }));
                // Also parse from providers if available
                if (data.models?.providers?.moonshot?.models) {
                    data.models.providers.moonshot.models.forEach((m: any) => {
                        const fullId = `moonshot/${m.id}`;
                        if (!models.find(x => x.id === fullId)) {
                            models.push({ id: fullId, name: m.name || m.id });
                        }
                    });
                }
                setAvailableModels(models);

                // Collect all unique allowFrom users
                const allUsers = new Set<number>();
                Object.values(data.channels?.telegram?.accounts || {}).forEach((acc: any) => {
                    (acc.allowFrom || []).forEach((id: number) => allUsers.add(id));
                });
                setAllowedUsers(Array.from(allUsers).join(', '));
                setDirty(false);
            }
        } catch (e) {
            console.error('Config fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    const handleGoogleConnect = async () => {
        // First save config if dirty to ensure client ID/secret are backend-side
        if (dirty) {
            await saveConfig();
        }
        
        try {
            const res = await fetch('/api/auth/google/login');
            const data = await res.json();
            if (data.url) {
                window.location.href = data.url;
            } else {
                showToastMsg('error', data.error || 'Failed to get auth URL');
            }
        } catch (e) {
            showToastMsg('error', 'Network error');
        }
    };

    useEffect(() => { 
        fetchConfig(); 
        // Check for google=connected param
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            if (params.get('google') === 'connected') {
                showToastMsg('success', 'Google Account connected successfully!');
                window.history.replaceState({}, '', '/settings'); // clear param
            }
        }
    }, [fetchConfig]);

    const markDirty = () => setDirty(true);

    const updateAgent = (agentId: string, field: string, value: any) => {
        setAgents(prev => prev.map(a => {
            if (a.id !== agentId) return a;
            if (field === 'name') return { ...a, identity: { ...a.identity, name: value } };
            if (field === 'workspace') return { ...a, workspace: value };
            if (field === 'enabled') return { ...a, enabled: value };
            if (field === 'model') return { ...a, model: value };
            return a;
        }));
        markDirty();
    };

    const updateTelegramToken = (accountId: string, token: string) => {
        setTelegramAccounts(prev => ({
            ...prev,
            [accountId]: { ...prev[accountId], botToken: token },
        }));
        markDirty();
    };

    const saveConfig = async () => {
        setSaving(true);
        try {
            // Parse allowedUsers
            const parsedUsers = allowedUsers.split(',').map(s => parseInt(s.trim())).filter(n => !isNaN(n));

            // Build telegram accounts update with allowFrom
            const telegramUpdate: Record<string, any> = {};
            for (const [accountId, acc] of Object.entries(telegramAccounts)) {
                telegramUpdate[accountId] = {
                    botToken: acc.botToken,
                    allowFrom: parsedUsers,
                };
            }

            const payload = {
                agents: {
                    list: agents.map(a => ({
                        id: a.id,
                        identity: a.identity,
                        workspace: a.workspace,
                        enabled: a.enabled,
                        model: a.model,
                    })),
                    defaults: {
                        model: { primary: defaultModel },
                        maxConcurrent,
                    },
                },
                channels: {
                    telegram: {
                        accounts: telegramUpdate,
                    },
                },
                gateway: {
                    port: gatewayPort,
                    auth: { token: gatewayToken },
                },
                skills: {
                    entries: {
                        'nano-banana-pro': { apiKey: googleApiKey },
                    },
                },
                _googleIntegration: {
                    clientId: googleClientId,
                    clientSecret: googleClientSecret,
                },
                models: {
                    providers: {
                        moonshot: { baseUrl: moonshotBaseUrl },
                    },
                },
            };

            const res = await fetch('/api/config', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            const data = await res.json();
            if (data.success) {
                showToastMsg('success', '✅ Configuration saved! Restart PM2 to apply changes.');
                setDirty(false);
            } else {
                showToastMsg('error', data.error || 'Save failed');
            }
        } catch (e: any) {
            showToastMsg('error', e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleRestart = async () => {
        try {
            const res = await fetch('/api/agents/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId: 'all', action: 'restart-all' }),
            });
            const data = await res.json();
            showToastMsg(data.success ? 'success' : 'error', data.message || data.error);
        } catch (e: any) {
            showToastMsg('error', e.message);
        }
    };

    const toggleVisibility = (key: string) => setShowTokens(prev => ({ ...prev, [key]: !prev[key] }));

    // Find which telegram account belongs to which agent
    const getAccountForAgent = (agentId: string): string | null => {
        const binding = config?.bindings?.find((b: any) => b.agentId === agentId);
        return binding?.match?.accountId || null;
    };

    if (loading) return <div className="p-8 text-center text-slate-500">Loading configuration...</div>;

    return (
        <div className="p-8">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-xl backdrop-blur-sm border transition-all
                    ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-red-500/20 border-red-500/30 text-red-300'}
                `}>{toast.msg}</div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center">
                        <Settings size={28} className="mr-3 text-slate-400" />
                        System Configuration
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Edit agent configs, tokens, models — saves directly to <code className="text-amber-400/80">config.json</code></p>
                </div>
                {dirty && <span className="text-xs px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full border border-amber-500/20">Unsaved changes</span>}
            </div>

            <div className="max-w-5xl space-y-6">

                {/* ═══════════ Agent Configuration ═══════════ */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl overflow-hidden">
                    <div className="p-5 border-b border-white/5 bg-black/20">
                        <h3 className="font-bold text-white text-sm flex items-center">
                            <Bot size={16} className="mr-2 text-blue-400" /> Agent Configuration
                        </h3>
                        <p className="text-[10px] text-slate-500 mt-1">Click an agent to expand and edit its settings</p>
                    </div>

                    {agents.map(agent => {
                        const isExpanded = expandedAgent === agent.id;
                        const accountId = getAccountForAgent(agent.id);
                        const tgAccount = accountId ? telegramAccounts[accountId] : null;

                        return (
                            <div key={agent.id} className="border-b border-white/5 last:border-b-0">
                                {/* Agent Header - Clickable */}
                                <button
                                    onClick={() => setExpandedAgent(isExpanded ? null : agent.id)}
                                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
                                >
                                    <div className="flex items-center">
                                        {isExpanded ? <ChevronDown size={14} className="mr-3 text-blue-400" /> : <ChevronRight size={14} className="mr-3 text-slate-500" />}
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mr-3">
                                            <Bot size={14} className="text-blue-400" />
                                        </div>
                                        <div>
                                            <span className="text-sm font-medium text-white">{agent.identity?.name || agent.id}</span>
                                            <span className="text-[10px] text-slate-500 ml-2 font-mono">({agent.id})</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${agent.enabled !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {agent.enabled !== false ? 'ENABLED' : 'DISABLED'}
                                        </span>
                                        {tgAccount?.botToken ? (
                                            <span className="text-[10px] text-emerald-400">📱 TG</span>
                                        ) : (
                                            <span className="text-[10px] text-slate-600">⚠️ No TG</span>
                                        )}
                                    </div>
                                </button>

                                {/* Expanded Editor */}
                                {isExpanded && (
                                    <div className="px-5 pb-5 space-y-4 bg-black/10">
                                        {/* Name */}
                                        <div className="grid grid-cols-3 gap-4 items-center">
                                            <label className="text-xs text-slate-400">Display Name</label>
                                            <input
                                                type="text"
                                                value={agent.identity?.name || ''}
                                                onChange={e => updateAgent(agent.id, 'name', e.target.value)}
                                                className="col-span-2 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                            />
                                        </div>
                                        {/* Workspace */}
                                        <div className="grid grid-cols-3 gap-4 items-center">
                                            <label className="text-xs text-slate-400">Workspace Path</label>
                                            <input
                                                type="text"
                                                value={agent.workspace || ''}
                                                onChange={e => updateAgent(agent.id, 'workspace', e.target.value)}
                                                className="col-span-2 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50"
                                            />
                                        </div>
                                        {/* Enabled */}
                                        <div className="grid grid-cols-3 gap-4 items-center">
                                            <label className="text-xs text-slate-400">Enabled</label>
                                            <div className="col-span-2">
                                                <button
                                                    onClick={() => updateAgent(agent.id, 'enabled', agent.enabled === false ? true : false)}
                                                    className={`relative w-12 h-6 rounded-full transition-colors ${agent.enabled !== false ? 'bg-emerald-500' : 'bg-slate-700'}`}
                                                >
                                                    <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-transform ${agent.enabled !== false ? 'left-[26px]' : 'left-0.5'}`}></span>
                                                </button>
                                            </div>
                                        </div>
                                        {/* Model Selector */}
                                        <div className="grid grid-cols-3 gap-4 items-center">
                                            <label className="text-xs text-slate-400">Agent Model</label>
                                            <select 
                                                value={(agent as any).model || ''} // cast to any because interface might not have model yet
                                                onChange={e => updateAgent(agent.id, 'model', e.target.value)}
                                                className="col-span-2 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500/50"
                                            >
                                                <option value="">(Default: {defaultModel.split('/').pop()})</option>
                                                {availableModels.map(m => (
                                                    <option key={m.id} value={m.id}>{m.name} ({m.id})</option>
                                                ))}
                                            </select>
                                        </div>
                                        {/* Telegram Token */}
                                        {accountId && (
                                            <div className="grid grid-cols-3 gap-4 items-center">
                                                <label className="text-xs text-slate-400">Telegram Bot Token
                                                    <span className="block text-[10px] text-slate-600">account: {accountId}</span>
                                                </label>
                                                <div className="col-span-2 flex items-center space-x-2">
                                                    <input
                                                        type={showTokens[`tg-${agent.id}`] ? 'text' : 'password'}
                                                        value={tgAccount?.botToken || ''}
                                                        onChange={e => updateTelegramToken(accountId, e.target.value)}
                                                        placeholder="Enter bot token..."
                                                        className="flex-1 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50"
                                                    />
                                                    <button onClick={() => toggleVisibility(`tg-${agent.id}`)} className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white">
                                                        {showTokens[`tg-${agent.id}`] ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* ═══════════ AI Models ═══════════ */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <h3 className="font-bold text-white text-sm flex items-center mb-4">
                        <Brain size={16} className="mr-2 text-purple-400" /> AI Models
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-xs text-slate-400">Default Primary Model</label>
                            <input type="text" value={defaultModel} onChange={e => { setDefaultModel(e.target.value); markDirty(); }}
                                className="col-span-2 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50" />
                        </div>
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-xs text-slate-400">Max Concurrent Agents</label>
                            <input type="number" value={maxConcurrent} onChange={e => { setMaxConcurrent(parseInt(e.target.value) || 1); markDirty(); }} min={1} max={16}
                                className="col-span-2 w-24 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none text-center" />
                        </div>
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-xs text-slate-400">Moonshot Base URL</label>
                            <input type="text" value={moonshotBaseUrl} onChange={e => { setMoonshotBaseUrl(e.target.value); markDirty(); }}
                                className="col-span-2 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50" />
                        </div>
                    </div>
                </div>

                {/* ═══════════ Gateway ═══════════ */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <h3 className="font-bold text-white text-sm flex items-center mb-4">
                        <Server size={16} className="mr-2 text-blue-400" /> Gateway Configuration
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-xs text-slate-400">Port</label>
                            <input type="number" value={gatewayPort} onChange={e => { setGatewayPort(parseInt(e.target.value) || 18789); markDirty(); }}
                                className="col-span-2 w-32 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none text-center" />
                        </div>
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-xs text-slate-400">Auth Token</label>
                            <div className="col-span-2 flex items-center space-x-2">
                                <input type={showTokens['gw-token'] ? 'text' : 'password'} value={gatewayToken} onChange={e => { setGatewayToken(e.target.value); markDirty(); }}
                                    className="flex-1 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50" />
                                <button onClick={() => toggleVisibility('gw-token')} className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white">
                                    {showTokens['gw-token'] ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════ Telegram Global ═══════════ */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <h3 className="font-bold text-white text-sm flex items-center mb-4">
                        📱 Telegram Global Settings
                    </h3>
                    <div className="grid grid-cols-3 gap-4 items-center">
                        <label className="text-xs text-slate-400">Allowed User IDs <span className="block text-[10px] text-slate-600">(comma-separated)</span></label>
                        <input type="text" value={allowedUsers} onChange={e => { setAllowedUsers(e.target.value); markDirty(); }}
                            className="col-span-2 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50" />
                    </div>
                </div>

                {/* ═══════════ API Keys ═══════════ */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <h3 className="font-bold text-white text-sm flex items-center mb-4">
                        <Key size={16} className="mr-2 text-amber-400" /> API Keys & Integrations
                    </h3>
                    <div className="space-y-4">
                        <div className="grid grid-cols-3 gap-4 items-center">
                            <label className="text-xs text-slate-400">Google API Key (Gemini)</label>
                            <div className="col-span-2 flex items-center space-x-2">
                                <input type={showTokens['google-key'] ? 'text' : 'password'} value={googleApiKey} onChange={e => { setGoogleApiKey(e.target.value); markDirty(); }}
                                    className="flex-1 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50" />
                                <button onClick={() => toggleVisibility('google-key')} className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white">
                                    {showTokens['google-key'] ? <EyeOff size={14} /> : <Eye size={14} />}
                                </button>
                            </div>
                        </div>

                        {/* Google OAuth */}
                        <div className="pt-4 border-t border-white/5">
                            <h4 className="text-xs font-bold text-white mb-3">Google Workspace Integration (Gmail/Calendar)</h4>
                            <div className="grid grid-cols-3 gap-4 items-center mb-2">
                                <label className="text-xs text-slate-400">Client ID</label>
                                <input type="text" value={googleClientId} onChange={e => { setGoogleClientId(e.target.value); markDirty(); }}
                                    className="col-span-2 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50" />
                            </div>
                            <div className="grid grid-cols-3 gap-4 items-center mb-3">
                                <label className="text-xs text-slate-400">Client Secret</label>
                                <div className="col-span-2 flex items-center space-x-2">
                                    <input type={showTokens['google-secret'] ? 'text' : 'password'} value={googleClientSecret} onChange={e => { setGoogleClientSecret(e.target.value); markDirty(); }}
                                        className="flex-1 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-blue-500/50" />
                                    <button onClick={() => toggleVisibility('google-secret')} className="p-2 rounded-lg hover:bg-white/5 text-slate-500 hover:text-white">
                                        {showTokens['google-secret'] ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="col-start-2 col-span-2">
                                    {isGoogleConnected ? (
                                        <div className="flex items-center space-x-3">
                                            <span className="text-xs text-emerald-400 flex items-center"><Check size={12} className="mr-1" /> Connected</span>
                                            <button onClick={handleGoogleConnect} className="text-xs text-slate-400 hover:text-white underline">Reconnect</button>
                                        </div>
                                    ) : (
                                        <button onClick={handleGoogleConnect} className="flex items-center px-4 py-2 bg-white text-black hover:bg-slate-200 rounded-lg text-xs font-bold transition-colors">
                                            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                                            Connect Google Account
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ═══════════ Actions ═══════════ */}
                <div className="flex items-center space-x-3 pt-4">
                    <button onClick={saveConfig} disabled={saving || !dirty}
                        className="flex-1 flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-blue-600/20 disabled:opacity-30 disabled:cursor-not-allowed">
                        <Save size={16} className="mr-2" /> {saving ? 'Saving...' : 'Save Configuration'}
                    </button>
                    <button onClick={handleRestart} className="flex items-center px-4 py-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-sm transition-colors border border-amber-500/20">
                        <RotateCcw size={14} className="mr-2" /> Restart PM2
                    </button>
                    <button onClick={() => fetchConfig()} className="flex items-center px-4 py-3 bg-slate-700/50 hover:bg-slate-600/50 text-white rounded-lg text-sm transition-colors border border-white/5">
                        <RotateCcw size={14} className="mr-2" /> Reload
                    </button>
                </div>

                <p className="text-[10px] text-slate-600 text-center pb-4">Changes are saved to <code>config.json</code>. Click "Restart PM2" to apply changes to running agents.</p>
            </div>
        </div>
    );
}
