'use client';

import { useState, useEffect, useCallback } from 'react';
import { Radio, Send, Bold, Italic, Code, List, Smile, Eraser, Clock } from 'lucide-react';

interface Agent {
    id: string;
    name: string;
    role?: string;
    model?: string;
    status?: string;
    enabled?: boolean;
    telegramConnected?: boolean;
    zaloConnected?: boolean;
}

interface BroadcastHistory {
    id: number;
    subject: string;
    priority: string;
    targets: string[];
    time: string;
    status: string;
}

const templates: Record<string, { subject: string; msg: string }> = {
    maintenance: { subject: '🔧 Thông báo bảo trì hệ thống', msg: 'Hệ thống sẽ được bảo trì vào lúc [thời gian].\n\nCác tác vụ đang chạy sẽ được tạm dừng.\nVui lòng hoàn thành công việc trước thời điểm bảo trì.' },
    update: { subject: '🚀 Cập nhật hệ thống mới', msg: 'Hệ thống đã được cập nhật lên phiên bản mới.\n\nCác thay đổi:\n- [Thay đổi 1]\n- [Thay đổi 2]\n\nVui lòng kiểm tra và báo cáo nếu có lỗi.' },
    alert: { subject: '⚠️ Cảnh báo quan trọng', msg: 'CẢNH BÁO: [Mô tả cảnh báo]\n\nHành động cần thực hiện:\n- [Hành động 1]\n\nĐộ ưu tiên: CAO' },
    meeting: { subject: '📋 Thông báo họp / Sync', msg: 'Cuộc họp đồng bộ sẽ diễn ra vào:\n📅 Ngày: [ngày]\n⏰ Giờ: [giờ]\n📍 Kênh: [kênh]\n\nNội dung:\n- [Nội dung 1]' },
    task: { subject: '📌 Giao việc mới', msg: 'Nhiệm vụ mới được giao:\n\n📋 Tên: [Tên nhiệm vụ]\n📝 Mô tả: [Mô tả]\n⏰ Deadline: [Deadline]\n🏷️ Ưu tiên: [Mức độ]' },
    welcome: { subject: '👋 Chào mừng agent mới', msg: 'Chào mừng bạn đã gia nhập hệ thống OpenClaw!\n\n📋 Thông tin:\n- Tên: [Tên agent]\n- Vai trò: [Vai trò]\n- Model: [AI Model]\n\nVui lòng xác nhận trạng thái hoạt động.' },
};

