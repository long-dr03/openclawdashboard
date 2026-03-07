'use client';

import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle() {
    const [theme, setTheme] = useState<'dark' | 'light'>('dark');
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        const savedTheme = localStorage.getItem('theme') as 'dark' | 'light';
        if (savedTheme) {
            setTheme(savedTheme);
            document.documentElement.classList.toggle('light', savedTheme === 'light');
        }
    }, []);

    const toggleTheme = () => {
        const newTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(newTheme);
        localStorage.setItem('theme', newTheme);
        document.documentElement.classList.toggle('light', newTheme === 'light');
    };

    if (!mounted) return null;

    return (
        <button
            onClick={toggleTheme}
            className="w-full flex items-center px-3 py-2 rounded-lg text-sm transition-colors text-[var(--text-dim)] hover:bg-[var(--border-main)] hover:text-[var(--text-main)] cursor-pointer"
        >
            {theme === 'dark' ? (
                <>
                    <Sun size={18} className="mr-3 opacity-80" />
                    <span>Light Mode</span>
                </>
            ) : (
                <>
                    <Moon size={18} className="mr-3 opacity-80 text-blue-500" />
                    <span>Dark Mode</span>
                </>
            )}
        </button>
    );
}
