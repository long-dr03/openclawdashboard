'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, Cpu, Bot, Coins, Radio, HeartPulse, RotateCcw, CloudUpload, TrendingUp, Headset, Calendar, Mail, MailOpen, Send, Clock, Bell, Command, ChevronRight, Shield, Zap, MessageSquare, AlertTriangle, CheckCircle2, XCircle, ExternalLink, LogOut } from 'lucide-react';
import { Terminal } from '@/components/Terminal';
import { StatsCard } from '@/components/StatsCard';

interface Agent {
    id: string;
    name: string;
    role?: string;
    model?: string;
    enabled?: boolean;
    telegramConnected?: boolean;
}

interface ServiceStatus {
    name: string;
    status: 'online' | 'offline' | 'unknown';
    info?: string;
}

export default function DashboardPage() {
    const router = useRouter();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [services, setServices] = useState<ServiceStatus[]>([]);
    const [systemStats, setSystemStats] = useState<any>(null);
    const [clock, setClock] = useState('');
    const [mounted, setMounted] = useState(false);
    const [directCmd, setDirectCmd] = useState('');
    const [directTarget, setDirectTarget] = useState('');
    const [cmdResult, setCmdResult] = useState('');
    const [cmdSending, setCmdSending] = useState(false);

    const handleLogout = async () => {
        try {
            await fetch('/api/auth/logout', { method: 'POST' });
            router.push('/login');
            router.refresh();
        } catch (e) {
            console.error('Logout failed', e);
        }
    };

    // Gmail and Calendar
    const [emails, setEmails] = useState<any[]>([]);
    const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
    const [googleError, setGoogleError] = useState(false);

    // Escalation log (would come from DevOps → CEO alert system)
    const [escalations] = useState([
        { id: 1, from: 'DevOps Agent', severity: 'warning', msg: 'Sales Bot — Telegram token trống, không thể nhận tin', time: '12:30', resolved: false },
        { id: 2, from: 'DevOps Agent', severity: 'warning', msg: 'DevOps Bot — Telegram token trống', time: '12:30', resolved: false },
        { id: 3, from: 'System', severity: 'info', msg: 'Gateway health check OK — uptime 3d 4h', time: '11:00', resolved: true },
    ]);

    // Daily reports
    const [reports] = useState([
        { time: '08:00', title: 'Morning Briefing', status: 'completed', summary: 'Tất cả agent online. CEO: 70K tokens. Sales & DevOps idle 4 ngày.' },
        { time: '12:00', title: 'Midday Check', status: 'pending', summary: 'Waiting for scheduled time...' },
        { time: '20:00', title: 'Evening Summary', status: 'pending', summary: 'Waiting for scheduled time...' },
    ]);

    const fetchData = useCallback(async () => {
        try {
            const [agentRes, svcRes, sysRes] = await Promise.all([
                fetch('/api/agents'),
                fetch('/api/devops/services').catch(() => null),
                fetch('/api/devops/system').catch(() => null),
            ]);

            // Gmail & Calendar (lazy load)
            fetch('/api/google/gmail').then(res => res.json()).then(data => {
                if (Array.isArray(data)) setEmails(data);
                else if (data.error) setGoogleError(true);
            }).catch(() => { });

            fetch('/api/google/calendar').then(res => res.json()).then(data => {
                if (Array.isArray(data)) setCalendarEvents(data);
            }).catch(() => { });

            const ag = await agentRes.json();
            if (Array.isArray(ag)) setAgents(ag);
            if (svcRes) { const s = await svcRes.json(); if (Array.isArray(s)) setServices(s); }
            if (sysRes) { const sys = await sysRes.json(); if (!sys.error) setSystemStats(sys); }
        } catch (e) { console.error(e); }
    }, []);

    useEffect(() => { fetchData(); const i = setInterval(fetchData, 15000); return () => clearInterval(i); }, [fetchData]);

    useEffect(() => {
        setMounted(true);
        const update = () => setClock(new Date().toLocaleTimeString('en-GB', { hour12: false }));
        update();
        const i = setInterval(update, 1000);
        return () => clearInterval(i);
    }, []);

    const sendDirectCommand = async () => {
        if (!directCmd.trim() || !directTarget) return;
        setCmdSending(true);
        try {
            const res = await fetch('/api/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: '⚡ Direct Command from CEO',
                    message: directCmd,
                    priority: 'urgent',
                    targets: [directTarget],
                }),
            });
            const data = await res.json();
            if (data.success) {
                const result = data.results?.[0];
                if (result?.method === 'telegram' && result?.success) {
                    setCmdResult(`✅ Sent to ${directTarget} via Telegram`);
                } else if (result?.method === 'log-only') {
                    setCmdResult(`⚠️ ${directTarget}: No Telegram token — logged only`);
                } else {
                    setCmdResult(`❌ Failed: ${result?.error || 'Unknown error'}`);
                }
                setDirectCmd('');
            } else {
                setCmdResult('❌ ' + (data.error || 'Failed'));
            }
        } catch (e: any) {
            setCmdResult('❌ Network error');
        } finally {
            setCmdSending(false);
            setTimeout(() => setCmdResult(''), 5000);
        }
    };

    const activeAgents = agents.filter(a => a.enabled !== false).length;
    const onlineServices = services.filter(s => s.status === 'online').length;
    const today = mounted ? new Date().toLocaleDateString('vi-VN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '';

    return (
        <div className="p-4 md:p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <div className="flex items-center text-xs text-slate-500 mb-1">
                        <Shield size={12} className="mr-1" />
                        <span>Supreme AI Commander</span>
                        <span className="mx-2">/</span>
                        <span className="text-blue-400">Dashboard</span>
                    </div>
                    <h1 className="text-2xl font-bold text-white flex items-center">
                        <LayoutDashboard size={28} className="mr-3 text-blue-400" />
                        CEO Command Center
                    </h1>
                </div>
                <div className="flex items-center space-x-4">
                    <span className="text-xs text-slate-500">{today}</span>
                    {mounted && <span className="px-3 py-1.5 bg-[#16181e] border border-white/5 rounded-lg text-sm text-slate-300 font-mono">{clock}</span>}
                    <button 
                        onClick={handleLogout}
                        className="p-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                        title="Logout"
                    >
                        <LogOut size={16} />
                    </button>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
                <StatsCard label="CPU Load" value={systemStats?.cpu.usage || 0} unit="%" icon={Cpu} color="blue" trend={systemStats?.cpu.usage > 70 ? 'up' : 'stable'} trendText={`${systemStats?.cpu.cores || 0} cores`} />
                <StatsCard label="Active Agents" value={activeAgents} unit={`/ ${agents.length}`} icon={Bot} color="green" trend="stable" trendText={`${agents.filter(a => a.telegramConnected).length} TG connected`} />
                <StatsCard label="Services" value={onlineServices} unit={`/ ${services.length}`} icon={HeartPulse} color="cyan" trend={services.some(s => s.status === 'offline') ? 'down' : 'stable'} trendText={services.some(s => s.status === 'offline') ? 'Has offline' : 'All healthy'} />
                <StatsCard label="Escalations" value={escalations.filter(e => !e.resolved).length} icon={AlertTriangle} color="red" trend={escalations.filter(e => !e.resolved).length > 0 ? 'up' : 'stable'} trendText={`${escalations.filter(e => e.resolved).length} resolved`} />
            </div>

            {/* Row 1: Direct Command + Escalations */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Direct Command Panel */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <h3 className="font-bold text-white text-sm flex items-center mb-4">
                        <Command size={16} className="mr-2 text-amber-400" /> Direct Command to Agent
                    </h3>
                    <div className="space-y-3" suppressHydrationWarning>
                        <select value={directTarget} onChange={e => setDirectTarget(e.target.value)}
                            className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                            <option value="">-- Chọn agent --</option>
                            {agents.map(a => (
                                <option key={a.id} value={a.id}>{a.name} ({a.id}) {a.telegramConnected ? '📱' : '⚠️'}</option>
                            ))}
                        </select>
                        <div className="flex items-center space-x-2">
                            <input type="text" value={directCmd} onChange={e => setDirectCmd(e.target.value)}
                                placeholder="Enter command or message..."
                                onKeyDown={e => e.key === 'Enter' && sendDirectCommand()}
                                className="flex-1 bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-amber-500/50" />
                            <button onClick={sendDirectCommand} disabled={cmdSending || !directTarget}
                                className="px-4 py-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-sm font-medium transition-colors border border-amber-500/20 disabled:opacity-30">
                                <Send size={14} />
                            </button>
                        </div>
                        {cmdResult && <p className="text-xs px-2 py-1.5 bg-black/20 rounded-lg">{cmdResult}</p>}
                        <p className="text-[10px] text-slate-600">Sends directly via Telegram Bot API. Agent must have botToken configured.</p>
                    </div>
                </div>

                {/* Escalation Flow */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white text-sm flex items-center">
                            <Bell size={16} className="mr-2 text-red-400" /> Escalation Feed
                        </h3>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">{escalations.filter(e => !e.resolved).length} open</span>
                    </div>
                    <div className="space-y-2">
                        {escalations.map(esc => (
                            <div key={esc.id} className={`flex items-start space-x-3 px-3 py-2.5 rounded-lg ${esc.resolved ? 'bg-black/10 opacity-50' : 'bg-black/20'}`}>
                                {esc.severity === 'warning' ? <AlertTriangle size={14} className="text-amber-400 mt-0.5 shrink-0" /> : esc.severity === 'info' ? <CheckCircle2 size={14} className="text-blue-400 mt-0.5 shrink-0" /> : <XCircle size={14} className="text-red-400 mt-0.5 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-slate-500">{esc.from}</span>
                                        <span className="text-[10px] text-slate-600">{esc.time}</span>
                                    </div>
                                    <p className="text-xs text-slate-300 mt-0.5">{esc.msg}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Row 2: Gmail + Calendar + Daily Reports */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Gmail Widget */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white text-sm flex items-center">
                            <Mail size={16} className="mr-2 text-red-400" /> Gmail Inbox
                        </h3>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400">{emails.filter(e => !e.read).length} new</span>
                            <a href="https://mail.google.com" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-white flex items-center">
                                Open <ExternalLink size={10} className="ml-1" />
                            </a>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {emails.map(email => (
                            <a href={`https://mail.google.com/mail/u/0/#inbox/${email.id}`} target="_blank" rel="noopener noreferrer" key={email.id} className={`block flex items-start space-x-3 px-3 py-2 rounded-lg cursor-pointer transition-colors hover:bg-white/5 ${!email.read ? 'bg-blue-500/5 border border-blue-500/10' : 'bg-black/20'}`}>
                                {email.read ? <MailOpen size={14} className="text-slate-500 mt-0.5 shrink-0" /> : <Mail size={14} className="text-blue-400 mt-0.5 shrink-0" />}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <span className={`text-xs font-medium ${email.read ? 'text-slate-400' : 'text-white'}`}>{email.from}</span>
                                        <span className="text-[10px] text-slate-600 shrink-0">{email.time}</span>
                                    </div>
                                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{email.subject}</p>
                                </div>
                            </a>
                        ))}
                        {emails.length === 0 && !googleError && <p className="text-xs text-center py-4 text-slate-600">No recent emails</p>}
                        {googleError && <p className="text-xs text-center py-4 text-red-400">Connection Failed (Check Settings)</p>}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-3 pt-2 border-t border-white/5">📌 <a href="/settings" className="hover:text-blue-400 underline">Configure Google Integrations</a></p>
                </div>

                {/* Calendar Widget */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white text-sm flex items-center">
                            <Calendar size={16} className="mr-2 text-purple-400" /> Lịch CEO
                        </h3>
                        <div className="flex items-center space-x-2">
                            <span className="text-xs text-slate-500">{calendarEvents.length} events</span>
                            <a href="https://calendar.google.com" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-white flex items-center">
                                Open <ExternalLink size={10} className="ml-1" />
                            </a>
                        </div>
                    </div>
                    <div className="space-y-2">
                        {calendarEvents.map((evt, idx) => {
                            const now = mounted ? new Date().getHours() : 0;
                            const evtHour = parseInt(evt.time.split(':')[0]);
                            const isPast = now > evtHour;
                            const isCurrent = now === evtHour;
                            return (
                                <a href={evt.htmlLink || 'https://calendar.google.com'} target="_blank" rel="noopener noreferrer" key={idx} className={`block flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors hover:bg-white/5 ${isCurrent ? 'bg-purple-500/10 border border-purple-500/20' : isPast ? 'bg-black/10 opacity-50' : 'bg-black/20'}`}>
                                    <span className={`text-xs font-mono shrink-0 ${isCurrent ? 'text-purple-400 font-bold' : 'text-slate-500'}`}>{evt.time}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-xs truncate ${isCurrent ? 'text-white font-medium' : 'text-slate-400'}`}>{evt.title}</p>
                                    </div>
                                    {isCurrent && <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></span>}
                                </a>
                            );
                        })}
                        {calendarEvents.length === 0 && <p className="text-xs text-center py-4 text-slate-600">No events today</p>}
                    </div>
                    <p className="text-[10px] text-slate-600 mt-3 pt-2 border-t border-white/5">📌 <a href="/settings" className="hover:text-blue-400 underline">Configure Google Integrations</a></p>
                </div>

                {/* Daily Reports */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white text-sm flex items-center">
                            <Clock size={16} className="mr-2 text-cyan-400" /> Daily Reports
                        </h3>
                    </div>
                    <div className="space-y-2">
                        {reports.map((rpt, idx) => (
                            <div key={idx} className="bg-black/20 rounded-lg p-3">
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-mono text-slate-400">{rpt.time}</span>
                                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${rpt.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-500'}`}>{rpt.status}</span>
                                </div>
                                <p className="text-xs font-medium text-white">{rpt.title}</p>
                                <p className="text-[10px] text-slate-500 mt-1">{rpt.summary}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Row 3: Agent Fleet + Telegram Sessions */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Agent Fleet */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white text-sm flex items-center">
                            <Bot size={16} className="mr-2 text-blue-400" /> Agent Fleet
                        </h3>
                        <a href="/agents" className="text-xs text-blue-400 hover:underline flex items-center">Manage <ChevronRight size={12} /></a>
                    </div>
                    <div className="space-y-2">
                        {agents.length > 0 ? agents.map(agent => (
                            <div key={agent.id} className="flex items-center justify-between px-3 py-2.5 bg-black/20 rounded-lg">
                                <div className="flex items-center">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center mr-3">
                                        <Bot size={14} className="text-blue-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{agent.name}</p>
                                        <p className="text-[10px] text-slate-500">{agent.role} · {agent.model} {agent.telegramConnected ? '· 📱 TG' : ''}</p>
                                    </div>
                                </div>
                                <span className={`w-2 h-2 rounded-full ${agent.enabled !== false ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                            </div>
                        )) : (
                            <p className="text-sm text-slate-500 text-center py-4">Loading agents...</p>
                        )}
                    </div>
                </div>

                {/* Service Status Mini */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white text-sm flex items-center">
                            <HeartPulse size={16} className="mr-2 text-emerald-400" /> Infrastructure Health
                        </h3>
                        <a href="/devops" className="text-xs text-blue-400 hover:underline flex items-center">Details <ChevronRight size={12} /></a>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        {services.map((svc, idx) => (
                            <div key={idx} className="flex items-center space-x-2 px-3 py-2 bg-black/20 rounded-lg">
                                {svc.status === 'online' ? <CheckCircle2 size={12} className="text-emerald-400" /> : svc.status === 'offline' ? <XCircle size={12} className="text-red-400" /> : <AlertTriangle size={12} className="text-slate-500" />}
                                <span className="text-xs text-slate-300">{svc.name}</span>
                            </div>
                        ))}
                        {services.length === 0 && <p className="col-span-2 text-center py-4 text-slate-600 text-xs">Loading...</p>}
                    </div>
                    {systemStats && (
                        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-white/5">
                            <div className="text-center">
                                <p className="text-xs font-bold text-white">{systemStats?.cpu?.usage || 0}%</p>
                                <p className="text-[10px] text-slate-500">CPU</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-white">{systemStats?.ram?.usagePercent || 0}%</p>
                                <p className="text-[10px] text-slate-500">RAM</p>
                            </div>
                            <div className="text-center">
                                <p className="text-xs font-bold text-white">{systemStats?.disk?.usagePercent || 0}%</p>
                                <p className="text-[10px] text-slate-500">Disk</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Row 4: Terminal */}
            <Terminal />
        </div>
    );
}
