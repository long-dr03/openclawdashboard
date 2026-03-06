import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = '/home/admin/openclaw-multi/ceo/config.json';

export async function GET() {
    try {
        if (!fs.existsSync(CONFIG_PATH)) return NextResponse.json({ error: 'Config not found' }, { status: 404 });
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        return NextResponse.json(config.ceo_dashboard_ext || {});
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        if (!fs.existsSync(CONFIG_PATH)) return NextResponse.json({ error: 'Config not found' }, { status: 404 });
        
        const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
        
        // Lưu cấu hình dashboard mở rộng vào config.json của CEO
        config.ceo_dashboard_ext = {
            ...(config.ceo_dashboard_ext || {}),
            ...body,
            updatedAt: new Date().toISOString()
        };

        // Đồng bộ các skills vào phần tools của agent ceo nếu cần
        if (body.skills) {
            const ceoAgent = config.agents?.list?.find((a: any) => a.id === 'ceo');
            if (ceoAgent) {
                ceoAgent.tools = ceoAgent.tools || { allow: [] };
                // Logic cập nhật tools dựa trên skills được bật
            }
        }

        fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
