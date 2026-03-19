// apps/dashboard/app/api/reports/[id]/pdf/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { prisma }             from '@/lib/prisma';
import { getMetricsForPeriod } from '@/services/snapshot';
import { generateReportPdf, savePdfToStorage } from '@/lib/pdf-generator';
import { rateLimit }          from '@/lib/rate-limit';

export const runtime = 'nodejs'; // Puppeteer requires Node runtime

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const rl = await rateLimit(req, { limit: 5, window: '1h' });
  if (!rl.success) return NextResponse.json({ error: 'Rate limit exceeded (5 PDFs/hr)' }, { status: 429 });

  const report = await prisma.report.findUnique({
    where: { id: params.id },
    include: { client: true },
  });
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  // Return cached PDF if already generated
  if (report.pdfUrl) {
    return NextResponse.json({ pdfUrl: report.pdfUrl, cached: true });
  }

  try {
    const metrics = await getMetricsForPeriod(
      report.clientId,
      report.dateFrom,
      report.dateTo,
    );

    const buffer = await generateReportPdf({ report, metrics });

    const filename = `${report.client.slug}-${report.period}-${report.id.slice(-6)}.pdf`;
    const pdfUrl   = await savePdfToStorage(buffer, filename);

    await prisma.report.update({
      where: { id: params.id },
      data:  { pdfUrl, pdfGeneratedAt: new Date() },
    });

    return NextResponse.json({ pdfUrl, filename, sizeKb: Math.round(buffer.length / 1024) });
  } catch (err) {
    console.error('[reports/pdf] Error:', err);
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// apps/dashboard/app/api/reports/share/route.ts  (combined into one file for brevity)
// Create + list share links

// NOTE: Split into separate files at:
// apps/dashboard/app/api/reports/share/route.ts

import { z } from 'zod';
import bcrypt from 'bcryptjs';

const CreateShareSchema = z.object({
  reportId:  z.string().cuid(),
  label:     z.string().max(120).optional(),
  password:  z.string().min(6).optional(),
  expiresAt: z.string().datetime().optional(),
});

export async function POSTShare(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, window: '1h' });
  if (!rl.success) return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = CreateShareSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation failed', details: parsed.error.errors }, { status: 400 });

  const { reportId, label, password, expiresAt } = parsed.data;

  const report = await prisma.report.findUnique({ where: { id: reportId }, include: { client: true } });
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const hashedPassword = password ? await bcrypt.hash(password, 10) : null;

  const link = await prisma.shareLink.create({
    data: {
      clientId:  report.clientId,
      reportId,
      label:     label ?? `${report.client.name} — ${report.period}`,
      password:  hashedPassword,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
    },
  });

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.al-ai.ai';
  return NextResponse.json({
    success:   true,
    token:     link.token,
    shareUrl:  `${baseUrl}/share/${link.token}`,
    label:     link.label,
    expiresAt: link.expiresAt,
    protected: !!password,
  }, { status: 201 });
}
