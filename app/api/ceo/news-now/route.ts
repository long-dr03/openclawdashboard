import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';

const execAsync = promisify(exec);

async function fetchFreeNews(tags: string[]) {
    try {
        const query = tags.join(' ');
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=vi&gl=VN&ceid=VN:vi`;
        const res = await fetch(url);
        const xml = await res.text();
        const titles = xml.match(/<title>(.*?)<\/title>/g)?.slice(1, 15) || [];
        return titles.map(t => t.replace(/<\/?title>/g, '').replace(' - Google Tin tức', '')).join('\n');
    } catch (e) {
        return '';
    }
}

export async function POST(req: Request) {
    try {
        const { tags } = await req.json();
        const rawNews = await fetchFreeNews(tags || ['Kinh tế', 'Công nghệ']);
        if (!rawNews) return NextResponse.json({ success: false, error: 'Không thể lấy tin tức từ RSS' });

        try {
            // SỬ DỤNG OPENCLAW CLI ĐỂ TÓM TẮT (Đây là cách chắc chắn nhất)
            // Chúng ta chạy lệnh 'openclaw run -a ceo "prompt"'
            const prompt = `Dưới đây là các tiêu đề tin tức. Hãy tóm tắt lại thành một bản tin chuyên nghiệp:\n\n${rawNews.replace(/"/g, '\\"')}`;
            
            // Tìm đường dẫn openclaw (thường là global hoặc trong thư mục multi)
            const { stdout, stderr } = await execAsync(`openclaw run -a ceo "${prompt}"`, {
                env: { ...process.env, PATH: `${process.env.PATH}:/usr/local/bin:/home/admin/.nvm/versions/node/v22.14.0/bin` }
            });

            if (stdout) {
                // OpenClaw run thường output kèm log, chúng ta lấy phần cuối hoặc lọc lấy text
                return NextResponse.json({ success: true, summary: stdout.trim() });
            }
            throw new Error(stderr || 'CLI trả về rỗng');

        } catch (cliError: any) {
            console.error('CLI Fallback Error:', cliError);
            // Nếu CLI cũng lỗi, trả về tin thô
            return NextResponse.json({ 
                success: true, 
                summary: `⚠️ Gateway API & CLI đều không phản hồi. Hiện tại chỉ có tin thô:\n\n${rawNews}` 
            });
        }

    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
