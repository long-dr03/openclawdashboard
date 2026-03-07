'use client';

import { useState } from 'react';
import { Crown, Mail, Calendar, Settings, Newspaper, ToggleLeft, ToggleRight, MessageSquare, Briefcase, FileText, Search, PieChart, Target, DollarSign, BrainCircuit } from 'lucide-react';
import { ThemeToggle } from '@/components/ThemeToggle';

const NEWS_CATEGORIES = [
    'Kinh tế', 'Chính trị', 'Xã hội', 'Công nghệ', 'Giải trí', 'Văn hoá', 'Đời sống'
];

const CEO_SKILLS = [
    { id: 'search', name: 'Web Search', icon: Search, enabled: true },
    { id: 'pdf', name: 'Đọc file PDF', icon: FileText, enabled: true },
    { id: 'deep_marketing', name: 'Deep Search Marketing', icon: Target, enabled: false },
    { id: 'planning', name: 'Planning & Scheduling', icon: Calendar, enabled: true },
    { id: 'strategy', name: 'Business Strategy', icon: BrainCircuit, enabled: false },
    { id: 'sale', name: 'Sale Management', icon: Briefcase, enabled: true },
    { id: 'finance', name: 'Finance Skill', icon: DollarSign, enabled: false }
];

export default function CEOCenterPage() {
    const [newsConfig, setNewsConfig] = useState<Record<string, boolean>>(
        NEWS_CATEGORIES.reduce((acc, cat) => ({ ...acc, [cat]: true }), {})
    );
    const [skills, setSkills] = useState(CEO_SKILLS);
    const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);
    const [newsLoading, setNewsLoading] = useState(false);
    const [newsResult, setNewsResult] = useState<string | null>(null);

    const toggleNews = (cat: string) => {
        setNewsConfig(prev => ({ ...prev, [cat]: !prev[cat] }));
    };

    const toggleSkill = (id: string) => {
        setSkills(prev => prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s));
    };

    const handleGetNews = async () => {
        setNewsLoading(true);
        setNewsResult(null);
        try {
            const activeTags = Object.keys(newsConfig).filter(k => newsConfig[k]);
            const res = await fetch('/api/ceo/news-now', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ tags: activeTags })
            });
            const data = await res.json();
            if (data.success) {
                setNewsResult(data.summary);
                setToast({ type: 'success', msg: 'Đã lấy tin tức thành công!' });
            } else {
                setToast({ type: 'error', msg: data.error || 'Lỗi lấy tin tức' });
            }
        } catch (e: any) {
            setToast({ type: 'error', msg: e.message });
        } finally {
            setNewsLoading(false);
            setTimeout(() => setToast(null), 3000);
        }
    };

    const handleSave = () => {
        setToast({ type: 'success', msg: 'Lưu cấu hình CEO thành công!' });
        setTimeout(() => setToast(null), 3000);
    };

    return (
        <div className="p-8">
            {toast && (
                <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-xl backdrop-blur-sm border bg-emerald-500/20 border-emerald-500/30 text-emerald-300">
                    {toast.msg}
                </div>
            )}

            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center">
                        <Crown size={28} className="mr-3 text-blue-400" />
                        CEO Center Configuration
                    </h1>
                    <p className="text-[var(--text-dim)] text-sm mt-1">
                        Quản lý kỹ năng, thông tin và quyền điều khiển của Agent CEO
                    </p>
                </div>
                <div className="flex items-center space-x-4">
                    <ThemeToggle />
                    <button onClick={handleSave} className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-blue-600/20">
                        Lưu Cấu Hình
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* News Feed Config */}
                <div className="card-panel p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-bold text-[var(--text-main)] flex items-center">
                            <Newspaper className="mr-2 text-blue-400" size={20} />
                            Cấu Hình News Feed
                        </h2>
                        <button 
                            onClick={handleGetNews}
                            disabled={newsLoading}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${newsLoading ? 'bg-slate-800 text-[var(--text-dim)]' : 'bg-blue-600/10 text-blue-400 border border-blue-600/20 hover:bg-blue-600/20'}`}
                        >
                            {newsLoading ? 'Đang lấy tin...' : 'Lấy tin tức ngay'}
                        </button>
                    </div>
                    <p className="text-sm text-[var(--text-dim)] mb-4">Chọn các chủ đề bản tin mà CEO sẽ theo dõi và tóm tắt hàng ngày.</p>
                    <div className="space-y-3">
                        {NEWS_CATEGORIES.map(cat => (
                            <div key={cat} className="flex items-center justify-between p-3 rounded-lg bg-[var(--bg-main)] border border-[var(--border-main)]">
                                <span className="text-sm text-[var(--text-main)] font-medium">{cat}</span>
                                <button onClick={() => toggleNews(cat)} className="text-[var(--text-dim)] hover:text-blue-400 transition-colors">
                                    {newsConfig[cat] ? <ToggleRight size={24} className="text-blue-400" /> : <ToggleLeft size={24} />}
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* News Result Display */}
                    {newsResult && (
                        <div className="mt-6 p-4 rounded-lg bg-blue-500/5 border border-blue-500/20">
                            <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-2">Bản tin mẫu vừa lấy:</h3>
                            <div className="text-sm text-[var(--text-main)] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto pr-2 custom-scrollbar">
                                {newsResult}
                            </div>
                        </div>
                    )}
                </div>

                <div className="space-y-8">
                    {/* Integrations */}
                    <div className="card-panel p-6">
                        <h2 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center">
                            <Settings className="mr-2 text-purple-400" size={20} />
                            Tích Hợp Dịch Vụ
                        </h2>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-main)] border border-[var(--border-main)]">
                                <div className="flex items-center">
                                    <Mail className="text-red-400 mr-3" size={20} />
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-main)]">Google Mail</p>
                                        <p className="text-xs text-[var(--text-dim)]">Đọc và trả lời email tự động</p>
                                    </div>
                                </div>
                                <button className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30">Kết nối</button>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-main)] border border-[var(--border-main)]">
                                <div className="flex items-center">
                                    <Calendar className="text-blue-400 mr-3" size={20} />
                                    <div>
                                        <p className="text-sm font-medium text-[var(--text-main)]">Google Calendar</p>
                                        <p className="text-xs text-[var(--text-dim)]">Quản lý lịch trình, cuộc họp</p>
                                    </div>
                                </div>
                                <button className="px-3 py-1.5 bg-blue-600/20 text-blue-400 rounded-lg text-xs font-medium hover:bg-blue-600/30">Kết nối</button>
                            </div>
                        </div>
                    </div>

                    {/* Inter-Agent Comms */}
                    <div className="card-panel p-6">
                        <h2 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center">
                            <MessageSquare className="mr-2 text-emerald-400" size={20} />
                            Điều Phối & Phân Việc
                        </h2>
                        <div className="p-4 rounded-lg bg-[var(--bg-main)] border border-[var(--border-main)] space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-[var(--text-main)]">Direct Message (DM)</p>
                                    <p className="text-xs text-[var(--text-dim)]">Cho phép CEO DM trực tiếp đến Agent Sale</p>
                                </div>
                                <ToggleRight size={24} className="text-emerald-400" />
                            </div>
                            <div className="text-xs text-[var(--text-dim)] flex items-center bg-black/30 p-2 rounded border border-[var(--border-main)]">
                                <span className="text-blue-400 mr-2">Luồng:</span> CEO (Telegram) <span className="mx-2">→</span> Sale (Telegram/Zalo)
                            </div>
                        </div>
                    </div>
                </div>

                {/* Skills Setup */}
                <div className="card-panel p-6 lg:col-span-2">
                    <h2 className="text-lg font-bold text-[var(--text-main)] mb-4 flex items-center">
                        <BrainCircuit className="mr-2 text-amber-400" size={20} />
                        Kỹ Năng Của CEO (Skills)
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {skills.map(skill => (
                            <div key={skill.id} className={`flex items-center justify-between p-4 rounded-lg border transition-all ${skill.enabled ? 'bg-amber-500/10 border-amber-500/20' : 'bg-[var(--bg-main)] border-[var(--border-main)]'}`}>
                                <div className="flex items-center">
                                    <skill.icon size={18} className={`mr-3 ${skill.enabled ? 'text-amber-400' : 'text-[var(--text-dim)]'}`} />
                                    <span className={`text-sm font-medium ${skill.enabled ? 'text-amber-100' : 'text-[var(--text-dim)]'}`}>{skill.name}</span>
                                </div>
                                <button onClick={() => toggleSkill(skill.id)} className="transition-colors">
                                    {skill.enabled ? <ToggleRight size={24} className="text-amber-400" /> : <ToggleLeft size={24} className="text-[var(--text-muted)]" />}
                                </button>
                            </div>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
}
