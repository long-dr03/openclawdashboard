'use client';

import { useState, useMemo, useEffect } from 'react';
import { Activity, Radio, CheckSquare, Bot, Cpu, Filter } from 'lucide-react';

interface TimelineEvent {
    type: 'system' | 'broadcast' | 'task' | 'agent';
    title: string;
    desc: string;
    time: Date;
}

export default function TimelinePage() {
    const [filter, setFilter] = useState('all');
    const [now, setNow] = useState<number>(0);

    // Initialize 'now' on mount to avoid hydration mismatch and purity errors
    useEffect(() => {
        const handle = requestAnimationFrame(() => {
            setNow(Date.now());
        });
        // Optional: Update 'now' every minute to keep 'ago' labels fresh
        const interval = setInterval(() => setNow(Date.now()), 60000);
        return () => {
            cancelAnimationFrame(handle);
            clearInterval(interval);
        };
    }, []);

    const events: TimelineEvent[] = useMemo(() => {
        if (now === 0) return [];
        return [
            { type: 'system' as const, title: 'Gateway khởi động', desc: 'OpenClaw Gateway started on port 18789 — v2026.2.6-3', time: new Date(now - 7200000) },
            { type: 'agent' as const, title: 'CEO Agent online', desc: 'Model: gemini-3-pro-high — Session 608e7c42 — 70,266 tokens', time: new Date(now - 3600000) },
            { type: 'agent' as const, title: 'Sales Agent — phiên cuối', desc: 'Model: gemini-2.5-flash-lite — User: @rurimeiko — 28,650 tokens', time: new Date(now - 86400000 * 4) },
            { type: 'agent' as const, title: 'DevOps Agent — phiên cuối', desc: 'Model: gemini-2.5-flash-lite — User: @rurimeiko — 14,293 tokens', time: new Date(now - 86400000 * 4) },
            { type: 'task' as const, title: 'Dashboard Canvas UI deploy', desc: 'CEO Dashboard v4.1 deployed via ngrok', time: new Date(now - 600000) },
            { type: 'system' as const, title: 'PM2 Process mon', desc: 'my-openclaw-bot uptime 3d 4h — memory 125MB — CPU 2.1%', time: new Date(now - 1800000) },
            { type: 'broadcast' as const, title: 'Test Broadcast', desc: 'System test broadcast to all agents', time: new Date(now - 18000000) },
        ].sort((a, b) => b.time.getTime() - a.time.getTime());
    }, [now]);

    const filtered = filter === 'all' ? events : events.filter(e => e.type === filter);

    const typeIcon: Record<string, typeof Activity> = {
        system: Cpu,
        broadcast: Radio,
        task: CheckSquare,
        agent: Bot,
    };

    const typeColors: Record<string, string> = {
        system: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
        broadcast: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
        task: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        agent: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    };

    const filters = [
        { key: 'all', label: 'Tất cả', icon: Filter },
        { key: 'broadcast', label: 'Broadcast', icon: Radio },
        { key: 'task', label: 'Tasks', icon: CheckSquare },
        { key: 'agent', label: 'Agents', icon: Bot },
        { key: 'system', label: 'System', icon: Cpu },
    ];

    const formatTime = (date: Date) => {
        if (now === 0) return '...';
        const diff = now - date.getTime();
        const minutes = Math.floor(diff / 60000);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center">
                        <Activity size={28} className="mr-3 text-cyan-400" />
                        Activity Feed
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">System events, agent activity, and broadcast history</p>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center space-x-2 mb-6">
                {filters.map(f => (
                    <button
                        key={f.key}
                        onClick={() => setFilter(f.key)}
                        className={`flex items-center px-3 py-1.5 rounded-lg text-xs font-medium transition-colors border ${filter === f.key
                                ? 'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                : 'bg-[#16181e] text-slate-500 border-white/5 hover:text-white hover:border-white/10'
                            }`}
                    >
                        <f.icon size={12} className="mr-1.5" />
                        {f.label}
                    </button>
                ))}
            </div>

            {/* Timeline */}
            <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-6 top-0 bottom-0 w-px bg-white/5"></div>

                <div className="space-y-4">
                    {filtered.map((event, idx) => {
                        const Icon = typeIcon[event.type] || Activity;
                        const color = typeColors[event.type] || 'text-slate-400 bg-slate-500/10 border-slate-500/20';
                        return (
                            <div key={idx} className="relative flex items-start pl-14">
                                {/* Icon */}
                                <div className={`absolute left-2.5 w-7 h-7 rounded-full flex items-center justify-center border ${color}`}>
                                    <Icon size={13} />
                                </div>
                                {/* Content */}
                                <div className="flex-1 bg-[#16181e] border border-white/5 rounded-xl p-4 hover:bg-[#1a1d24] transition-colors">
                                    <div className="flex items-center justify-between mb-1">
                                        <h4 className="font-bold text-white text-sm">{event.title}</h4>
                                        <span className="text-[10px] text-slate-500 shrink-0">{formatTime(event.time)}</span>
                                    </div>
                                    <p className="text-xs text-slate-400">{event.desc}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
