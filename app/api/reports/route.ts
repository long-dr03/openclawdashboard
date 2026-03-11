import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MULTI_ROOT = '/home/admin/openclaw-multi';
const TASKS_PATH = path.join(MULTI_ROOT, 'shared', 'data', 'tasks.json');

export async function GET() {
    try {
        const now = new Date();
        const reports = [];

        // Fetch tasks to generate report summary
        let tasks: any[] = [];
        if (fs.existsSync(TASKS_PATH)) {
            tasks = JSON.parse(fs.readFileSync(TASKS_PATH, 'utf-8'));
        }

        const completedToday = tasks.filter((t: any) => 
            t.status === 'completed' && 
            new Date(t.createdAt).toDateString() === now.toDateString()
        ).length;

        const pendingTasks = tasks.filter((t: any) => t.status === 'pending').length;
        const progressTasks = tasks.filter((t: any) => t.status === 'progress').length;

        // Morning Briefing (08:00)
        reports.push({
            time: '08:00',
            title: 'Morning Briefing',
            status: now.getHours() >= 8 ? 'completed' : 'pending',
            summary: `Hệ thống sẵn sàng. ${pendingTasks} nhiệm vụ đang chờ, ${progressTasks} đang thực hiện.`
        });

        // Midday Check (12:00)
        reports.push({
            time: '12:00',
            title: 'Midday Check',
            status: now.getHours() >= 12 ? 'completed' : 'pending',
            summary: now.getHours() >= 12 
                ? `Đã hoàn thành ${completedToday} việc trong sáng nay. ${progressTasks} việc đang tiếp tục.`
                : 'Chờ đến giờ kiểm tra giữa ngày...'
        });

        // Evening Summary (20:00)
        reports.push({
            time: '20:00',
            title: 'Evening Summary',
            status: now.getHours() >= 20 ? 'completed' : 'pending',
            summary: now.getHours() >= 20 
                ? `Tổng kết ngày: ${completedToday} việc hoàn tất. ${tasks.filter(t => t.status !== 'completed').length} việc tồn đọng.`
                : 'Chờ tổng kết cuối ngày...'
        });

        return NextResponse.json(reports);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
