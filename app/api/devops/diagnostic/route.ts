import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

// Whitelist of allowed diagnostic commands
const ALLOWED_COMMANDS: Record<string, { cmd: string; winCmd?: string; label: string }> = {
    'cpu': { cmd: 'top -bn1 | head -5', winCmd: 'wmic cpu get LoadPercentage /format:list', label: 'CPU Info' },
    'memory': { cmd: 'free -m', winCmd: 'wmic OS get FreePhysicalMemory,TotalVisibleMemorySize /format:list', label: 'Memory Info' },
    'disk': { cmd: 'df -h', winCmd: 'wmic logicaldisk get DeviceID,Size,FreeSpace /format:list', label: 'Disk Usage' },
    'uptime': { cmd: 'uptime', winCmd: 'powershell -Command "(Get-Date) - (Get-CimInstance Win32_OperatingSystem).LastBootUpTime | Select Days,Hours,Minutes | Format-List"', label: 'System Uptime' },
    'processes': { cmd: 'ps aux --sort=-%mem | head -15', winCmd: 'powershell -Command "Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 Name,Id,@{N=\'Mem(MB)\';E={[math]::round($_.WorkingSet64/1MB,1)}},CPU | Format-Table -AutoSize"', label: 'Top Processes' },
    'network': { cmd: 'netstat -tlnp 2>/dev/null || ss -tlnp', winCmd: 'netstat -ano | findstr LISTENING | findstr /V "\\[" | sort', label: 'Listening Ports' },
    'docker-ps': { cmd: 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"', winCmd: 'docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"', label: 'Docker Containers' },
    'pm2-status': { cmd: 'pm2 list', winCmd: 'pm2 list', label: 'PM2 Processes' },
    'logs-tail': { cmd: 'journalctl -n 20 --no-pager', winCmd: 'powershell -Command "Get-EventLog -LogName System -Newest 10 | Format-List TimeGenerated,EntryType,Message"', label: 'Recent System Logs' },
};

export async function GET() {
    // Return list of available commands
    return NextResponse.json(
        Object.entries(ALLOWED_COMMANDS).map(([key, val]) => ({
            id: key,
            label: val.label,
        }))
    );
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { commandId } = body;

        if (!commandId || !ALLOWED_COMMANDS[commandId]) {
            return NextResponse.json({
                success: false,
                error: `Unknown command. Available: ${Object.keys(ALLOWED_COMMANDS).join(', ')}`,
            }, { status: 400 });
        }

        const platform = os.platform();
        const cmdDef = ALLOWED_COMMANDS[commandId];
        const cmd = platform === 'win32' ? (cmdDef.winCmd || cmdDef.cmd) : cmdDef.cmd;

        const startTime = Date.now();
        const { stdout, stderr } = await execAsync(cmd, { timeout: 15000 });
        const duration = Date.now() - startTime;

        return NextResponse.json({
            success: true,
            commandId,
            label: cmdDef.label,
            output: stdout.trim() || stderr.trim() || '(no output)',
            duration,
            timestamp: new Date().toISOString(),
        });
    } catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message?.substring(0, 200) || 'Command failed',
            output: error.stderr?.trim() || '',
        }, { status: 500 });
    }
}
