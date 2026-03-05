'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
    LayoutDashboard,
    Users,
    Radio,
    CheckSquare,
    Activity,
    Server,
    Settings,
    ShieldAlert,
    Menu,
    X
} from 'lucide-react';
import { clsx } from 'clsx';

export function MobileNav() {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    const navItems = [
        { href: '/', label: 'Dashboard', icon: LayoutDashboard },
        { href: '/agents', label: 'Agent Fleet', icon: Users, badge: 3 },
        { href: '/broadcast', label: 'Broadcast', icon: Radio },
        { href: '/tasks', label: 'Mission Control', icon: CheckSquare },
    ];

    const sysItems = [
        { href: '/timeline', label: 'Activity Feed', icon: Activity },
        { href: '/devops', label: 'DevOps Center', icon: Server, color: 'text-red-400' },
        { href: '/settings', label: 'Config', icon: Settings },
    ];

    const isActive = (path: string) => pathname === path;

    return (
        <>
            {/* Mobile Top Bar */}
            <div className="md:hidden flex items-center justify-between px-4 h-16 bg-[#16181e] border-b border-white/5 sticky top-0 z-50">
                <div className="flex items-center">
                    <div className="w-8 h-8 rounded bg-blue-600/20 flex items-center justify-center mr-3 text-blue-400">
                        <ShieldAlert size={18} />
                    </div>
                    <span className="font-bold text-sm tracking-wider text-white">OPENCLAW</span>
                </div>
                <button
                    onClick={() => setIsOpen(!isOpen)}
                    className="p-2 text-zinc-400 hover:text-white"
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>
            </div>

            {/* Mobile Menu Overlay */}
            {isOpen && (
                <div className="md:hidden fixed inset-0 top-16 z-40 bg-[#0f1115] overflow-y-auto p-4 animate-in slide-in-from-top-4 duration-200">
                    <div className="space-y-6">
                        <div>
                            <span className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">Main</span>
                            <nav className="mt-2 space-y-1">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={clsx(
                                            "flex items-center justify-between px-3 py-3 rounded-lg text-sm transition-colors",
                                            isActive(item.href)
                                                ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                                                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200"
                                        )}
                                    >
                                        <div className="flex items-center">
                                            <item.icon size={20} className="mr-3 opacity-80" />
                                            <span>{item.label}</span>
                                        </div>
                                        {item.badge && (
                                            <span className="bg-blue-600 text-white text-[10px] px-1.5 py-0.5 rounded-full min-w-[18px] text-center">
                                                {item.badge}
                                            </span>
                                        )}
                                    </Link>
                                ))}
                            </nav>
                        </div>

                        <div>
                            <span className="px-3 text-[10px] font-bold text-zinc-600 uppercase tracking-widest">System</span>
                            <nav className="mt-2 space-y-1">
                                {sysItems.map((item) => (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        onClick={() => setIsOpen(false)}
                                        className={clsx(
                                            "flex items-center px-3 py-3 rounded-lg text-sm transition-colors",
                                            isActive(item.href)
                                                ? "bg-blue-600/10 text-blue-400 border border-blue-600/20"
                                                : "text-zinc-400 hover:bg-white/5 hover:text-zinc-200",
                                            item.color
                                        )}
                                    >
                                        <item.icon size={20} className="mr-3 opacity-80" />
                                        <span>{item.label}</span>
                                    </Link>
                                ))}
                            </nav>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
