// tests/dashboard.spec.ts
import { test, expect, type Page } from '@playwright/test';

const BASE = process.env.TEST_URL ?? 'http://localhost:3000';

// ─── Page Object Model ────────────────────────────────────────────────────────
class DashboardPage {
  constructor(private page: Page) {}
  async goto() { await this.page.goto(BASE); }
  async nav(section: string) {
    await this.page.getByTestId(`nav-${section}`).click();
    await this.page.waitForLoadState('networkidle');
  }
  kpiCard(label: string) { return this.page.getByTestId(`kpi-${label}`); }
  alert(id: string) { return this.page.getByTestId(`alert-${id}`); }
}

class CampaignLauncherPage {
  constructor(private page: Page) {}
  async fillBrief(data: Record<string, string>) {
    for (const [field, value] of Object.entries(data)) {
      const el = this.page.getByTestId(`field-${field}`);
      await el.fill(value);
    }
  }
  async selectObjective(obj: string) {
    await this.page.getByTestId('select-objective').selectOption(obj);
  }
  async selectCountry(code: string) {
    await this.page.getByTestId(`country-${code}`).check();
  }
  async submit() {
    await this.page.getByTestId('btn-launch-campaign').click();
  }
  successBanner() { return this.page.getByTestId('campaign-success'); }
  errorBanner() { return this.page.getByTestId('campaign-error'); }
  validationError(field: string) { return this.page.getByTestId(`error-${field}`); }
}

class CopyGeneratorPage {
  constructor(private page: Page) {}
  async fill(data: { brand: string; product: string; usp: string; market: string; goal: string }) {
    await this.page.getByTestId('field-copy-brand').fill(data.brand);
    await this.page.getByTestId('field-copy-product').fill(data.product);
    await this.page.getByTestId('field-copy-usp').fill(data.usp);
    await this.page.getByTestId('select-copy-market').selectOption(data.market);
    await this.page.getByTestId('field-copy-goal').fill(data.goal);
  }
  async generate() { await this.page.getByTestId('btn-generate-copy').click(); }
  variants(lang: 'ar' | 'en') { return this.page.getByTestId(`copy-variant-${lang}`); }
  loadingState() { return this.page.getByTestId('copy-loading'); }
  errorState() { return this.page.getByTestId('copy-error'); }
}

// ─── Tests ────────────────────────────────────────────────────────────────────
test.describe('Performance Dashboard', () => {
  test('renders all 4 KPI cards', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    for (const kpi of ['spend', 'roas', 'ctr', 'cpm']) {
      await expect(dash.kpiCard(kpi)).toBeVisible();
    }
  });

  test('KPI values are numeric', async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    const roas = dash.kpiCard('roas');
    const text = await roas.textContent();
    expect(parseFloat(text ?? '0')).toBeGreaterThan(0);
  });

  test('chart renders with data points', async ({ page }) => {
    await page.goto(BASE);
    const chart = page.getByTestId('performance-chart');
    await expect(chart).toBeVisible();
    // Chart should have rendered SVG paths
    const paths = chart.locator('path');
    await expect(paths.first()).toBeVisible();
  });

  test('campaign table shows campaign rows', async ({ page }) => {
    await page.goto(BASE);
    const table = page.getByTestId('campaigns-table');
    await expect(table).toBeVisible();
    const rows = table.locator('[data-testid^="campaign-row-"]');
    await expect(rows.first()).toBeVisible();
  });

  test('date range selector updates data', async ({ page }) => {
    await page.goto(BASE);
    const selector = page.getByTestId('date-range-selector');
    await selector.selectOption('last_30d');
    await page.waitForLoadState('networkidle');
    await expect(page.getByTestId('kpi-spend')).toBeVisible();
  });
});

