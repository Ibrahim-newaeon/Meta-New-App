// tests/reporting.spec.ts
import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.TEST_URL ?? 'http://localhost:3000';

// ─── Page Object ──────────────────────────────────────────────────────────────
class ReportingPage {
  constructor(private page: Page) {}

  async goto()  { await this.page.goto(`${BASE}?tab=analytics`); }
  async gotoShare(token: string) { await this.page.goto(`${BASE}/share/${token}`); }

  kpi(id: string)   { return this.page.getByTestId(`kpi-${id}`); }
  chart(id: string) { return this.page.getByTestId(`chart-${id}`); }
  btn(id: string)   { return this.page.getByTestId(`btn-${id}`); }
  toast(type: string) { return this.page.getByTestId(`toast-${type}`); }
  shareModal()      { return this.page.getByTestId('share-modal'); }
  shareUrl()        { return this.page.getByTestId('share-url-input'); }
  pdfDownloadLink() { return this.page.getByTestId('pdf-download-link'); }
}

const MOCK_REPORT = {
  id: 'cltest123',
  period: '2026-W12',
  periodType: 'weekly',
  dateFrom: '2026-03-16',
  dateTo: '2026-03-22',
  narrativeEn: 'Strong week across Gulf markets. ROAS exceeded 4x target in KSA.',
  narrativeAr: 'أسبوع قوي في أسواق الخليج. تجاوز معدل العائد على الإنفاق الإعلاني 4x في السعودية.',
  status: 'draft',
  pdfUrl: null,
  client: { name: 'al-ai.ai', slug: 'al-ai', primaryColor: '#F59E0B', markets: ['SA', 'KW'] },
  metricsJson: {
    totalSpend: 8420, avgRoas: 4.1, avgCtr: 2.1, avgCpm: 5.3,
    totalLeads: 312, totalPurchases: 84, totalRevenue: 34522,
    byCampaign: [{ campaignName: 'alai_LEADS_SA', spend: 4800, roas: 4.8, ctr: 2.4, leads: 198 }],
    byCountry: [{ country: 'SA', spend: 5200, roas: 4.8, impressions: 980000 }],
    dailySpend: [{ date: '2026-03-16', spend: 1100, roas: 4.2 }],
  },
};

// ─── Report viewer ────────────────────────────────────────────────────────────
test.describe('Report viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/reports/**', route => route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ data: [MOCK_REPORT], total: 1 }),
    }));
    const rp = new ReportingPage(page);
    await rp.goto();
  });

  test('renders all KPI tiles', async ({ page }) => {
    const rp = new ReportingPage(page);
    for (const kpi of ['spend', 'roas', 'ctr', 'cpm', 'leads']) {
      await expect(rp.kpi(kpi)).toBeVisible({ timeout: 8000 });
    }
  });

  test('KPI values are numeric and non-zero', async ({ page }) => {
    const rp = new ReportingPage(page);
    const spend = await rp.kpi('spend').textContent();
    expect(parseFloat((spend ?? '0').replace(/[^0-9.]/g, ''))).toBeGreaterThan(0);
  });

  test('daily spend chart renders', async ({ page }) => {
    const rp = new ReportingPage(page);
    await expect(rp.chart('daily-spend')).toBeVisible();
  });

  test('benchmark table shows country rows', async ({ page }) => {
    const table = page.getByTestId('benchmark-table');
    await expect(table).toBeVisible();
    await expect(page.getByTestId('benchmark-row-SA')).toBeVisible();
  });

  test('EN and AR narrative tabs visible', async ({ page }) => {
    await expect(page.getByTestId('tab-narrative-en')).toBeVisible();
    await expect(page.getByTestId('tab-narrative-ar')).toBeVisible();
  });

  test('switching to AR tab shows RTL text', async ({ page }) => {
    await page.getByTestId('tab-narrative-ar').click();
    const arBlock = page.getByTestId('narrative-ar');
    await expect(arBlock).toBeVisible();
    const dir = await arBlock.evaluate(el => getComputedStyle(el).direction);
    expect(dir).toBe('rtl');
  });
});

// ─── Report generation ────────────────────────────────────────────────────────
test.describe('Report generation — positive', () => {
  test('generate button triggers API and shows success toast', async ({ page }) => {
    await page.route('**/api/reports/generate', route => route.fulfill({
      status: 201, body: JSON.stringify({ success: true, reportId: 'cltest999', period: '2026-W12' }),
    }));
    const rp = new ReportingPage(page);
    await rp.goto();
    await rp.btn('generate-report').click();
    await expect(rp.toast('success')).toBeVisible({ timeout: 15000 });
  });

  test('shows loading state during generation', async ({ page }) => {
    let resolve!: () => void;
    const barrier = new Promise<void>(r => { resolve = r; });
    await page.route('**/api/reports/generate', async route => {
      await barrier;
      await route.fulfill({ status: 201, body: JSON.stringify({ success: true, reportId: 'x' }) });
    });
    const rp = new ReportingPage(page);
    await rp.goto();
    await rp.btn('generate-report').click();
    await expect(page.getByTestId('generating-indicator')).toBeVisible();
    resolve();
  });
});

