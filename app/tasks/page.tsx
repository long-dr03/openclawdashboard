'use client';

import { useState, useEffect, useCallback } from 'react';
import { Crosshair, Plus, GripVertical, Clock, AlertTriangle, CheckCircle2, Circle, Trash2, RefreshCcw } from 'lucide-react';

interface Mission {
    id: number;
    title: string;
    desc: string;
    status: 'pending' | 'progress' | 'completed';
    agent: string;
    priority: 'urgent' | 'normal' | 'low';
}

export default function TasksPage() {
    const [missions, setMissions] = useState<Mission[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [newDesc, setNewDesc] = useState('');
    const [newAgent, setNewAgent] = useState('ceo');
    const [newPriority, setNewPriority] = useState<'urgent' | 'normal' | 'low'>('normal');

    const fetchTasks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/tasks');
            const data = await res.json();
            if (Array.isArray(data)) setMissions(data);
        } catch (e) {
            console.error('Failed to fetch tasks', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchTasks(); }, [fetchTasks]);

    const moveTask = async (taskId: number, newStatus: Mission['status']) => {
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'update',
                    task: { id: taskId, status: newStatus }
                }),
            });
            const data = await res.json();
            if (data.success) setMissions(data.tasks);
        } catch (e) { console.error(e); }
    };

    const addTask = async () => {
        if (!newTitle.trim()) return;
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'add',
                    task: {
                        title: newTitle,
                        desc: newDesc,
                        agent: newAgent,
                        priority: newPriority,
                    }
                }),
            });
            const data = await res.json();
            if (data.success) {
                setMissions(data.tasks);
                setNewTitle('');
                setNewDesc('');
                setShowModal(false);
            }
        } catch (e) { console.error(e); }
    };

    const deleteTask = async (taskId: number) => {
        if (!confirm('Xác nhận xóa nhiệm vụ này?')) return;
        try {
            const res = await fetch('/api/tasks', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action: 'delete',
                    task: { id: taskId }
                }),
            });
            const data = await res.json();
            if (data.success) setMissions(data.tasks);
        } catch (e) { console.error(e); }
    };

    const columns = [
        { key: 'pending', label: 'PENDING', icon: Clock, color: 'text-amber-400', dotColor: 'bg-amber-400' },
        { key: 'progress', label: 'IN PROGRESS', icon: AlertTriangle, color: 'text-blue-400', dotColor: 'bg-blue-400' },
        { key: 'completed', label: 'COMPLETED', icon: CheckCircle2, color: 'text-emerald-400', dotColor: 'bg-emerald-400' },
    ];

    const priorityColors: Record<string, string> = {
        urgent: 'bg-red-500/20 text-red-400',
        normal: 'bg-blue-500/20 text-blue-400',
        low: 'bg-slate-500/20 text-slate-400',
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center">
                        <Crosshair size={28} className="mr-3 text-amber-400" />
                        Mission Control
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">Manage and track agent tasks and missions</p>
                </div>
                <div className="flex items-center space-x-3">
                    <button onClick={fetchTasks} className="p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg transition-all">
                        <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                    <button onClick={() => setShowModal(true)} className="flex items-center px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-blue-600/20">
                        <Plus size={18} className="mr-2" /> New Mission
                    </button>
                </div>
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {columns.map(col => {
                    const colTasks = missions.filter(m => m.status === col.key);
                    return (
                        <div key={col.key} className="bg-[#16181e] border border-white/5 rounded-xl overflow-hidden flex flex-col min-h-[500px]">
                            {/* Column Header */}
                            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                                <div className="flex items-center">
                                    <span className={`w-2.5 h-2.5 rounded-full ${col.dotColor} mr-2`}></span>
                                    <span className={`text-xs font-bold uppercase tracking-wider ${col.color}`}>{col.label}</span>
                                </div>
                                <span className="text-xs text-slate-500 bg-black/30 px-2 py-0.5 rounded-full">{colTasks.length}</span>
                            </div>

                            {/* Cards */}
                            <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                                {colTasks.length === 0 ? (
                                    <div className="text-center py-12 text-slate-600 text-xs italic">
                                        No missions here
                                    </div>
                                ) : colTasks.map(task => (
                                    <div key={task.id} className="bg-black/20 border border-white/5 rounded-lg p-3 hover:bg-black/30 transition-colors group">
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="text-sm font-medium text-white leading-tight flex-1">{task.title}</h4>
                                            <div className="flex flex-col items-end space-y-1">
                                                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ml-2 shrink-0 ${priorityColors[task.priority]}`}>{task.priority}</span>
                                                <span className="text-[9px] text-slate-500 font-mono bg-black/40 px-1 rounded uppercase">{task.agent}</span>
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-500 mb-3 line-clamp-3">{task.desc}</p>
                                        
                                        <div className="flex items-center justify-between mt-auto pt-2 border-t border-white/5">
                                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                {col.key !== 'pending' && (
                                                    <button onClick={() => moveTask(task.id, col.key === 'completed' ? 'progress' : 'pending')}
                                                        className="text-[10px] px-2 py-1 rounded bg-white/5 text-slate-400 hover:text-white hover:bg-white/10">← Back</button>
                                                )}
                                                {col.key !== 'completed' && (
                                                    <button onClick={() => moveTask(task.id, col.key === 'pending' ? 'progress' : 'completed')}
                                                        className="text-[10px] px-2 py-1 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20">Next →</button>
                                                )}
                                            </div>
                                            <button onClick={() => deleteTask(task.id)} className="p-1 text-slate-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Trash2 size={12} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal remains the same but with Agent options from Config */}
            {showModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowModal(false)}>
                    <div className="bg-[#16181e] border border-white/10 rounded-2xl w-full max-w-lg p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                            <Plus size={20} className="mr-2 text-blue-400" /> New Mission
                        </h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Title</label>
                                <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)}
                                    placeholder="Mission title..."
                                    className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50" />
                            </div>
                            <div>
                                <label className="text-xs text-slate-400 mb-1 block">Description</label>
                                <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} rows={3}
                                    placeholder="Describe the mission..."
                                    className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-4 py-2.5 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-blue-500/50 resize-none" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Priority</label>
                                    <select value={newPriority} onChange={e => setNewPriority(e.target.value as any)}
                                        className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none">
                                        <option value="urgent">🔴 Urgent</option>
                                        <option value="normal">🔵 Normal</option>
                                        <option value="low">⚪ Low</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs text-slate-400 mb-1 block">Assign Agent</label>
                                    <select value={newAgent} onChange={e => setNewAgent(e.target.value)}
                                        className="w-full bg-[#0a0c10] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white focus:outline-none">
                                        <option value="ceo">CEO Agent</option>
                                        <option value="devops">DevOps Agent</option>
                                        <option value="sales">Sales Agent</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center justify-end space-x-3 mt-6 pt-4 border-t border-white/5">
                            <button onClick={() => setShowModal(false)} className="px-4 py-2 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-white/5">Cancel</button>
                            <button onClick={addTask} className="px-6 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-medium transition-all shadow-lg shadow-blue-600/20">Create</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