test.describe('Campaign Launcher — positive cases', () => {
  test.beforeEach(async ({ page }) => {
    const dash = new DashboardPage(page);
    await dash.goto();
    await dash.nav('launch');
  });

  test('form renders all required fields', async ({ page }) => {
    const launcher = new CampaignLauncherPage(page);
    for (const field of ['brand', 'product', 'dailyBudget', 'startDate']) {
      await expect(page.getByTestId(`field-${field}`)).toBeVisible();
    }
    await expect(page.getByTestId('select-objective')).toBeVisible();
  });

  test('submits valid brief and shows success', async ({ page }) => {
    // Mock the API so we don't hit real Meta
    await page.route('**/api/campaigns', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, campaign: { id: 'mock_123', name: 'Test', status: 'PAUSED' }, adSet: { id: 'as_456' }, ads: ['ad_1', 'ad_2'] }),
      })
    );

    const launcher = new CampaignLauncherPage(page);
    await launcher.fillBrief({
      brand: 'al-ai',
      product: 'AI Marketing Platform',
      dailyBudget: '100',
      startDate: '2026-04-01',
    });
    await launcher.selectObjective('OUTCOME_LEADS');
    await launcher.selectCountry('SA');
    await launcher.submit();

    await expect(launcher.successBanner()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('PAUSED')).toBeVisible();
  });
});

test.describe('Campaign Launcher — negative cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}?tab=launch`);
  });

  test('shows validation error for budget < $5', async ({ page }) => {
    const launcher = new CampaignLauncherPage(page);
    await launcher.fillBrief({ brand: 'test', product: 'test', dailyBudget: '2', startDate: '2026-04-01' });
    await launcher.selectObjective('OUTCOME_LEADS');
    await launcher.selectCountry('SA');
    await launcher.submit();
    await expect(launcher.validationError('dailyBudget')).toBeVisible();
  });

  test('shows error when no country selected', async ({ page }) => {
    const launcher = new CampaignLauncherPage(page);
    await launcher.fillBrief({ brand: 'test', product: 'test', dailyBudget: '50', startDate: '2026-04-01' });
    await launcher.selectObjective('OUTCOME_LEADS');
    await launcher.submit();
    await expect(launcher.validationError('countries')).toBeVisible();
  });

  test('shows API error on 500 response', async ({ page }) => {
    await page.route('**/api/campaigns', route => route.fulfill({ status: 500, body: JSON.stringify({ error: 'Meta API down' }) }));
    const launcher = new CampaignLauncherPage(page);
    await launcher.fillBrief({ brand: 'test', product: 'test', dailyBudget: '50', startDate: '2026-04-01' });
    await launcher.selectObjective('OUTCOME_LEADS');
    await launcher.selectCountry('SA');
    await launcher.submit();
    await expect(launcher.errorBanner()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Copy Generator — positive cases', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}?tab=copy`);
  });

  test('generates both Arabic and English variants', async ({ page }) => {
    await page.route('**/api/copy', route =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          variants: [
            { lang: 'ar', headline: 'اكتشف الفرق', primaryText: 'خدمة احترافية للسوق الخليجي', description: 'جرّب الآن', cta: 'LEARN_MORE', angle: 'benefit-led' },
            { lang: 'en', headline: 'Transform your results', primaryText: 'AI-powered marketing for Gulf brands', description: 'Start free', cta: 'LEARN_MORE', angle: 'aspirational' },
          ],
          meta: { arVariants: 1, enVariants: 1 },
        }),
      })
    );

    const gen = new CopyGeneratorPage(page);
    await gen.fill({ brand: 'al-ai', product: 'Platform', usp: 'AI-powered', market: 'KSA', goal: 'Leads' });
    await gen.generate();

    await expect(gen.variants('ar').first()).toBeVisible({ timeout: 15000 });
    await expect(gen.variants('en').first()).toBeVisible();
  });

  test('copy cards show headline, text, and CTA badge', async ({ page }) => {
    await page.route('**/api/copy', route =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          success: true,
          variants: [{ lang: 'en', headline: 'Test headline', primaryText: 'Test body', description: 'desc', cta: 'LEARN_MORE', angle: 'test' }],
          meta: { arVariants: 0, enVariants: 1 },
        }),
      })
    );
    const gen = new CopyGeneratorPage(page);
    await gen.fill({ brand: 'X', product: 'Y', usp: 'Z', market: 'Kuwait', goal: 'sales' });
    await gen.generate();

    await expect(page.getByText('Test headline')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('LEARN_MORE')).toBeVisible();
  });
});

