import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function GET() {
    try {
        const { stdout } = await execAsync('pm2 jlist');
        const processes = JSON.parse(stdout);
        return NextResponse.json(processes);
    } catch (error) {
        console.error("PM2 Error:", error);
        // Return mock data if PM2 is not available (dev mode/windows without PM2)
        return NextResponse.json([
            {
                pm_id: 0,
                name: "openclaw-core",
                pm2_env: { status: "online", pm_uptime: Date.now() - 86400000 },
                monit: { memory: 120 * 1024 * 1024, cpu: 2.5 }
            }
        ]);
    }
}
