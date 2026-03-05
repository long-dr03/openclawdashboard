import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export async function GET() {
    try {
        const platform = os.platform();
        let cmd: string;

        if (platform === 'win32') {
            // Windows: use npipe or docker.exe with error handling
            cmd = 'docker ps --format "{{.ID}}|{{.Image}}|{{.Status}}|{{.Names}}|{{.Ports}}"';
        } else {
            cmd = 'docker ps --format "{{.ID}}|{{.Image}}|{{.Status}}|{{.Names}}|{{.Ports}}"';
        }

        const { stdout } = await execAsync(cmd, { timeout: 5000 });

        if (!stdout.trim()) {
            return NextResponse.json([]);
        }

        const containers = stdout.trim().split('\n').filter(line => line).map(line => {
            const parts = line.split('|');
            return {
                id: parts[0] || '',
                image: parts[1] || '',
                status: parts[2] || '',
                names: parts[3] || '',
                ports: parts[4] || ''
            };
        });

        return NextResponse.json(containers);
    } catch (error: any) {
        // Graceful fallback: Docker Desktop not running or not installed
        const msg = error.message || '';
        if (msg.includes('npipe') || msg.includes('Cannot connect') || msg.includes('not found') || msg.includes('pipe')) {
            console.warn('Docker not available:', msg.substring(0, 100));
            return NextResponse.json([], {
                headers: { 'X-Docker-Status': 'offline' }
            });
        }
        console.error('Docker Error:', error);
        return NextResponse.json([]);
    }
}