test.describe('Copy Generator — negative cases', () => {
  test('shows loading state while generating', async ({ page }) => {
    await page.goto(`${BASE}?tab=copy`);
    let resolve: () => void;
    const barrier = new Promise<void>(r => { resolve = r; });
    await page.route('**/api/copy', async route => {
      await barrier;
      await route.fulfill({ status: 200, body: JSON.stringify({ success: true, variants: [], meta: {} }) });
    });
    const gen = new CopyGeneratorPage(page);
    await gen.fill({ brand: 'X', product: 'Y', usp: 'Z', market: 'Qatar', goal: 'awareness' });
    await gen.generate();
    await expect(gen.loadingState()).toBeVisible();
    resolve!();
  });

  test('shows error on API failure', async ({ page }) => {
    await page.goto(`${BASE}?tab=copy`);
    await page.route('**/api/copy', route => route.fulfill({ status: 500, body: JSON.stringify({ error: 'Claude API error' }) }));
    const gen = new CopyGeneratorPage(page);
    await gen.fill({ brand: 'X', product: 'Y', usp: 'Z', market: 'Jordan', goal: 'leads' });
    await gen.generate();
    await expect(gen.errorState()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Budget Alerts', () => {
  test('shows pacing status for all active ad sets', async ({ page }) => {
    await page.route('**/api/alerts', route =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          alerts: [
            { adsetId: 'as_1', adsetName: 'SA_25-45_All_Feed', campaignName: 'al-ai_LEADS_SA', dailyBudgetUSD: 100, spentTodayUSD: 45, pacingPercent: 45, expectedPacingPercent: 50, status: 'on_track', severity: 'ok', message: 'On pace', recommendation: 'No action' },
            { adsetId: 'as_2', adsetName: 'KW_22-55_All_Stories', campaignName: 'al-ai_LEADS_KW', dailyBudgetUSD: 50, spentTodayUSD: 49, pacingPercent: 98, expectedPacingPercent: 50, status: 'near_cap', severity: 'warning', message: 'Near budget cap', recommendation: 'Increase budget' },
          ],
          summary: { total: 2, critical: 0, warning: 1, ok: 1, totalDailyBudget: '150.00', totalSpentToday: '94.00' },
        }),
      })
    );
    await page.goto(`${BASE}?tab=alerts`);
    await expect(page.getByTestId('alert-as_1')).toBeVisible();
    await expect(page.getByTestId('alert-as_2')).toBeVisible();
    await expect(page.getByTestId('badge-warning')).toBeVisible();
  });

  test('pacing bar width reflects spend percentage', async ({ page }) => {
    await page.route('**/api/alerts', route =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({
          alerts: [{ adsetId: 'as_3', adsetName: 'Test', campaignName: 'Test Camp', dailyBudgetUSD: 100, spentTodayUSD: 75, pacingPercent: 75, expectedPacingPercent: 50, status: 'overspending', severity: 'warning', message: '25% ahead of pace', recommendation: 'Monitor' }],
          summary: { total: 1, critical: 0, warning: 1, ok: 0, totalDailyBudget: '100', totalSpentToday: '75' },
        }),
      })
    );
    await page.goto(`${BASE}?tab=alerts`);
    const bar = page.getByTestId('pacing-bar-as_3');
    await expect(bar).toBeVisible();
    const width = await bar.evaluate(el => (el as HTMLElement).style.width);
    expect(parseFloat(width)).toBeCloseTo(75, 0);
  });
});

test.describe('Accessibility', () => {
  test('all nav items are keyboard accessible', async ({ page }) => {
    await page.goto(BASE);
    for (const tab of ['performance', 'launch', 'copy', 'alerts']) {
      const navItem = page.getByTestId(`nav-${tab}`);
      await navItem.focus();
      await expect(navItem).toBeFocused();
    }
  });

  test('form inputs have ARIA labels', async ({ page }) => {
    await page.goto(`${BASE}?tab=launch`);
    const budget = page.getByTestId('field-dailyBudget');
    const label = await budget.getAttribute('aria-label');
    expect(label).toBeTruthy();
  });
});
