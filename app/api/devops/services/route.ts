import { NextResponse } from 'next/server';
import { proxyToAgent } from '@/utils/proxy';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

interface ServiceStatus {
    name: string;
    status: 'online' | 'offline' | 'unknown';
    latency?: number;
    info?: string;
}

async function checkPort(port: number, host: string = '127.0.0.1'): Promise<{ open: boolean; latency: number }> {
    const start = Date.now();
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2000);
        await fetch(`http://${host}:${port}`, { signal: controller.signal }).catch(() => { });
        clearTimeout(timeout);
        return { open: true, latency: Date.now() - start };
    } catch {
        try {
            const platform = os.platform();
            if (platform === 'win32') {
                await execAsync(`powershell -Command "Test-NetConnection -ComputerName ${host} -Port ${port} -InformationLevel Quiet"`, { timeout: 3000 });
                return { open: true, latency: Date.now() - start };
            } else {
                await execAsync(`nc -z -w2 ${host} ${port}`, { timeout: 3000 });
                return { open: true, latency: Date.now() - start };
            }
        } catch {
            return { open: false, latency: Date.now() - start };
        }
    }
}

async function checkService(name: string, port: number): Promise<ServiceStatus> {
    const { open, latency } = await checkPort(port);
    return {
        name,
        status: open ? 'online' : 'offline',
        latency: open ? latency : undefined,
        info: open ? `Port ${port} responding` : `Port ${port} unreachable`,
    };
}

export async function GET(req: Request) {
    try {
        // 1. Try proxy first
        const proxyResponse = await proxyToAgent(req, '/api/devops/services');
        if (proxyResponse) return proxyResponse;

        // 2. Local checks
        const services = await Promise.all([
            checkService('Gateway (OpenClaw)', 18789),
            checkService('Redis', 6379),
            checkService('PostgreSQL', 5432),
        ]);

        try {
            const { stdout } = await execAsync('pm2 jlist', { timeout: 3000 });
            const processes = JSON.parse(stdout);
            const online = processes.filter((p: any) => p.pm2_env?.status === 'online').length;
            services.push({
                name: 'PM2',
                status: online > 0 ? 'online' : 'offline',
                info: `${online}/${processes.length} processes online`,
            });
        } catch {
            services.push({ name: 'PM2', status: 'unknown', info: 'pm2 not found' });
        }

        return NextResponse.json(services);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
