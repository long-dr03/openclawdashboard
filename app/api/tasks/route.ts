import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const TASKS_PATH = path.resolve(process.cwd(), '..', 'openclaw-multi', 'shared', 'data', 'tasks.json');

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
        } else if (action === 'update') {
            tasks = tasks.map((t: any) => t.id === task.id ? { ...t, ...task } : t);
        } else if (action === 'delete') {
            tasks = tasks.filter((t: any) => t.id !== task.id);
        }

        fs.writeFileSync(TASKS_PATH, JSON.stringify(tasks, null, 2));
        return NextResponse.json({ success: true, tasks });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
