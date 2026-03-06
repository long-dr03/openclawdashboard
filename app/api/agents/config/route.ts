import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const MULTI_ROOT = '/home/admin/openclaw-multi';
const agentFolders = ['ceo', 'devops', 'sales'];

export async function POST(req: Request) {
    try {
        const { agentId, config: newConfig } = await req.json();
        const folder = agentFolders.find(f => f === agentId || (agentId === 'sales' && f === 'sales') || (agentId === 'devops' && f === 'devops') || (agentId === 'ceo' && f === 'ceo'));
        
        if (!folder) return NextResponse.json({ error: 'Agent folder not found' }, { status: 404 });

        const configPath = path.join(MULTI_ROOT, folder, 'config.json');
        if (!fs.existsSync(configPath)) return NextResponse.json({ error: 'Config not found' }, { status: 404 });

        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

        // Cập nhật cấu hình TTS cho Telegram
        if (newConfig.ttsMode || newConfig.ttsLang) {
            config.channels = config.channels || {};
            config.channels.telegram = config.channels.telegram || {};
            config.channels.telegram.voice = {
                mode: newConfig.ttsMode,
                lang: newConfig.ttsLang
            };
        }

        // Cập nhật cấu hình Cronjobs
        if (newConfig.cronjobs) {
            config.scheduler = config.scheduler || {};
            config.scheduler.tasks = config.scheduler.tasks || [];
            // Logic cập nhật cronjob tùy chỉnh
        }

        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
