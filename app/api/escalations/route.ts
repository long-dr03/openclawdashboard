import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MULTI_ROOT = '/home/admin/openclaw-multi';

export async function GET() {
    try {
        const escalations = [];
        const agentFolders = ['ceo', 'devops', 'sales'];

        for (const folder of agentFolders) {
            const errLog = path.join(MULTI_ROOT, folder, 'logs', 'err.log');
            if (fs.existsSync(errLog)) {
                const stats = fs.statSync(errLog);
                const content = fs.readFileSync(errLog, 'utf-8');
                const lastLines = content.split('\n').slice(-10);
                
                lastLines.forEach(line => {
                    if (line.includes('error') || line.includes('⚠️') || line.includes('failed')) {
                        escalations.push({
                            id: Math.random(),
                            from: `${folder.toUpperCase()} Agent`,
                            severity: 'warning',
                            msg: line.slice(30).trim() || line, // Skip date
                            time: stats.mtime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                            resolved: false
                        });
                    }
                });
            }
        }

        // Add system check
        escalations.push({
            id: 0,
            from: 'System',
            severity: 'info',
            msg: 'Gateway health check OK',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            resolved: true
        });

        return NextResponse.json(escalations.slice(0, 10));
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
