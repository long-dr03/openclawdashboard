'use client';

import { useState, useEffect } from 'react';
import { Settings, Cpu, HardDrive, BellRing, Settings2, BarChart3, Shield, Activity, Clock, Mic, Save } from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface AgentConfig {
    id: string;
    memory: number;
    cronjobs: string;
    hooksEnabled: boolean;
    ttsMode: 'stream' | 'normal';
    ttsLang: 'vi' | 'en';
}

export function AgentConfigTab() {
    const [configs, setConfigs] = useState<AgentConfig[]>([
        { id: 'ceo', memory: 4096, cronjobs: '0 0 * * *', hooksEnabled: true, ttsMode: 'stream', ttsLang: 'vi' },
        { id: 'sales', memory: 2048, cronjobs: '*/30 * * * *', hooksEnabled: false, ttsMode: 'normal', ttsLang: 'en' },
        { id: 'devops', memory: 1024, cronjobs: '0 * * * *', hooksEnabled: true, ttsMode: 'normal', ttsLang: 'en' }
    ]);
    const [toast, setToast] = useState<{type: string, msg: string}|null>(null);

    const showToast = (msg: string) => {
        setToast({ type: 'success', msg });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = () => {
        showToast('Đã lưu cấu hình Agent thành công!');
    };

    const tokenData = {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', 'Now'],
        datasets: [
            {
                label: 'CEO Agent',
                data: [12000, 19000, 15000, 25000, 22000, 30000, 28000],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                fill: true,
                tension: 0.4
            },
            {
                label: 'Sales Agent',
                data: [5000, 8000, 12000, 18000, 24000, 15000, 10000],
                borderColor: '#10b981',
                backgroundColor: 'rgba(16, 185, 129, 0.1)',
                fill: true,
                tension: 0.4
            }
        ]
    };

    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                labels: { color: '#94a3b8' }
            }
        },
        scales: {
            y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } },
            x: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#94a3b8' } }
        }
    };

    return (
        <div className="space-y-6">
            {toast && (
                <div className="fixed top-6 right-6 z-50 px-4 py-3 rounded-lg text-sm font-medium shadow-xl backdrop-blur-sm border bg-emerald-500/20 border-emerald-500/30 text-emerald-300">
                    {toast.msg}
                </div>
            )}

            {/* Token Usage Chart */}
            <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-white text-sm flex items-center">
                        <BarChart3 size={16} className="mr-2 text-blue-400" /> 
                        Biểu Đồ Tiêu Thụ Token
                    </h3>
                </div>
                <div className="h-64">
                    <Line data={tokenData} options={chartOptions} />
                </div>
            </div>

            {/* Detailed Configs & Working States */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Detailed Config */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white text-sm flex items-center">
                            <Settings2 size={16} className="mr-2 text-purple-400" /> 
                            Chi Tiết Cấu Hình Agent
                        </h3>
                        <button onClick={handleSave} className="flex items-center text-xs px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                            <Save size={12} className="mr-1" /> Lưu
                        </button>
                    </div>

                    <div className="space-y-6">
                        {configs.map((conf, idx) => (
                            <div key={conf.id} className="p-4 rounded-lg bg-black/20 border border-white/5">
                                <h4 className="text-sm font-bold text-white mb-3 uppercase tracking-wider">{conf.id}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Memory Limit (MB)</label>
                                        <input type="number" value={conf.memory} 
                                            onChange={e => {
                                                const newConfigs = [...configs];
                                                newConfigs[idx].memory = Number(e.target.value);
                                                setConfigs(newConfigs);
                                            }}
                                            className="w-full bg-[#0a0c10] border border-white/10 rounded p-2 text-sm text-white" />
                                    </div>
                                    <div>
                                        <label className="text-xs text-slate-400 block mb-1">Cronjob Pattern</label>
                                        <input type="text" value={conf.cronjobs} 
                                            onChange={e => {
                                                const newConfigs = [...configs];
                                                newConfigs[idx].cronjobs = e.target.value;
                                                setConfigs(newConfigs);
                                            }}
                                            className="w-full bg-[#0a0c10] border border-white/10 rounded p-2 text-sm text-white font-mono" />
                                    </div>
                                    <div className="col-span-2">
                                        <label className="text-xs text-slate-400 block mb-1">Telegram Voice Settings</label>
                                        <div className="flex space-x-2">
                                            <select 
                                                value={conf.ttsMode}
                                                onChange={e => {
                                                    const newConfigs = [...configs];
                                                    newConfigs[idx].ttsMode = e.target.value as 'stream' | 'normal';
                                                    setConfigs(newConfigs);
                                                }}
                                                className="bg-[#0a0c10] border border-white/10 rounded p-2 text-sm text-white flex-1"
                                            >
                                                <option value="normal">Normal Voice</option>
                                                <option value="stream">Voice Streaming (/tts)</option>
                                            </select>
                                            <select 
                                                value={conf.ttsLang}
                                                onChange={e => {
                                                    const newConfigs = [...configs];
                                                    newConfigs[idx].ttsLang = e.target.value as 'vi' | 'en';
                                                    setConfigs(newConfigs);
                                                }}
                                                className="bg-[#0a0c10] border border-white/10 rounded p-2 text-sm text-white w-24"
                                            >
                                                <option value="vi">VIE</option>
                                                <option value="en">ENG</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Working States */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white text-sm flex items-center">
                            <Activity size={16} className="mr-2 text-emerald-400" /> 
                            Trạng Thái Chi Tiết Agent
                        </h3>
                    </div>
                    
                    <div className="space-y-3">
                        <div className="p-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 flex items-start">
                            <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 mr-3 animate-pulse"></div>
                            <div>
                                <p className="text-sm font-bold text-white">CEO Agent</p>
                                <p className="text-xs text-slate-400 mt-1">Đang xử lý: <span className="text-emerald-400">Phân tích bản tin kinh tế (60%)</span></p>
                                <div className="mt-2 text-[10px] text-slate-500 font-mono space-x-3">
                                    <span>Mem: 1.2GB/4GB</span>
                                    <span>Tasks: 3 Queue</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg border border-blue-500/20 bg-blue-500/5 flex items-start">
                            <div className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 mr-3"></div>
                            <div>
                                <p className="text-sm font-bold text-white">Sales Agent</p>
                                <p className="text-xs text-slate-400 mt-1">Trạng thái: <span className="text-blue-400">Idle (Chờ tin nhắn Telegram)</span></p>
                                <div className="mt-2 text-[10px] text-slate-500 font-mono space-x-3">
                                    <span>Mem: 800MB/2GB</span>
                                    <span>Last Active: 2m ago</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-3 rounded-lg border border-amber-500/20 bg-amber-500/5 flex items-start">
                            <div className="w-2 h-2 rounded-full bg-amber-500 mt-1.5 mr-3 animate-bounce"></div>
                            <div>
                                <p className="text-sm font-bold text-white">DevOps Agent</p>
                                <p className="text-xs text-slate-400 mt-1">Đang thực thi: <span className="text-amber-400">Cronjob Backup Database</span></p>
                                <div className="mt-2 flex items-center">
                                    <div className="w-full h-1.5 bg-black/40 rounded-full overflow-hidden mr-2">
                                        <div className="h-full bg-amber-500 w-3/4"></div>
                                    </div>
                                    <span className="text-[10px] text-slate-500">75%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
}
