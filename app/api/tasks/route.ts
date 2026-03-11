import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

const MULTI_ROOT = '/home/admin/openclaw-multi';
const SHARED_DATA_DIR = path.join(MULTI_ROOT, 'shared', 'data');
const TASKS_PATH = path.join(SHARED_DATA_DIR, 'tasks.json');
const AGENT_FOLDERS = ['ceo', 'devops', 'sales'] as const;

// Helper to ensure shared data directory exists
if (!fs.existsSync(SHARED_DATA_DIR)) {
    fs.mkdirSync(SHARED_DATA_DIR, { recursive: true });
}

type GatewayTarget = {
    agentId: string;
    folder: string;
    configPath: string;
    port: number;
    token: string;
};

function resolveGatewayTarget(agentId: string): GatewayTarget | null {
    for (const folder of AGENT_FOLDERS) {
        const configPath = path.join(MULTI_ROOT, folder, 'config.json');
        if (!fs.existsSync(configPath)) continue;

        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            const listedAgents = config.agents?.list;
            const hasAgent =
                folder === agentId ||
                (Array.isArray(listedAgents) && listedAgents.some((agent: any) => agent?.id === agentId));

            if (!hasAgent) continue;

            return {
                agentId,
                folder,
                configPath,
                port: config.gateway?.port || 18789,
                token: config.gateway?.auth?.token || '',
            };
        } catch (error) {
            console.error(`[MISSION CONTROL] Failed to parse config for ${folder}:`, error);
        }
    }

    return null;
}

async function notifyAgent(task: any) {
    const target = resolveGatewayTarget(task.agent || 'ceo');
    if (!target) {
        return { success: false, error: new Error(`No gateway target found for agent ${task.agent}`) };
    }

    const prompt = `[MISSION CONTROL - DIRECT TASK]
Bạn có một nhiệm vụ mới vừa được tạo trên Dashboard:
- ID: ${task.id}
- Tiêu đề: ${task.title}
- Mô tả: ${task.desc || 'Không có mô tả'}
- Ưu tiên: ${task.priority}
- Trạng thái hiện tại: ${task.status}

Yêu cầu:
1. Xác nhận đã nhận nhiệm vụ.
2. Bắt đầu xử lý ngay nếu phù hợp với vai trò của bạn.
3. Nếu cần phối hợp agent khác, hãy chủ động điều phối.
4. Khi bắt đầu làm, hãy cập nhật tiến độ trong hệ thống nếu workflow của bạn có hỗ trợ.`;

    const response = await fetch(`http://127.0.0.1:${target.port}/v1/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${target.token}`
        },
        body: JSON.stringify({
            model: target.agentId,
            messages: [{ role: 'user', content: prompt }],
        })
    });

    if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new Error(`Gateway ${target.folder} responded ${response.status}: ${body || 'no body'}`);
    }

    return { success: true, target };
}

async function triggerAgent(task: any) {
    try {
        console.log(`[MISSION CONTROL] Kích hoạt nhiệm vụ tức thì cho ${task.agent}...`);
        
        // CƠ CHẾ 1: Ép mission-checker chạy ngay lập tức bằng cách Restart PM2
        // mission-checker (id 3) được thiết lập để quét ngay khi khởi động.
        // Đây là cách an toàn và đồng bộ nhất với hệ thống custom của bạn.
        try {
            await execAsync('pm2 restart mission-checker', {
                env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/home/admin/.nvm/versions/node/v22.14.0/bin` }
            });
            console.log('Đã restart mission-checker để giao việc ngay.');
        } catch (pm2Err) {
            console.error('PM2 restart failed, trying direct API fallback...', pm2Err);
        }

        // CƠ CHẾ 2: Gửi trực tiếp tới đúng gateway của agent đích.
        const notifyResult = await notifyAgent(task);
        console.log(`[MISSION CONTROL] Direct task notification sent to ${notifyResult.target.folder}/${notifyResult.target.agentId}.`);

        return { success: true };
    } catch (e) {
        console.error('Failed to trigger agent:', e);
        return { success: false, error: e };
    }
}

export async function GET() {
    try {
        if (!fs.existsSync(TASKS_PATH)) {
            return NextResponse.json([]);
        }
        const data = fs.readFileSync(TASKS_PATH, 'utf-8');
        return NextResponse.json(JSON.parse(data));
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { action, task } = body;

        let tasks = [];
        if (fs.existsSync(TASKS_PATH)) {
            tasks = JSON.parse(fs.readFileSync(TASKS_PATH, 'utf-8'));
        }

        if (action === 'add') {
            const newTask = {
                id: Date.now(),
                ...task,
                status: 'pending',
                createdAt: new Date().toISOString()
            };
            tasks.push(newTask);
            
            // Cập nhật file trước khi kích hoạt
            fs.writeFileSync(TASKS_PATH, JSON.stringify(tasks, null, 2));
            
            // Kích hoạt Mission Control tức thì
            await triggerAgent(newTask);
            
        } else if (action === 'update') {
            const oldTask = tasks.find((t: any) => t.id === task.id);
            tasks = tasks.map((t: any) => t.id === task.id ? { ...t, ...task } : t);
            
            fs.writeFileSync(TASKS_PATH, JSON.stringify(tasks, null, 2));
            
            // Nếu chuyển trạng thái sang 'progress', kích hoạt lại để Agent biết
            if (task.status === 'progress' && oldTask?.status !== 'progress') {
                const updatedTask = tasks.find((t: any) => t.id === task.id);
                await triggerAgent(updatedTask);
            }
        } else if (action === 'delete') {
            tasks = tasks.filter((t: any) => t.id !== task.id);
            fs.writeFileSync(TASKS_PATH, JSON.stringify(tasks, null, 2));
        }

        return NextResponse.json({ success: true, tasks });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
