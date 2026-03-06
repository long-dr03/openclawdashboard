'use client';

import { useState, useEffect, useRef } from 'react';
import { Terminal as TermIcon } from 'lucide-react';

interface LogEntry {
    time: string;
    level: 'INFO' | 'OK' | 'WARN' | 'ERROR';
    msg: string;
}

export function Terminal() {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const termRef = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(false);

    // Initialize logs only on client (avoids hydration mismatch from Date)
    useEffect(() => {
        const handle = requestAnimationFrame(() => {
            const now = () => new Date().toLocaleTimeString('en-GB', { hour12: false });
            setLogs([
                { time: now(), level: 'OK', msg: 'Connected to OpenClaw Gateway on port 18789.' },
                { time: now(), level: 'INFO', msg: 'CEO Agent online — gemini-3-pro-high — 70,266 tokens used.' },
                { time: now(), level: 'WARN', msg: 'Sales Bot (sales_bot) — No Telegram token configured!' },
                { time: now(), level: 'INFO', msg: 'Dashboard UI v4.1 loaded — Production mode.' },
            ]);
            setMounted(true);
        });
        return () => cancelAnimationFrame(handle);
    }, []);

    // Simulate live logs
    useEffect(() => {
        if (!mounted) return;
        const messages = [
            { level: 'INFO' as const, msg: 'Heartbeat OK — All systems nominal.' },
            { level: 'OK' as const, msg: 'CEO Bot processed incoming message from @Dragonccm.' },
            { level: 'INFO' as const, msg: 'Gateway health check passed — latency 12ms.' },
            { level: 'WARN' as const, msg: 'Memory usage at 78% — consider optimization.' },
            { level: 'OK' as const, msg: 'Task "Analyze Market" completed by Market Bot.' },
            { level: 'INFO' as const, msg: 'PM2 process my-openclaw-bot: CPU 2.1%, Mem 125MB.' },
        ];
        const interval = setInterval(() => {
            const entry = messages[Math.floor(Math.random() * messages.length)];
            setLogs(prev => {
                const next = [...prev, { ...entry, time: new Date().toLocaleTimeString('en-GB', { hour12: false }) }];
                return next.slice(-30);
            });
        }, 4000);
        return () => clearInterval(interval);
    }, [mounted]);

    // Auto-scroll
    useEffect(() => {
        if (termRef.current) {
            termRef.current.scrollTop = termRef.current.scrollHeight;
        }
    }, [logs]);

    const levelColors: Record<string, string> = {
        'INFO': 'text-blue-400',
        'OK': 'text-emerald-400',
        'WARN': 'text-amber-400',
        'ERROR': 'text-red-400',
    };

    return (
        <div className="bg-[#16181e] border border-white/5 rounded-xl overflow-hidden">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                <div className="flex items-center">
                    <TermIcon size={18} className="mr-2 text-emerald-400" />
                    <h3 className="font-bold text-white text-sm">Live System Logs</h3>
                </div>
                <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-xs text-emerald-400 font-mono">LIVE</span>
                    </div>
                    <button 
                        onClick={() => setLogs([])}
                        className="text-xs text-slate-500 hover:text-white px-2 py-1 rounded hover:bg-white/5 transition-colors"
                    >
                        Clear
                    </button>
                </div>
            </div>
            <div 
                ref={termRef}
                className="relative h-48 overflow-y-auto p-4 font-mono text-xs bg-[#0a0c10] space-y-1"
            >
                {/* Scanline effect */}
                <div className="scanline"></div>
                {logs.length === 0 ? (
                    <p className="text-slate-600 text-center py-8">No logs yet...</p>
                ) : (
                    logs.map((log, idx) => (
                        <div key={idx} className="flex items-start leading-relaxed hover:bg-white/[0.02] px-1 rounded">
                            <span className="text-slate-600 mr-3 shrink-0">[{log.time}]</span>
                            <span className={`font-bold mr-3 shrink-0 w-10 ${levelColors[log.level]}`}>{log.level}</span>
                            <span className="text-slate-300">{log.msg}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