export default function BroadcastPage() {
    const [agents, setAgents] = useState<Agent[]>([]);
    const [selectedAgents, setSelectedAgents] = useState<Set<string>>(new Set());
    const [priority, setPriority] = useState('normal');
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [targetId, setTargetId] = useState('');
    const [history, setHistory] = useState<BroadcastHistory[]>([]);
    const [sending, setSending] = useState(false);
    const [toast, setToast] = useState<{ type: string; msg: string } | null>(null);
    const [broadcastCounter, setBroadcastCounter] = useState(0);

    const showToast = (type: string, msg: string) => {
        setToast({ type, msg });
        setTimeout(() => setToast(null), 4000);
    };

    useEffect(() => {
        fetch('/api/agents').then(r => r.json()).then(data => {
            if (Array.isArray(data)) setAgents(data);
        }).catch(console.error);
    }, []);

    const toggleAgent = (id: string) => {
        setSelectedAgents(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectAllAgents = (select: boolean) => {
        if (select) setSelectedAgents(new Set(agents.map(a => a.id)));
        else setSelectedAgents(new Set());
    };

    const applyTemplate = (key: string) => {
        const tmpl = templates[key];
        if (tmpl) {
            setSubject(tmpl.subject);
            setMessage(tmpl.msg);
        }
    };

    const insertFormat = (before: string, after: string) => {
        const ta = document.getElementById('broadcast-message') as HTMLTextAreaElement;
        if (!ta) return;
        const start = ta.selectionStart, end = ta.selectionEnd;
        const selected = ta.value.substring(start, end);
        const newVal = ta.value.substring(0, start) + before + selected + after + ta.value.substring(end);
        setMessage(newVal);
        setTimeout(() => {
            ta.focus();
            ta.selectionStart = start + before.length;
            ta.selectionEnd = start + before.length + selected.length;
        }, 10);
    };

    const clearForm = () => {
        setSubject('');
        setMessage('');
        setTargetId('');
        setPriority('normal');
        setSelectedAgents(new Set());
    };

    const sendBroadcast = async () => {
        if (!message.trim()) { showToast('error', 'Nhập nội dung thông báo!'); return; }
        if (selectedAgents.size === 0 && !targetId.trim()) { showToast('error', 'Chọn ít nhất 1 agent hoặc nhập Telegram ID!'); return; }

        setSending(true);
        try {
            const targets = targetId.trim() ? [targetId.trim()] : Array.from(selectedAgents);
            const res = await fetch('/api/broadcast', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subject, message, priority, targets }),
            });
            const data = await res.json();

            if (data.success) {
                const newCount = broadcastCounter + 1;
                setBroadcastCounter(newCount);
                showToast('success', `Broadcast #${newCount} sent to ${targets.length} targets!`);

                setHistory(prev => [{
                    id: newCount,
                    subject: subject || '(No subject)',
                    priority,
                    targets,
                    time: new Date().toLocaleTimeString('vi-VN', { hour12: false }),
                    status: 'sent',
                }, ...prev]);

                clearForm();
            } else {
                showToast('error', data.error || 'Broadcast failed');
            }
        } catch (e: any) {
            showToast('error', e.message);
        } finally {
            setSending(false);
        }
    };

    const priorityOptions = [
        { value: 'urgent', label: 'Urgent', color: 'bg-red-500/20 text-red-400 border-red-500/20' },
        { value: 'normal', label: 'Normal', color: 'bg-blue-500/20 text-blue-400 border-blue-500/20' },
        { value: 'low', label: 'Low', color: 'bg-slate-500/20 text-slate-400 border-slate-500/20' },
    ];

    return (
        <div className="p-8">
            {/* Toast */}
            {toast && (
                <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-xl backdrop-blur-sm border transition-all
                    ${toast.type === 'success' ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : ''}
                    ${toast.type === 'error' ? 'bg-red-500/20 border-red-500/30 text-red-300' : ''}
                    ${toast.type === 'info' ? 'bg-blue-500/20 border-blue-500/30 text-blue-300' : ''}
                `}>{toast.msg}</div>
            )}

            {/* Header */}
            <div className="mb-8">
                <h1 className="text-2xl font-bold text-[var(--text-main)] flex items-center">
                    <Radio size={28} className="mr-3 text-purple-400" />
                    Broadcast Center
                </h1>
                <p className="text-[var(--text-dim)] text-sm mt-1">Send messages and notifications to your agent fleet</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Compose Panel */}
                <div className="lg:col-span-2 bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-5 shadow-sm">
                    <h3 className="font-bold text-[var(--text-main)] text-sm mb-4 flex items-center">
                        <Send size={16} className="mr-2 text-blue-400" /> Soạn Broadcast
                    </h3>

                    {/* Agent Selection */}
                    <div className="mb-4">
                        <label className="text-xs text-[var(--text-dim)] mb-2 block">Chọn Agents nhận thông báo:</label>
                        <div className="space-y-1.5 max-h-36 overflow-y-auto">
                            {agents.map(agent => (
                                <div
                                    key={agent.id}
                                    onClick={() => toggleAgent(agent.id)}
                                    className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors border ${selectedAgents.has(agent.id)
                                        ? 'bg-blue-500/10 border-blue-500/20'
                                        : 'bg-[var(--bg-main)] border-transparent hover:bg-[var(--border-main)]'
                                        }`}
                                >
                                    <div className="flex items-center">
                                        <div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center text-[9px] ${selectedAgents.has(agent.id) ? 'bg-blue-500 border-blue-500 text-white' : 'border-[var(--text-muted)]'
                                            }`}>
                                            {selectedAgents.has(agent.id) && '✓'}
                                        </div>
                                        <div>
                                            <span className="text-sm text-[var(--text-main)]">{agent.name}</span>
                                            <span className="text-xs text-[var(--text-dim)] ml-2">{agent.role} · {agent.model}</span>
                                            {agent.telegramConnected && <span className="text-[9px] ml-1.5 px-1 rounded bg-blue-500/10 text-blue-400">📱TG</span>}
                                            {agent.zaloConnected && <span className="text-[9px] ml-1 px-1 rounded bg-cyan-500/10 text-cyan-400">💬Zalo</span>}
                                        </div>
                                    </div>
                                    <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${agent.enabled !== false ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-500/20 text-slate-500'
                                        }`}>{agent.enabled !== false ? 'ACTIVE' : 'IDLE'}</span>
                                </div>
                            ))}
                        </div>
                        <div className="flex items-center space-x-3 mt-2">
                            <button onClick={() => selectAllAgents(true)} className="text-xs text-blue-400 hover:underline">✓✓ Chọn tất cả</button>
                            <button onClick={() => selectAllAgents(false)} className="text-xs text-[var(--text-dim)] hover:underline">☐ Bỏ chọn</button>
                        </div>
                    </div>

                    {/* Priority */}
                    <div className="mb-4">
                        <label className="text-xs text-[var(--text-dim)] mb-2 block">Mức độ ưu tiên:</label>
                        <div className="flex items-center space-x-2">
                            {priorityOptions.map(opt => (
                                <label key={opt.value} className="cursor-pointer">
                                    <input type="radio" name="priority" value={opt.value} checked={priority === opt.value} onChange={e => setPriority(e.target.value)} className="sr-only" />
                                    <span className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${priority === opt.value ? opt.color : 'bg-[var(--bg-main)] text-[var(--text-dim)] border-transparent'}`}>
                                        {opt.label}
                                    </span>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Template */}
                    <div className="mb-4">
                        <label className="text-xs text-[var(--text-dim)] mb-1 block">Template nhanh:</label>
                        <select onChange={e => applyTemplate(e.target.value)} className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-3 py-2 text-sm text-[var(--text-main)] focus:outline-none focus:border-blue-500/50">
                            <option value="">— Chọn template —</option>
                            <option value="maintenance">🔧 Bảo trì hệ thống</option>
                            <option value="update">🚀 Cập nhật hệ thống</option>
                            <option value="alert">⚠️ Cảnh báo quan trọng</option>
                            <option value="meeting">📋 Họp / Sync</option>
                            <option value="task">📌 Giao việc mới</option>
                            <option value="welcome">👋 Chào mừng agent mới</option>
                        </select>
                    </div>

                    {/* Subject */}
                    <div className="mb-4">
                        <label className="text-xs text-[var(--text-dim)] mb-1 block">Tiêu đề:</label>
                        <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                            placeholder="Nhập tiêu đề thông báo..."
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500/50" />
                    </div>

                    {/* Target Telegram ID */}
                    <div className="mb-4">
                        <label className="text-xs text-[var(--text-dim)] mb-1 block">Target Telegram ID (Optional):</label>
                        <input type="text" value={targetId} onChange={e => setTargetId(e.target.value)}
                            placeholder="Nhập Chat ID (nếu gửi riêng)..."
                            className="w-full bg-[var(--bg-input)] border border-[var(--border-main)] rounded-lg px-4 py-2.5 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none focus:border-blue-500/50" />
                    </div>

                    {/* Message */}
                    <div className="mb-4">
                        <label className="text-xs text-[var(--text-dim)] mb-1 block">Nội dung:</label>
                        <div className="border border-[var(--border-main)] rounded-lg overflow-hidden">
                            <div className="flex items-center space-x-1 px-3 py-2 bg-[var(--bg-main)] border-b border-[var(--border-main)]">
                                <button onClick={() => insertFormat('**', '**')} className="p-1.5 rounded hover:bg-[var(--border-main)] text-[var(--text-dim)]"><Bold size={14} /></button>
                                <button onClick={() => insertFormat('_', '_')} className="p-1.5 rounded hover:bg-[var(--border-main)] text-[var(--text-dim)]"><Italic size={14} /></button>
                                <button onClick={() => insertFormat('`', '`')} className="p-1.5 rounded hover:bg-[var(--border-main)] text-[var(--text-dim)]"><Code size={14} /></button>
                                <button onClick={() => insertFormat('\n- ', '')} className="p-1.5 rounded hover:bg-[var(--border-main)] text-[var(--text-dim)]"><List size={14} /></button>
                                <div className="w-px h-4 bg-[var(--border-main)] mx-1"></div>
                                <button onClick={() => insertFormat('👉 ', '')} className="p-1.5 rounded hover:bg-[var(--border-main)] text-[var(--text-dim)]"><Smile size={14} /></button>
                            </div>
                            <textarea
                                id="broadcast-message"
                                value={message}
                                onChange={e => setMessage(e.target.value)}
                                placeholder="Nhập nội dung thông báo cho các agents..."
                                rows={6}
                                className="w-full bg-[var(--bg-input)] px-4 py-3 text-sm text-[var(--text-main)] placeholder-[var(--text-muted)] focus:outline-none resize-none"
                            />
                            <div className="px-3 py-1.5 bg-[var(--bg-main)] text-xs text-[var(--text-muted)]">{message.length} ký tự</div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end space-x-3 pt-3 border-t border-[var(--border-main)]">
                        <button onClick={clearForm} className="flex items-center px-4 py-2 rounded-lg text-sm text-[var(--text-dim)] hover:text-[var(--text-main)] hover:bg-[var(--bg-main)] transition-colors">
                            <Eraser size={14} className="mr-2" /> Xóa form
                        </button>
                        <button
                            onClick={sendBroadcast}
                            disabled={sending}
                            className="flex items-center px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-600/20 disabled:opacity-50"
                        >
                            <Send size={14} className="mr-2" /> {sending ? 'Đang gửi...' : 'Gửi Broadcast'}
                        </button>
                    </div>
                </div>

                {/* History Panel */}
                <div className="bg-[var(--bg-card)] border border-[var(--border-main)] rounded-xl p-5 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-[var(--text-main)] text-sm flex items-center">
                            <Clock size={16} className="mr-2 text-[var(--text-dim)]" /> Lịch sử Broadcast
                        </h3>
                        <span className="text-xs text-[var(--text-dim)]">{history.length}</span>
                    </div>
                    {history.length === 0 ? (
                        <div className="text-center py-12 text-[var(--text-muted)]">
                            <Radio size={32} className="mx-auto mb-2 opacity-20" />
                            <p className="text-sm">Chưa có broadcast nào</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {history.map(h => (
                                <div key={h.id} className="bg-[var(--bg-main)] rounded-lg p-3 border border-[var(--border-main)]">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-xs font-bold text-[var(--text-main)]">#{h.id}</span>
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${h.priority === 'urgent' ? 'bg-red-500/20 text-red-400' : h.priority === 'normal' ? 'bg-blue-500/20 text-blue-400' : 'bg-slate-500/20 text-slate-400'
                                            }`}>{h.priority}</span>
                                    </div>
                                    <p className="text-sm text-[var(--text-dim)] truncate">{h.subject}</p>
                                    <div className="flex items-center justify-between mt-2 text-[10px] text-[var(--text-muted)]">
                                        <span>→ {h.targets.length} targets</span>
                                        <span>{h.time}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
