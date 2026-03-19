// apps/dashboard/app/api/reports/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma }    from '@/lib/prisma';
import { rateLimit } from '@/lib/rate-limit';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = await rateLimit(req, { limit: 60, window: '1h' });
  if (!rl.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const report = await prisma.report.findUnique({
    where: { id: params.id },
    include: { client: true, shareLinks: { where: { active: true }, select: { token: true, label: true, expiresAt: true, viewCount: true } } },
  });

  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  return NextResponse.json(report);
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = await rateLimit(req, { limit: 10, window: '1h' });
  if (!rl.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  await prisma.report.update({ where: { id: params.id }, data: { status: 'archived' } });
  return NextResponse.json({ success: true });
}
