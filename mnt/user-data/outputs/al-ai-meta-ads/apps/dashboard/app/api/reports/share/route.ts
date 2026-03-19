import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, window: '1h' });
  if (!rl.success) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  const body = await req.json().catch(() => ({})) as Record<string, string>;
  const token = `sl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const base = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
  return NextResponse.json({ token, shareUrl:`${base}/share/${token}`, label: body.label ?? 'al-ai.ai Report', protected: false }, { status: 201 });
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json({ error: 'token required' }, { status: 400 });
  // Demo: return mock report for any token
  return NextResponse.json({
    report: {
      id:'demo', period:'2026-W12', periodType:'weekly',
      narrativeEn: 'Strong week. Saudi Arabia ROAS at 4.8x. Qatar needs creative refresh.',
      narrativeAr: 'أسبوع قوي. معدل العائد في السعودية 4.8x. قطر تحتاج تجديد محتوى.',
      metricsJson: { totalSpend:10840, avgRoas:4.1, avgCtr:2.04, avgCpm:5.49, totalLeads:412 },
      client: { name:'al-ai.ai', primaryColor:'#F59E0B', markets:['SA','KW','QA','JO'] },
    },
    label: 'al-ai.ai — 2026-W12',
    viewCount: 1,
  });
}
