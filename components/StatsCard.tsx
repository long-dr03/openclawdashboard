'use client';

import { LucideIcon } from 'lucide-react';
import { clsx } from 'clsx';

interface StatsCardProps {
    label: string;
    value: string | number;
    unit?: string;
    trend?: 'up' | 'down' | 'stable' | string;
    trendText?: string;
    trendUp?: boolean;
    icon: LucideIcon;
    color: 'blue' | 'purple' | 'green' | 'cyan' | 'red';
}

export function StatsCard({ label, value, unit, trend, trendText, trendUp, icon: Icon, color }: StatsCardProps) {
    const colorStyles = {
        blue: 'text-blue-400 bg-blue-400/10 border-blue-400/20 shadow-[0_0_15px_rgba(59,130,246,0.15)]',
        purple: 'text-purple-400 bg-purple-400/10 border-purple-400/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]',
        green: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
        cyan: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]',
        red: 'text-red-400 bg-red-400/10 border-red-400/20 shadow-[0_0_15px_rgba(239,68,68,0.15)]',
    };

    const isUp = trendUp ?? trend === 'up';
    const trendLabel = trendText || trend || '';
    const trendArrow = isUp ? '↑' : trend === 'down' ? '↓' : '—';
    const trendColor = isUp ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-slate-400';

    return (
        <div className={clsx(
            "relative p-5 rounded-xl border bg-[#16181e] transition-all hover:-translate-y-1",
            colorStyles[color].split(' ').filter(c => c.startsWith('border') || c.startsWith('shadow')).join(' ')
        )}>
            {/* Glow effect */}
            <div className={clsx("absolute inset-0 rounded-xl opacity-20 blur-xl pointer-events-none", colorStyles[color].split(' ')[1])}></div>

            <div className="flex justify-between items-start relative z-10">
                <div>
                    <p className="text-slate-400 text-xs font-medium uppercase tracking-wider mb-1">{label}</p>
                    <div className="flex items-baseline">
                        <h3 className="text-2xl font-bold text-white tracking-tight">{value}</h3>
                        {unit && <span className="ml-1 text-slate-500 text-sm font-mono">{unit}</span>}
                    </div>
                </div>
                <div className={clsx("p-2 rounded-lg", colorStyles[color].split(' ').slice(0, 3).join(' '))}>
                    <Icon size={20} />
                </div>
            </div>

            {trendLabel && (
                <div className="mt-3 flex items-center text-xs relative z-10">
                    <span className={clsx("font-medium mr-2", trendColor)}>
                        {trendArrow} {trendLabel}
                    </span>
                </div>
            )}
        </div>
    );
}
