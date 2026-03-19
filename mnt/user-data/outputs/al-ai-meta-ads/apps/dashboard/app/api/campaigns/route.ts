import { NextRequest, NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
export async function GET(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 60, window: '1h' });
  if (!rl.success) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  return NextResponse.json({ data: [], message: 'Connect META_ACCESS_TOKEN' });
}
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, window: '1h' });
  if (!rl.success) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });
  const body = await req.json().catch(() => ({})) as Record<string, string>;
  if (!body.brand || !body.product) return NextResponse.json({ error: 'brand and product required' }, { status: 400 });
  return NextResponse.json({ success: true, campaign: { id: `camp_${Date.now()}`, name: `${body.brand}_${body.objective ?? 'LEADS'}_${Date.now()}`, status: 'PAUSED' }, ads: ['ad_1','ad_2','ad_3'] }, { status: 201 });
}
