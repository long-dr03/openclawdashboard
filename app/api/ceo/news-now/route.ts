import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

// Nguồn lấy tin miễn phí từ RSS (ví dụ VNExpress)
async function fetchFreeNews(tags: string[]) {
    try {
        const query = tags.join(' ');
        const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=vi&gl=VN&ceid=VN:vi`;
        const res = await fetch(url);
        const xml = await res.text();
        
        // Trích xuất tiêu đề từ XML RSS (đơn giản bằng regex để không cần thư viện)
        const titles = xml.match(/<title>(.*?)<\/title>/g)?.slice(1, 15) || [];
        const cleanTitles = titles.map(t => t.replace(/<\/?title>/g, ''));
        return cleanTitles.join('\n');
    } catch (e) {
        console.error('RSS Fetch error:', e);
        return 'Không thể lấy tin tức từ nguồn miễn phí.';
    }
}

export async function POST(req: Request) {
    try {
        const { tags } = await req.json();
        const rawNews = await fetchFreeNews(tags || ['Kinh tế', 'Công nghệ']);
        
        // Gửi nội dung thô cho Agent tóm tắt (tiết kiệm hơn nhiều)
        const config = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), '..', 'openclaw-multi', 'ceo', 'config.json'), 'utf-8'));
        const gwToken = config.gateway?.auth?.token || '';
        const gwPort = config.gateway?.port || 18789;

        const response = await fetch(`http://127.0.0.1:${gwPort}/v1/chat/completions`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${gwToken}`
            },
            body: JSON.stringify({
                model: 'ceo',
                messages: [{ 
                    role: 'user', 
                    content: `Dưới đây là các tiêu đề tin tức thô. Hãy tóm tắt lại chúng thành một bản tin chuyên nghiệp:\n\n${rawNews}` 
                }],
            })
        });

        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const summary = data.choices?.[0]?.message?.content || 'Không thể tóm tắt tin tức.';
        
        return NextResponse.json({ success: true, summary });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
