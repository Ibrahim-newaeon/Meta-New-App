import { NextRequest, NextResponse } from 'next/server';
export async function POST(req: NextRequest) {
  const s = req.headers.get('x-sync-secret');
  if (s !== process.env.SYNC_SECRET) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ success: true, message:'Connect DATABASE_URL to enable real sync', upserted:0 });
}
export async function GET() { return NextResponse.json([]); }
