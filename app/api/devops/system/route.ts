import { NextResponse } from 'next/server';
import { proxyToAgent } from '@/utils/proxy';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import path from 'path';

const execAsync = promisify(exec);

export async function GET(req: Request) {
    try {
        // 1. Try proxy first (for Vercel)
        const proxyResponse = await proxyToAgent(req, '/api/devops/system');
        if (proxyResponse) return proxyResponse;

        // 2. Local checks
        const cpuUsage = os.loadavg()[0] * 10 / os.cpus().length;
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const memUsage = ((totalMem - freeMem) / totalMem) * 100;

        // Simple disk check for Linux/Mac (fallback for Win)
        let diskUsage = 0;
        try {
            if (os.platform() !== 'win32') {
                const { stdout } = await execAsync("df / | tail -1 | awk '{print $5}' | sed 's/%//'");
                diskUsage = parseInt(stdout.trim());
            } else {
                // Simplified for Windows
                const { stdout } = await execAsync('wmic logicaldisk get size,freespace,caption');
                // Basic parsing logic if needed, but returning a safe default for now
                diskUsage = 10; 
            }
        } catch (e) {
            console.warn('[SYSTEM API] Disk check failed', e);
        }

        return NextResponse.json({
            cpu: {
                usage: Math.round(cpuUsage * 100) / 100,
                cores: os.cpus().length,
                model: os.cpus()[0].model,
            },
            ram: {
                usagePercent: Math.round(memUsage * 100) / 100,
                total: Math.round(totalMem / (1024 * 1024 * 1024) * 100) / 100,
                free: Math.round(freeMem / (1024 * 1024 * 1024) * 100) / 100,
            },
            disk: {
                usagePercent: diskUsage || 0,
            },
            platform: os.platform(),
            uptime: os.uptime(),
            hostname: os.hostname(),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