test.describe('Report generation — negative', () => {
  test('shows error toast on API failure', async ({ page }) => {
    await page.route('**/api/reports/generate', route => route.fulfill({
      status: 500, body: JSON.stringify({ error: 'Claude API timeout' }),
    }));
    const rp = new ReportingPage(page);
    await rp.goto();
    await rp.btn('generate-report').click();
    await expect(rp.toast('error')).toBeVisible({ timeout: 15000 });
  });
});

// ─── PDF export ───────────────────────────────────────────────────────────────
test.describe('PDF export', () => {
  test('export button shows download link on success', async ({ page }) => {
    await page.route('**/api/reports/**/pdf', route => route.fulfill({
      status: 200, body: JSON.stringify({ pdfUrl: '/reports/test.pdf', filename: 'test.pdf', sizeKb: 142 }),
    }));
    const rp = new ReportingPage(page);
    await rp.goto();
    await rp.btn('export-pdf').click();
    await expect(rp.pdfDownloadLink()).toBeVisible({ timeout: 15000 });
  });

  test('export shows size in KB', async ({ page }) => {
    await page.route('**/api/reports/**/pdf', route => route.fulfill({
      status: 200, body: JSON.stringify({ pdfUrl: '/reports/t.pdf', filename: 't.pdf', sizeKb: 284 }),
    }));
    const rp = new ReportingPage(page);
    await rp.goto();
    await rp.btn('export-pdf').click();
    await expect(page.getByText('284')).toBeVisible({ timeout: 10000 });
  });
});

// ─── Share links ──────────────────────────────────────────────────────────────
test.describe('Share links — positive', () => {
  test('create share link shows modal with URL', async ({ page }) => {
    await page.route('**/api/reports/share', route => route.fulfill({
      status: 201, body: JSON.stringify({
        token: 'tok123', shareUrl: 'https://app.al-ai.ai/share/tok123',
        label: 'al-ai.ai — 2026-W12', protected: false,
      }),
    }));
    const rp = new ReportingPage(page);
    await rp.goto();
    await rp.btn('create-share-link').click();
    await expect(rp.shareModal()).toBeVisible();
    const urlVal = await rp.shareUrl().inputValue();
    expect(urlVal).toContain('/share/tok123');
  });

  test('copy button copies share URL to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.route('**/api/reports/share', route => route.fulfill({
      status: 201, body: JSON.stringify({ token: 'abc', shareUrl: 'https://app.al-ai.ai/share/abc', label: 'test', protected: false }),
    }));
    const rp = new ReportingPage(page);
    await rp.goto();
    await rp.btn('create-share-link').click();
    await page.getByTestId('btn-copy-share-url').click();
    const clip = await page.evaluate(() => navigator.clipboard.readText());
    expect(clip).toContain('/share/');
  });
});

test.describe('Share viewer — public page', () => {
  test('renders report for valid public token', async ({ page }) => {
    await page.route('**/api/reports/share**', route => route.fulfill({
      status: 200, body: JSON.stringify({ report: MOCK_REPORT, label: 'Test', viewCount: 3 }),
    }));
    const rp = new ReportingPage(page);
    await rp.gotoShare('tok_valid');
    await expect(page.getByTestId('public-report-title')).toBeVisible({ timeout: 8000 });
    await expect(page.getByText('al-ai.ai')).toBeVisible();
  });

  test('shows password gate for protected links', async ({ page }) => {
    await page.route('**/api/reports/share**', route => route.fulfill({
      status: 401, body: JSON.stringify({ error: 'Password required', passwordRequired: true }),
    }));
    const rp = new ReportingPage(page);
    await rp.gotoShare('tok_protected');
    await expect(page.getByTestId('password-gate')).toBeVisible({ timeout: 8000 });
  });

  test('shows expired message for expired links', async ({ page }) => {
    await page.route('**/api/reports/share**', route => route.fulfill({
      status: 410, body: JSON.stringify({ error: 'Link expired' }),
    }));
    const rp = new ReportingPage(page);
    await rp.gotoShare('tok_expired');
    await expect(page.getByTestId('link-expired')).toBeVisible({ timeout: 8000 });
  });
});

// ─── Benchmark table ──────────────────────────────────────────────────────────
test.describe('Benchmark comparison', () => {
  test('shows actual vs target for each country', async ({ page }) => {
    await page.goto(`${BASE}?tab=analytics`);
    const table = page.getByTestId('benchmark-table');
    await expect(table).toBeVisible();
    const roasCell = page.getByTestId('benchmark-roas-SA');
    await expect(roasCell).toBeVisible();
  });

  test('health badges render correct color class', async ({ page }) => {
    await page.goto(`${BASE}?tab=analytics`);
    const goodBadge = page.getByTestId('benchmark-health-SA');
    await expect(goodBadge).toBeVisible();
    const cls = await goodBadge.getAttribute('data-health');
    expect(['good', 'warning', 'critical']).toContain(cls);
  });
});
