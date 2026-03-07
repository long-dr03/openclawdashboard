'use client';

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
  ShieldAlert 
} from 'lucide-react';
import { clsx } from 'clsx';
import { ThemeToggle } from './ThemeToggle';

export function Sidebar() {
  const pathname = usePathname();
  
  const navItems = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/agents', label: 'Agent Fleet', icon: Users, badge: 3 },
    { href: '/ceo', label: 'CEO Center', icon: ShieldAlert },
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
    <aside className="w-64 border-r border-[var(--border-main)] bg-[var(--bg-sidebar)] flex flex-col h-screen fixed left-0 top-0 z-50 transition-colors duration-300">
      {/* Brand */}
      <div className="h-16 flex items-center px-6 border-b border-[var(--border-main)]">
        <div className="w-8 h-8 rounded bg-blue-600/20 flex items-center justify-center mr-3 text-blue-400">
           <ShieldAlert size={18} />
        </div>
        <div>
            <h1 className="font-bold text-sm tracking-wider text-[var(--text-main)] uppercase">OPENCLAW</h1>
            <p className="text-[10px] text-[var(--text-muted)] font-mono">CEO COMMAND CENTER</p>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 py-6 px-3 space-y-6 overflow-y-auto">
        
        <div>
            <span className="px-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Main</span>
            <nav className="mt-2 space-y-1">
                {navItems.map((item) => (
                    <Link 
                        key={item.href} 
                        href={item.href}
                        className={clsx(
                            "flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all",
                            isActive(item.href) 
                                ? "bg-blue-600/10 text-blue-400 border border-blue-600/20 shadow-sm" 
                                : "text-[var(--text-dim)] hover:bg-[var(--border-main)] hover:text-[var(--text-main)]"
                        )}
                    >
                        <div className="flex items-center">
                            <item.icon size={18} className="mr-3 opacity-80" />
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
            <span className="px-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">System</span>
            <nav className="mt-2 space-y-1">
                {sysItems.map((item) => (
                    <Link 
                        key={item.href} 
                        href={item.href}
                        className={clsx(
                            "flex items-center px-3 py-2 rounded-lg text-sm transition-all",
                            isActive(item.href) 
                                ? "bg-blue-600/10 text-blue-400 border border-blue-600/20" 
                                : "text-[var(--text-dim)] hover:bg-[var(--border-main)] hover:text-[var(--text-main)]",
                            item.color
                        )}
                    >
                        <item.icon size={18} className="mr-3 opacity-80" />
                        <span>{item.label}</span>
                    </Link>
                ))}
            </nav>
        </div>

        {/* Theme Toggle - Moved to Sidebar */}
        <div>
            <span className="px-3 text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-widest">Appearance</span>
            <nav className="mt-2 space-y-1">
                <ThemeToggle />
            </nav>
        </div>

      </div>

      {/* Footer Status */}
      <div className="p-4 border-t border-[var(--border-main)] bg-[var(--bg-main)] opacity-80">
        <div className="flex items-center space-x-2 mb-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs text-emerald-500 font-medium uppercase tracking-tight">System Online</span>
        </div>
        <div className="text-[10px] text-[var(--text-muted)] font-mono leading-relaxed">
            Host: CTH-LAP-HVA-002<br/>
            Uptime: 3d 4h 12m
        </div>
      </div>
    </aside>
  );
}
