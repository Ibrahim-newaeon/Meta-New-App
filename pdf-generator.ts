// apps/dashboard/lib/pdf-generator.ts
// Renders a bilingual HTML report to PDF via Puppeteer.
// Puppeteer is heavy — runs in a separate process, not Edge runtime.

import type { Report, Client } from '@prisma/client';
import type { PeriodMetrics } from '@/services/snapshot';

export interface ReportData {
  report: Report & { client: Client };
  metrics: PeriodMetrics;
}

// ─── HTML template ────────────────────────────────────────────────────────────
function buildReportHtml(data: ReportData): string {
  const { report, metrics } = data;
  const { client } = report;
  const m = metrics;
  const primaryColor = client.primaryColor ?? '#F59E0B';

  const fmtN = (n: number, d = 2) => Number(n).toFixed(d);
  const fmtM = (n: number) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1.0"/>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=DM+Sans:wght@300;400;500&display=swap');
  :root {
    --primary: ${primaryColor};
    --text: #1a1a2e;
    --muted: #64748b;
    --border: #e2e8f0;
    --surface: #f8fafc;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'DM Sans', sans-serif; color: var(--text); background: #fff; font-size: 13px; line-height: 1.6; }
  .page { padding: 48px 56px; max-width: 800px; margin: 0 auto; }

  /* Cover */
  .cover { min-height: 100vh; display: flex; flex-direction: column; justify-content: space-between; border-left: 4px solid var(--primary); padding-left: 32px; }
  .cover-logo { font-size: 11px; color: var(--muted); letter-spacing: 0.1em; text-transform: uppercase; margin-bottom: 80px; }
  .cover-title { font-family: 'Playfair Display', serif; font-size: 42px; font-weight: 700; line-height: 1.15; margin-bottom: 16px; }
  .cover-sub { font-size: 16px; color: var(--muted); margin-bottom: 48px; }
  .cover-meta { font-size: 12px; color: var(--muted); border-top: 1px solid var(--border); padding-top: 20px; }
  .cover-meta span { margin-right: 24px; }

  /* Section */
  .section { page-break-before: always; padding-top: 48px; }
  .section-label { font-size: 10px; font-weight: 500; color: var(--primary); letter-spacing: 0.12em; text-transform: uppercase; margin-bottom: 8px; }
  h2 { font-family: 'Playfair Display', serif; font-size: 24px; font-weight: 700; margin-bottom: 20px; }
  h3 { font-size: 14px; font-weight: 500; margin-bottom: 12px; }

  /* KPI grid */
  .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
  .kpi-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 16px; }
  .kpi-label { font-size: 10px; color: var(--muted); text-transform: uppercase; letter-spacing: 0.08em; margin-bottom: 6px; }
  .kpi-value { font-size: 22px; font-weight: 500; color: var(--text); font-variant-numeric: tabular-nums; }
  .kpi-sub { font-size: 11px; color: var(--muted); margin-top: 4px; }

  /* Table */
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 12px; }
  th { background: var(--surface); border: 1px solid var(--border); padding: 9px 12px; text-align: left; font-weight: 500; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); }
  td { border: 1px solid var(--border); padding: 9px 12px; }
  tr:nth-child(even) td { background: var(--surface); }
  .good  { color: #059669; font-weight: 500; }
  .warn  { color: #D97706; font-weight: 500; }
  .crit  { color: #DC2626; font-weight: 500; }

  /* Narrative */
  .narrative { font-size: 13px; line-height: 1.8; color: var(--text); white-space: pre-wrap; }
  .narrative-ar { direction: rtl; text-align: right; font-family: 'Noto Naskh Arabic', 'DM Sans', sans-serif; }
  .divider { border: none; border-top: 1px solid var(--border); margin: 32px 0; }

  /* Badge */
  .badge { display: inline-block; font-size: 10px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
  .badge-green  { background: #D1FAE5; color: #065F46; }
  .badge-amber  { background: #FEF3C7; color: #92400E; }
  .badge-red    { background: #FEE2E2; color: #991B1B; }

  /* Footer */
  .footer { font-size: 10px; color: var(--muted); border-top: 1px solid var(--border); padding-top: 12px; margin-top: 48px; display: flex; justify-content: space-between; }
</style>
</head>
<body>

<!-- Cover page -->
<div class="page">
  <div class="cover">
    <div class="cover-logo">al-ai.ai · Meta Ads Intelligence</div>
    <div>
      <div class="cover-title">${client.name}<br/>Performance Report</div>
      <div class="cover-sub">${report.period} · ${report.periodType.charAt(0).toUpperCase() + report.periodType.slice(1)} review</div>
      <div style="display:flex;gap:12px;margin-bottom:32px">
        ${client.markets.map(m => `<span class="badge badge-amber">${m}</span>`).join('')}
      </div>
    </div>
    <div class="cover-meta">
      <span>Generated: ${new Date(report.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
      <span>Period: ${new Date(report.dateFrom).toLocaleDateString('en-GB')} – ${new Date(report.dateTo).toLocaleDateString('en-GB')}</span>
      <span>Powered by Claude ${report.generatedBy}</span>
    </div>
  </div>
</div>

<!-- Key metrics -->
<div class="page section">
  <div class="section-label">Performance overview</div>
  <h2>Key metrics</h2>
  <div class="kpi-grid">
    <div class="kpi-card"><div class="kpi-label">Total spend</div><div class="kpi-value">$${fmtN(m.totalSpend)}</div></div>
    <div class="kpi-card"><div class="kpi-label">ROAS</div><div class="kpi-value">${fmtN(m.avgRoas, 2)}x</div></div>
    <div class="kpi-card"><div class="kpi-label">Avg CTR</div><div class="kpi-value">${fmtN(m.avgCtr, 2)}%</div></div>
    <div class="kpi-card"><div class="kpi-label">Avg CPM</div><div class="kpi-value">$${fmtN(m.avgCpm, 2)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Total leads</div><div class="kpi-value">${m.totalLeads.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-label">Purchases</div><div class="kpi-value">${m.totalPurchases.toLocaleString()}</div></div>
    <div class="kpi-card"><div class="kpi-label">Revenue</div><div class="kpi-value">$${fmtN(m.totalRevenue)}</div></div>
    <div class="kpi-card"><div class="kpi-label">Impressions</div><div class="kpi-value">${fmtM(m.totalImpressions)}</div></div>
  </div>

  <h3>By campaign</h3>
  <table>
    <thead><tr><th>Campaign</th><th>Spend</th><th>ROAS</th><th>CTR</th><th>Leads</th><th>Health</th></tr></thead>
    <tbody>
      ${m.byCampaign.slice(0, 10).map(c => {
        const health = c.roas >= 3 ? 'good' : c.roas >= 1.5 ? 'warn' : 'crit';
        const badge = c.roas >= 3 ? 'badge-green' : c.roas >= 1.5 ? 'badge-amber' : 'badge-red';
        const label = c.roas >= 3 ? 'Good' : c.roas >= 1.5 ? 'Needs work' : 'Critical';
        return `<tr>
          <td>${c.campaignName}</td>
          <td>$${fmtN(c.spend)}</td>
          <td class="${health}">${fmtN(c.roas, 2)}x</td>
          <td>${fmtN(c.ctr, 2)}%</td>
          <td>${c.leads.toLocaleString()}</td>
          <td><span class="badge ${badge}">${label}</span></td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>

  <h3>By country</h3>
  <table>
    <thead><tr><th>Market</th><th>Spend</th><th>ROAS</th><th>Impressions</th></tr></thead>
    <tbody>
      ${m.byCountry.map(c => `<tr>
        <td>${c.country}</td>
        <td>$${fmtN(c.spend)}</td>
        <td class="${c.roas >= 3 ? 'good' : c.roas >= 1.5 ? 'warn' : 'crit'}">${fmtN(c.roas, 2)}x</td>
        <td>${fmtM(c.impressions)}</td>
      </tr>`).join('')}
    </tbody>
  </table>
</div>

<!-- English narrative -->
<div class="page section">
  <div class="section-label">Analysis — English</div>
  <h2>Executive summary</h2>
  <div class="narrative">${report.narrativeEn.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
</div>

<!-- Arabic narrative -->
<div class="page section">
  <div class="section-label" style="text-align:right;direction:rtl">التحليل — العربية</div>
  <h2 style="text-align:right;direction:rtl">الملخص التنفيذي</h2>
  <div class="narrative narrative-ar">${report.narrativeAr.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>
</div>

<!-- Footer (all pages) -->
<script>
  document.querySelectorAll('.page').forEach(p => {
    const f = document.createElement('div');
    f.className = 'footer';
    f.innerHTML = '<span>al-ai.ai · Confidential</span><span>${client.name} · ${report.period}</span>';
    p.appendChild(f);
  });
</script>
</body>
</html>`;
}

// ─── Generate PDF buffer ──────────────────────────────────────────────────────
export async function generateReportPdf(data: ReportData): Promise<Buffer> {
  const html = buildReportHtml(data);

  // Dynamic import — puppeteer is only available server-side
  const puppeteer = await import('puppeteer');
  const browser = await puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.fonts.ready);

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' },
    });

    return Buffer.from(pdf);
  } finally {
    await browser.close();
  }
}

// ─── Upload to storage + return URL ──────────────────────────────────────────
export async function savePdfToStorage(
  buffer: Buffer,
  filename: string,
): Promise<string> {
  // Option A: write to filesystem (dev/simple prod)
  if (process.env.PDF_STORAGE === 'fs') {
    const { writeFileSync, mkdirSync } = await import('fs');
    const { join } = await import('path');
    const dir = join(process.cwd(), 'public', 'reports');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, filename), buffer);
    return `/reports/${filename}`;
  }

  // Option B: Cloudflare R2 / S3
  if (process.env.R2_BUCKET_NAME && process.env.R2_ACCESS_KEY_ID) {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
    const s3 = new S3Client({
      region: 'auto',
      endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId:     process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
    await s3.send(new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key:    `reports/${filename}`,
      Body:   buffer,
      ContentType: 'application/pdf',
    }));
    return `${process.env.R2_PUBLIC_URL}/reports/${filename}`;
  }

  throw new Error('No PDF storage configured — set PDF_STORAGE=fs or R2_BUCKET_NAME');
}
