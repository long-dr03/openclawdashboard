import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MULTI_ROOT = '/home/admin/openclaw-multi';
const TASKS_PATH = path.join(MULTI_ROOT, 'shared', 'data', 'tasks.json');

export async function GET() {
    try {
        const events: any[] = [];

        // 1. Fetch Tasks as events
        if (fs.existsSync(TASKS_PATH)) {
            const tasks = JSON.parse(fs.readFileSync(TASKS_PATH, 'utf-8'));
            tasks.forEach((task: any) => {
                events.push({
                    type: 'task',
                    title: `Nhiệm vụ: ${task.title}`,
                    desc: `Agent: ${task.agent} | Trạng thái: ${task.status} | Ưu tiên: ${task.priority}`,
                    time: task.createdAt || new Date().toISOString()
                });
            });
        }

        // 2. Fetch Agent Sessions for activity
        const agentFolders = ['ceo', 'devops', 'sales'];
        for (const folder of agentFolders) {
            const sessionsDir = path.join(MULTI_ROOT, folder, 'state', 'agents', folder, 'sessions');
            const sessionsJson = path.join(sessionsDir, 'sessions.json');
            
            if (fs.existsSync(sessionsJson)) {
                try {
                    const sessions = JSON.parse(fs.readFileSync(sessionsJson, 'utf-8'));
                    Object.values(sessions).forEach((sess: any) => {
                        if (sess.updatedAt) {
                            events.push({
                                type: 'agent',
                                title: `Agent ${folder} hoạt động`,
                                desc: `Session: ${sess.sessionId?.slice(0, 8)}... | Model: ${sess.model || 'unknown'} | Tokens: ${sess.totalTokens || 0}`,
                                time: new Date(sess.updatedAt).toISOString()
                            });
                        }
                    });
                } catch (e) {}
            }
        }

        // Sort by time descending
        events.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());

        // Limit to latest 50
        return NextResponse.json(events.slice(0, 50));
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
