import { NextResponse } from 'next/server';
import { proxyToAgent } from '@/utils/proxy';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export async function GET(req: Request) {
    try {
        // 1. Try proxy first
        const proxyResponse = await proxyToAgent(req, '/api/devops/system');
        if (proxyResponse) return proxyResponse;

        // 2. Local checks
        const cpuUsage = os.loadavg()[0] * 10 / os.cpus().length; // Simplified
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const memUsage = ((totalMem - freeMem) / totalMem) * 100;

        return NextResponse.json({
            cpu: {
                usage: Math.round(cpuUsage * 100) / 100,
                cores: os.cpus().length,
                model: os.cpus()[0].model,
            },
            memory: {
                usage: Math.round(memUsage * 100) / 100,
                total: Math.round(totalMem / (1024 * 1024 * 1024) * 100) / 100,
                free: Math.round(freeMem / (1024 * 1024 * 1024) * 100) / 100,
            },
            platform: os.platform(),
            uptime: os.uptime(),
            hostname: os.hostname(),
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
