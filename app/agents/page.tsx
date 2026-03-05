'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Play, Square, RotateCcw, Zap, Bot, Crown, Server, TrendingUp, Megaphone, Wifi, WifiOff, MessageSquare, Hash, Clock, Coins } from 'lucide-react';

interface Agent {
    id: string;
    name: string;
    role?: string;
    model?: string;
    modelProvider?: string;
    enabled?: boolean;
    workspace?: string;
    telegramConnected?: boolean;
    telegramAccountId?: string;
    zaloConnected?: boolean;
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
    lastActive?: string;
    lastChannel?: string;
    sessionId?: string;
    toolsAllow?: string[];
}

export default function AgentsPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [actionLoading, setActionLoading] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);

    const [newId, setNewId] = useState('');
    const [newName, setNewName] = useState('');
    const [newRole, setNewRole] = useState('General');
    const [newModel, setNewModel] = useState('gemini-2.5-flash-lite');
    const [newToken, setNewToken] = useState('');

    const showToast = (type: string, msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    const fetchAgents = useCallback(async () => {
        try {
            const res = await fetch('/api/agents');
            const data = await res.json();
            if (Array.isArray(data)) {
                setAgents(data);
            }
        } catch (e) {
            console.error('Fetch agents error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAgents();
        const interval = setInterval(fetchAgents, 10000);
        return () => clearInterval(interval);
    }, [fetchAgents]);

    const handleAgentAction = async (agentId: string, action: string) => {
        setActionLoading(`${agentId}-${action}`);
        try {
            const res = await fetch('/api/agents/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId, action }),
            });
            const data = await res.json();
            if (data.success) {
                if (data.requiresRestart) {
                    showToast('info', `${data.message} — Click "Restart Gateway" to apply.`);
                } else {
                    showToast('success', data.message);
                }
                setTimeout(() => fetchAgents(), 1000);
            } else {
                showToast('error', data.error || 'Action failed');
            }
        } catch (e: any) {
            showToast('error', e.message || 'Network error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleRestartAll = async () => {
        setActionLoading('restart-all');
        try {
            const res = await fetch('/api/agents/control', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ agentId: 'all', action: 'restart-all' }),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', data.message);
            } else {
                showToast('error', data.error || 'Restart failed');
            }
        } catch (e: any) {
            showToast('error', e.message || 'Network error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDeploy = async () => {
        if (!newName.trim()) {
            showToast('error', 'Nhập tên agent!');
            return;
        }
        const id = newId.trim() || newName.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        showToast('info', `Deploying agent ${newName}...`);
        setShowModal(false);

        try {
            const res = await fetch('/api/agents/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, name: newName, role: newRole, model: newModel, token: newToken }),
            });
            const data = await res.json();
            if (data.success) {
                showToast('success', `Agent "${newName}" deployed successfully!`);
                setNewId(''); setNewName(''); setNewRole('General'); setNewToken('');
                fetchAgents();
            } else {
                showToast('error', 'Deploy failed: ' + data.error);
            }
        } catch (e: any) {
            showToast('error', e.message);
        }
    };

    const agentIcons: Record<string, typeof Crown> = {
        ceo: Crown,
        devops: Server,
        sales: TrendingUp,
        marketing: Megaphone,
    };

    const agentColors: Record<string, string> = {
        ceo: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
        devops: 'from-red-500/20 to-red-600/5 border-red-500/20',
        sales: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
        marketing: 'from-purple-500/20 to-purple-600/5 border-purple-500/20',
    };

    const formatTokens = (n: number) => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return String(n);
    };

    const formatTimeAgo = (isoStr: string | null | undefined) => {
        if (!isoStr) return 'Never';
        const diff = Date.now() - new Date(isoStr).getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return `${Math.floor(hours / 24)}d ago`;
    };

    return (
        <div className="p-8">
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-xl backdrop-blur-sm border transition-all
                    ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : ''}
                    ${toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-300' : ''}
                    ${toast.type === 'info' ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : ''}
                `}>
                    {toast.msg}
                </div>
            )}

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center">
                        <Users size={28} className="mr-3 text-blue-400" />
                        Agent Fleet Management
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        {agents.length} agents configured · {agents.filter(a => a.enabled !== false).length} active
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <button
                        onClick={handleRestartAll}
                        disabled={actionLoading === 'restart-all'}
                        className="flex items-center px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/20 rounded-lg font-medium text-sm transition-all disabled:opacity-30"
                    >
                        <RotateCcw size={16} className={`mr-2 ${actionLoading === 'restart-all' ? 'animate-spin' : ''}`} />
                        {actionLoading === 'restart-all' ? 'Restarting...' : 'Restart Gateway'}
                    </button>
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-blue-600/20"
                    >
                        <Plus size={18} className="mr-2" />
                        Deploy Agent
                    </button>
                </div>
            </div>

            {/* Agent Grid */}
            {loading ? (
                <div className="text-center py-20 text-slate-500"><Bot size={40} className="mx-auto mb-3 opacity-30" />Loading agents...</div>
            ) : agents.length === 0 ? (
                <div className="text-center py-20 text-slate-500">
                    <Bot size={48} className="mx-auto mb-3 opacity-20" />
                    <p>No agents configured</p>
                    <button onClick={() => setShowModal(true)} className="mt-3 text-blue-400 hover:underline text-sm">Deploy your first agent →</button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {agents.map(agent => {
                        const IconComp = agentIcons[agent.id] || Bot;
                        const colorClass = agentColors[agent.id] || 'from-slate-500/20 to-slate-600/5 border-slate-500/20';
                        const isEnabled = agent.enabled !== false;

                        return (
                            <div
                                key={agent.id}
                                className={`relative bg-gradient-to-br ${colorClass} border rounded-xl p-5 transition-all hover:scale-[1.02] hover:shadow-lg`}
                            >
                                {/* Status indicator */}
                                <div className="absolute top-4 right-4 flex items-center space-x-1.5">
                                    {isEnabled ? (
                                        <>
                                            <Wifi size={12} className="text-emerald-400" />
                                            <span className="text-[10px] font-bold text-emerald-400 uppercase">Online</span>
                                        </>
                                    ) : (
                                        <>
                                            <WifiOff size={12} className="text-slate-500" />
                                            <span className="text-[10px] font-bold text-slate-500 uppercase">Offline</span>
                                        </>
                                    )}
                                </div>

                                {/* Agent Info */}
                                <div className="flex items-center mb-4">
                                    <div className="w-12 h-12 rounded-xl bg-black/30 flex items-center justify-center mr-4 border border-white/5">
                                        <IconComp size={22} className="text-white/70" />
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-white text-base">{agent.name}</h3>
                                        <p className="text-slate-500 text-xs">{agent.role || 'General'} · {agent.model || 'default'}</p>
                                    </div>
                                </div>

                                {/* Channel badges */}
                                <div className="flex items-center space-x-2 mb-3">
                                    {agent.telegramConnected && (
                                        <span className="flex items-center px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-medium">
                                            📱 Telegram
                                        </span>
                                    )}
                                    {agent.zaloConnected && (
                                        <span className="flex items-center px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-[10px] text-cyan-400 font-medium">
                                            💬 Zalo
                                        </span>
                                    )}
                                    {!agent.telegramConnected && !agent.zaloConnected && (
                                        <span className="text-[10px] text-slate-600">No channels</span>
                                    )}
                                </div>

                                {/* Meta info */}
                                <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                                    <div className="bg-black/20 rounded-lg p-2">
                                        <span className="text-slate-500 flex items-center"><Coins size={10} className="mr-1" />Tokens</span>
                                        <p className="text-slate-300 font-mono">{formatTokens(agent.totalTokens || 0)}</p>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-2">
                                        <span className="text-slate-500 flex items-center"><Clock size={10} className="mr-1" />Last Active</span>
                                        <p className="text-slate-300 font-mono">{formatTimeAgo(agent.lastActive)}</p>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-2">
                                        <span className="text-slate-500 flex items-center"><Hash size={10} className="mr-1" />ID</span>
                                        <p className="text-slate-300 font-mono">{agent.id}</p>
                                    </div>
                                    <div className="bg-black/20 rounded-lg p-2">
                                        <span className="text-slate-500 flex items-center"><MessageSquare size={10} className="mr-1" />Channel</span>
                                        <p className="text-slate-300 font-mono">{agent.lastChannel || '—'}</p>
                                    </div>
                                </div>

                                {/* Control Buttons */}
                                <div className="flex items-center space-x-2 pt-3 border-t border-white/5">
                                    <button
                                        onClick={() => handleAgentAction(agent.id, 'start')}
                                        disabled={actionLoading === `${agent.id}-start`}
                                        className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium transition-colors disabled:opacity-30"
                                    >
                                        <Play size={13} className="mr-1" />
                                        {actionLoading === `${agent.id}-start` ? '...' : 'Enable'}
                                    </button>
                                    <button
                                        onClick={() => handleAgentAction(agent.id, 'stop')}
                                        disabled={actionLoading === `${agent.id}-stop`}
                                        className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors disabled:opacity-30"
                                    >
                                        <Square size={13} className="mr-1" />
                                        {actionLoading === `${agent.id}-stop` ? '...' : 'Disable'}
                                    </button>
                                    <button
                                        onClick={() => handleAgentAction(agent.id, 'restart')}
                                        disabled={actionLoading === `${agent.id}-restart`}
                                        className="flex-1 flex items-center justify-center px-3 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 text-xs font-medium transition-colors disabled:opacity-30"
                                    >
                                        <RotateCcw size={13} className="mr-1" />
                                        {actionLoading === `${agent.id}-restart` ? '...' : 'Restart'}
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Deploy Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-[#16181e] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-bold text-white flex items-center">
                                <Zap size={20} className="mr-2 text-amber-400" /> Deploy New Agent
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-500 hover:text-white text-xl">&times;</button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Agent ID (slug)</label>
                                <input type="text" value={newId} onChange={e => setNewId(e.target.value)}
                                    placeholder="e.g. content-writer"
                                    className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Agent Name *</label>
                                <input type="text" value={newName} onChange={e => setNewName(e.target.value)}
                                    placeholder="e.g. Content Writer"
                                    className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Role</label>
                                    <select value={newRole} onChange={e => setNewRole(e.target.value)}
                                        className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none">
                                        <option value="General">General</option>
                                        <option value="Orchestrator">Orchestrator</option>
                                        <option value="Sales & CRM">Sales & CRM</option>
                                        <option value="Marketing Research">Marketing Research</option>
                                        <option value="Infrastructure">Infrastructure</option>
                                        <option value="Customer Care">Customer Care</option>
                                        <option value="Content Creator">Content Creator</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Model</label>
                                    <select value={newModel} onChange={e => setNewModel(e.target.value)}
                                        className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white focus:outline-none">
                                        <option value="gemini-2.5-flash-lite">gemini-2.5-flash-lite</option>
                                        <option value="gemini-3-pro-high">gemini-3-pro-high</option>
                                        <option value="claude-opus-4-6-thinking">claude-opus-4-6-thinking</option>
                                    </select>
                                </div>
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Telegram Bot Token (Optional)</label>
                                <input type="password" value={newToken} onChange={e => setNewToken(e.target.value)}
                                    placeholder="123456789:AAG..."
                                    className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
                            </div>
                        </div>

                        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-white/5">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5 transition-colors">Cancel</button>
                            <button onClick={handleDeploy} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-600/20">
                                <Zap size={14} className="inline mr-1" /> Deploy
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
