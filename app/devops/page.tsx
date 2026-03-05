'use client';

import { useState, useEffect, useCallback } from 'react';
import { Server, Cpu, MemoryStick, HardDrive, RefreshCw, Activity, Wifi, WifiOff, Clock, Terminal as TermIcon, Play, AlertTriangle, CheckCircle2, XCircle, Container, Database, Globe, Zap } from 'lucide-react';

interface SystemStats {
    cpu: { usage: number; cores: number; model: string };
    ram: { total: number; used: number; free: number; usagePercent: number };
    disk: { total: number; used: number; free: number; usagePercent: number };
    uptime: number;
    hostname: string;
    platform: string;
}

interface ServiceStatus {
    name: string;
    status: 'online' | 'offline' | 'unknown';
    latency?: number;
    info?: string;
}

interface PM2Process {
    pm_id: number;
    name: string;
    pm2_env: { status: string; pm_uptime: number };
    monit: { memory: number; cpu: number };
}

interface DockerContainer {
    id: string;
    image: string;
    status: string;
    names: string;
    ports: string;
}

interface DiagCommand {
    id: string;
    label: string;
}

interface AlertItem {
    severity: 'critical' | 'warning' | 'info';
    msg: string;
    value?: number;
    threshold?: number;
}

export default function DevOpsPage() {
    const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
    const [services, setServices] = useState<ServiceStatus[]>([]);
    const [pm2Data, setPm2Data] = useState<PM2Process[]>([]);
    const [dockerData, setDockerData] = useState<DockerContainer[]>([]);
    const [dockerOffline, setDockerOffline] = useState(false);
    const [diagCommands, setDiagCommands] = useState<DiagCommand[]>([]);
    const [diagOutput, setDiagOutput] = useState<string>('');
    const [diagRunning, setDiagRunning] = useState(false);
    const [diagLabel, setDiagLabel] = useState('');
    const [loading, setLoading] = useState(true);
    const [lastRefresh, setLastRefresh] = useState('');
    const [alerts, setAlerts] = useState<AlertItem[]>([]);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [sysRes, svcRes, pm2Res, dkrRes, cmdRes] = await Promise.all([
                fetch('/api/devops/system'),
                fetch('/api/devops/services'),
                fetch('/api/devops/pm2'),
                fetch('/api/devops/docker'),
                fetch('/api/devops/diagnostic'),
            ]);

            const sys = await sysRes.json();
            if (sys && !sys.error) setSystemStats(sys);

            const svc = await svcRes.json();
            if (Array.isArray(svc)) setServices(svc);

            const pm2 = await pm2Res.json();
            if (Array.isArray(pm2)) setPm2Data(pm2);

            const dkr = await dkrRes.json();
            setDockerOffline(dkrRes.headers.get('X-Docker-Status') === 'offline');
            if (Array.isArray(dkr)) setDockerData(dkr);

            const cmds = await cmdRes.json();
            if (Array.isArray(cmds)) setDiagCommands(cmds);

            setLastRefresh(new Date().toLocaleTimeString('en-GB', { hour12: false }));

            // Generate alerts from real data
            const newAlerts: AlertItem[] = [];
            if (sys && !sys.error) {
                if (sys.cpu.usage > 90) newAlerts.push({ severity: 'critical', msg: `CPU usage critically high: ${sys.cpu.usage}%`, value: sys.cpu.usage, threshold: 90 });
                else if (sys.cpu.usage > 70) newAlerts.push({ severity: 'warning', msg: `CPU usage elevated: ${sys.cpu.usage}%`, value: sys.cpu.usage, threshold: 70 });

                if (sys.ram.usagePercent > 90) newAlerts.push({ severity: 'critical', msg: `RAM usage critically high: ${sys.ram.usagePercent}%`, value: sys.ram.usagePercent, threshold: 90 });
                else if (sys.ram.usagePercent > 75) newAlerts.push({ severity: 'warning', msg: `RAM usage elevated: ${sys.ram.usagePercent}%`, value: sys.ram.usagePercent, threshold: 75 });

                if (sys.disk.usagePercent > 90) newAlerts.push({ severity: 'critical', msg: `Disk usage critically high: ${sys.disk.usagePercent}%`, value: sys.disk.usagePercent, threshold: 90 });
                else if (sys.disk.usagePercent > 75) newAlerts.push({ severity: 'warning', msg: `Disk usage elevated: ${sys.disk.usagePercent}%`, value: sys.disk.usagePercent, threshold: 75 });
            }
            if (Array.isArray(svc)) {
                svc.forEach((s: ServiceStatus) => {
                    if (s.status === 'offline') {
                        newAlerts.push({ severity: 'critical', msg: `${s.name} is OFFLINE — ${s.info}` });
                    }
                });
            }
            if (newAlerts.length === 0) {
                newAlerts.push({ severity: 'info', msg: 'All systems nominal — No alerts' });
            }
            setAlerts(newAlerts);

        } catch (e) {
            console.error('DevOps fetch error:', e);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 15000); // Auto-refresh every 15s
        return () => clearInterval(interval);
    }, [fetchAll]);

    const runDiagnostic = async (cmdId: string, label: string) => {
        setDiagRunning(true);
        setDiagLabel(label);
        setDiagOutput('Running...');
        try {
            const res = await fetch('/api/devops/diagnostic', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ commandId: cmdId }),
            });
            const data = await res.json();
            if (data.success) {
                setDiagOutput(`$ ${label}\n──────────────────────────────────────\n${data.output}\n\n⏱ ${data.duration}ms`);
            } else {
                setDiagOutput(`ERROR: ${data.error}\n${data.output || ''}`);
            }
        } catch (e: any) {
            setDiagOutput(`Network Error: ${e.message}`);
        } finally {
            setDiagRunning(false);
        }
    };

    const formatUptime = (seconds: number) => {
        const d = Math.floor(seconds / 86400);
        const h = Math.floor((seconds % 86400) / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${d}d ${h}h ${m}m`;
    };

    const formatProcUptime = (ts: number) => {
        if (!ts) return '-';
        const diff = Date.now() - ts;
        const min = Math.floor(diff / 1000 / 60);
        const hours = Math.floor(min / 60);
        if (hours > 0) return `${hours}h ${min % 60}m`;
        return `${min}m`;
    };

    const GaugeBar = ({ value, label, unit, color, max }: { value: number; label: string; unit: string; color: string; max?: string }) => {
        const barColor = value > 90 ? 'bg-red-500' : value > 70 ? 'bg-amber-500' : color;
        return (
            <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-white font-bold font-mono">{value}<span className="text-slate-500 font-normal">{unit}</span> {max && <span className="text-slate-600">/ {max}</span>}</span>
                </div>
                <div className="h-2 bg-black/40 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${Math.min(value, 100)}%` }}></div>
                </div>
            </div>
        );
    };

    const serviceIcons: Record<string, typeof Server> = {
        'Gateway (OpenClaw)': Globe,
        'Redis': Database,
        'PostgreSQL': Database,
        'Docker': Container,
        'PM2': Server,
    };

    const alertColors: Record<string, string> = {
        critical: 'border-l-red-500 bg-red-500/5',
        warning: 'border-l-amber-500 bg-amber-500/5',
        info: 'border-l-blue-500 bg-blue-500/5',
    };

    return (
        <div className="p-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center">
                        <Server size={28} className="mr-3 text-red-400" />
                        DevOps Monitoring Center
                    </h1>
                    <p className="text-slate-500 text-sm mt-1">
                        🛡️ System Guardian — Real-time infrastructure monitoring
                        {systemStats && <span className="ml-2 text-slate-600 font-mono">({systemStats.hostname} / {systemStats.platform})</span>}
                    </p>
                </div>
                <div className="flex items-center space-x-3">
                    <span className="text-xs text-slate-500 font-mono">Auto-refresh 15s · Last: {lastRefresh || '--:--:--'}</span>
                    <button onClick={fetchAll} disabled={loading} className="flex items-center px-4 py-2 bg-blue-600/10 text-blue-400 border border-blue-600/20 rounded-lg text-sm hover:bg-blue-600/20 transition-colors disabled:opacity-50">
                        <RefreshCw size={14} className={`mr-2 ${loading ? 'animate-spin' : ''}`} /> Refresh
                    </button>
                </div>
            </div>

            {/* Alerts Banner */}
            {alerts.filter(a => a.severity !== 'info').length > 0 && (
                <div className="mb-6 space-y-2">
                    {alerts.filter(a => a.severity !== 'info').map((alert, idx) => (
                        <div key={idx} className={`border-l-2 rounded-r-lg px-4 py-3 flex items-center space-x-3 ${alertColors[alert.severity]}`}>
                            {alert.severity === 'critical' ? <XCircle size={16} className="text-red-400 shrink-0" /> : <AlertTriangle size={16} className="text-amber-400 shrink-0" />}
                            <span className="text-sm text-slate-200">{alert.msg}</span>
                            {alert.value !== undefined && alert.threshold !== undefined && (
                                <span className="text-xs text-slate-500 ml-auto font-mono">{alert.value}% / threshold: {alert.threshold}%</span>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {/* Row 1: Resource Gauges */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-5 mb-6">
                {/* CPU */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center"><Cpu size={16} className="mr-2 text-cyan-400" /><span className="font-bold text-white text-sm">CPU</span></div>
                        <span className={`text-lg font-bold font-mono ${(systemStats?.cpu.usage || 0) > 90 ? 'text-red-400' : (systemStats?.cpu.usage || 0) > 70 ? 'text-amber-400' : 'text-cyan-400'}`}>
                            {systemStats?.cpu.usage || 0}%
                        </span>
                    </div>
                    <GaugeBar value={systemStats?.cpu.usage || 0} label="Utilization" unit="%" color="bg-cyan-500" />
                    <p className="text-[10px] text-slate-600 mt-2 truncate">{systemStats?.cpu.cores || 0} cores · {systemStats?.cpu.model?.substring(0, 35) || 'Unknown'}</p>
                </div>

                {/* RAM */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center"><MemoryStick size={16} className="mr-2 text-purple-400" /><span className="font-bold text-white text-sm">RAM</span></div>
                        <span className={`text-lg font-bold font-mono ${(systemStats?.ram.usagePercent || 0) > 90 ? 'text-red-400' : 'text-purple-400'}`}>
                            {systemStats?.ram.usagePercent || 0}%
                        </span>
                    </div>
                    <GaugeBar value={systemStats?.ram.usagePercent || 0} label="Usage" unit="%" color="bg-purple-500" max={`${Math.round((systemStats?.ram.total || 0) / 1024)} GB`} />
                    <p className="text-[10px] text-slate-600 mt-2">{Math.round((systemStats?.ram.used || 0) / 1024)} / {Math.round((systemStats?.ram.total || 0) / 1024)} GB used</p>
                </div>

                {/* Disk */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center"><HardDrive size={16} className="mr-2 text-emerald-400" /><span className="font-bold text-white text-sm">Disk</span></div>
                        <span className={`text-lg font-bold font-mono ${(systemStats?.disk?.usagePercent || 0) > 90 ? 'text-red-400' : 'text-emerald-400'}`}>
                            {systemStats?.disk?.usagePercent || 0}%
                        </span>
                    </div>
                    <GaugeBar value={systemStats?.disk.usagePercent || 0} label="Usage" unit="%" color="bg-emerald-500" max={`${systemStats?.disk.total || 0} GB`} />
                    <p className="text-[10px] text-slate-600 mt-2">{systemStats?.disk.used || 0} / {systemStats?.disk.total || 0} GB used</p>
                </div>

                {/* Uptime */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center"><Clock size={16} className="mr-2 text-amber-400" /><span className="font-bold text-white text-sm">Uptime</span></div>
                        <span className="text-lg font-bold font-mono text-amber-400">{systemStats ? formatUptime(systemStats.uptime) : '--'}</span>
                    </div>
                    <div className="space-y-1.5 text-xs">
                        <div className="flex justify-between"><span className="text-slate-500">Host</span><span className="text-slate-300 font-mono">{systemStats?.hostname || '--'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">Platform</span><span className="text-slate-300 font-mono">{systemStats?.platform || '--'}</span></div>
                        <div className="flex justify-between"><span className="text-slate-500">PM2 Procs</span><span className="text-slate-300 font-mono">{pm2Data.length}</span></div>
                    </div>
                </div>
            </div>

            {/* Row 2: Service Health + Alerts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* Service Health */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white text-sm flex items-center"><Activity size={16} className="mr-2 text-emerald-400" /> Service Health</h3>
                        <span className="text-xs text-slate-500">{services.filter(s => s.status === 'online').length}/{services.length} online</span>
                    </div>
                    <div className="space-y-2">
                        {services.length === 0 ? (
                            <p className="text-center py-4 text-slate-600 text-sm">Loading services...</p>
                        ) : services.map((svc, idx) => {
                            const Icon = serviceIcons[svc.name] || Server;
                            return (
                                <div key={idx} className="flex items-center justify-between px-3 py-2.5 bg-black/20 rounded-lg">
                                    <div className="flex items-center">
                                        <Icon size={14} className="mr-3 text-slate-500" />
                                        <div>
                                            <p className="text-sm text-white font-medium">{svc.name}</p>
                                            <p className="text-[10px] text-slate-500">{svc.info}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {svc.latency && <span className="text-[10px] text-slate-500 font-mono">{svc.latency}ms</span>}
                                        {svc.status === 'online' ? (
                                            <span className="flex items-center text-[10px] font-bold text-emerald-400"><CheckCircle2 size={12} className="mr-1" />ONLINE</span>
                                        ) : svc.status === 'offline' ? (
                                            <span className="flex items-center text-[10px] font-bold text-red-400"><XCircle size={12} className="mr-1" />OFFLINE</span>
                                        ) : (
                                            <span className="flex items-center text-[10px] font-bold text-slate-500">UNKNOWN</span>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Alert History */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-white text-sm flex items-center"><AlertTriangle size={16} className="mr-2 text-amber-400" /> Threshold Alerts</h3>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${alerts.filter(a => a.severity === 'critical').length > 0 ? 'bg-red-500/20 text-red-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {alerts.filter(a => a.severity === 'critical').length > 0 ? `${alerts.filter(a => a.severity === 'critical').length} critical` : 'All clear'}
                        </span>
                    </div>
                    <div className="space-y-2">
                        {alerts.map((alert, idx) => (
                            <div key={idx} className={`border-l-2 rounded-r-lg px-4 py-2.5 ${alertColors[alert.severity]}`}>
                                <p className="text-sm text-slate-200">{alert.msg}</p>
                            </div>
                        ))}
                    </div>
                    <div className="mt-4 pt-3 border-t border-white/5 text-[10px] text-slate-600">
                        Thresholds: CPU &gt; 90% (critical) · RAM &gt; 90% · Disk &gt; 90% · Service offline = critical alert
                    </div>
                </div>
            </div>

            {/* Row 3: PM2 + Docker Tables */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                {/* PM2 */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                        <h3 className="font-bold text-white text-sm flex items-center"><Server size={16} className="mr-2 text-emerald-400" /> PM2 Processes</h3>
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono">{pm2Data.filter(p => p.pm2_env?.status === 'online').length}/{pm2Data.length}</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead><tr className="bg-black/20 text-slate-500 uppercase tracking-wider">
                                <th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Status</th><th className="text-left px-3 py-2">Uptime</th><th className="text-left px-3 py-2">Mem</th><th className="text-left px-3 py-2">CPU</th>
                            </tr></thead>
                            <tbody>
                                {pm2Data.length === 0 ? <tr><td colSpan={5} className="text-center py-6 text-slate-600">No PM2 processes</td></tr> :
                                pm2Data.map(p => (
                                    <tr key={p.pm_id} className="border-t border-white/5 hover:bg-white/[0.02]">
                                        <td className="px-3 py-2 font-bold text-white">{p.name}</td>
                                        <td className="px-3 py-2"><span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${p.pm2_env?.status === 'online' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>{p.pm2_env?.status}</span></td>
                                        <td className="px-3 py-2 text-slate-400 font-mono">{formatProcUptime(p.pm2_env?.pm_uptime)}</td>
                                        <td className="px-3 py-2 text-slate-400">{p.monit ? (p.monit.memory / 1024 / 1024).toFixed(0) : 0} MB</td>
                                        <td className="px-3 py-2 text-slate-400">{p.monit?.cpu || 0}%</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Docker */}
                <div className="bg-[#16181e] border border-white/5 rounded-xl overflow-hidden">
                    <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                        <h3 className="font-bold text-white text-sm flex items-center"><Container size={16} className="mr-2 text-blue-400" /> Docker</h3>
                        {dockerOffline && <span className="text-xs px-2 py-0.5 rounded bg-red-500/10 text-red-400">Offline</span>}
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                            <thead><tr className="bg-black/20 text-slate-500 uppercase tracking-wider">
                                <th className="text-left px-3 py-2">Name</th><th className="text-left px-3 py-2">Image</th><th className="text-left px-3 py-2">Status</th>
                            </tr></thead>
                            <tbody>
                                {dockerData.length === 0 ? (
                                    <tr><td colSpan={3} className="text-center py-6 text-slate-600">{dockerOffline ? '🐳 Docker Desktop is not running' : 'No containers'}</td></tr>
                                ) : dockerData.map(c => (
                                    <tr key={c.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                                        <td className="px-3 py-2 font-bold text-white">{c.names}</td>
                                        <td className="px-3 py-2 text-slate-400">{c.image}</td>
                                        <td className="px-3 py-2"><span className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded text-[9px]">{c.status}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Row 4: Diagnostic Shell */}
            <div className="bg-[#16181e] border border-white/5 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-white/5 flex items-center justify-between bg-black/20">
                    <h3 className="font-bold text-white text-sm flex items-center"><TermIcon size={16} className="mr-2 text-amber-400" /> Diagnostic Shell</h3>
                    <span className="text-[10px] text-slate-500">Whitelisted commands only · Safe execution</span>
                </div>
                <div className="p-4">
                    {/* Command Buttons */}
                    <div className="flex flex-wrap gap-2 mb-4">
                        {diagCommands.map(cmd => (
                            <button
                                key={cmd.id}
                                onClick={() => runDiagnostic(cmd.id, cmd.label)}
                                disabled={diagRunning}
                                className="flex items-center px-3 py-1.5 bg-black/30 border border-white/5 rounded-lg text-xs text-slate-300 hover:bg-amber-500/10 hover:border-amber-500/20 hover:text-amber-400 transition-colors disabled:opacity-30"
                            >
                                <Play size={10} className="mr-1.5" />
                                {cmd.label}
                            </button>
                        ))}
                    </div>
                    {/* Output */}
                    <div className="relative bg-[#0a0c10] rounded-lg p-4 font-mono text-xs text-slate-300 h-48 overflow-y-auto whitespace-pre-wrap">
                        <div className="scanline"></div>
                        {diagOutput ? (
                            <pre>{diagOutput}</pre>
                        ) : (
                            <p className="text-slate-600 text-center py-12">Click a command above to run diagnostics...</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
