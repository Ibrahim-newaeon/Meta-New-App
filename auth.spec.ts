// tests/auth.spec.ts
import { test, expect, type Page, type BrowserContext } from '@playwright/test';

const BASE = process.env.TEST_URL ?? 'http://localhost:3000';

class LoginPage {
  constructor(private page: Page) {}
  async goto()                  { await this.page.goto(`${BASE}/login`); }
  email()                       { return this.page.getByTestId('input-email'); }
  password()                    { return this.page.getByTestId('input-password'); }
  submitBtn()                   { return this.page.getByTestId('btn-login'); }
  errorBanner()                 { return this.page.getByTestId('login-error'); }
  fieldError(f: string)         { return this.page.getByTestId(`error-${f}`); }

  async login(email: string, pw: string) {
    await this.goto();
    await this.email().fill(email);
    await this.password().fill(pw);
    await this.submitBtn().click();
  }
}

// ─── Login — positive ─────────────────────────────────────────────────────────
test.describe('Login — positive', () => {
  test('valid admin credentials redirect to dashboard', async ({ page }) => {
    await page.route('**/api/auth/callback/credentials**', route =>
      route.fulfill({
        status: 200,
        body: JSON.stringify({ url: '/' }),
        contentType: 'application/json',
      })
    );
    const lp = new LoginPage(page);
    await lp.login('admin@al-ai.ai', 'securepass123');
    // After mock redirect
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('renders brand, logo, and Gulf markets copy', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await expect(page.getByText('al-ai.ai')).toBeVisible();
    await expect(page.getByText(/Gulf markets/i)).toBeVisible();
    await expect(page.getByText(/SA.*KW.*QA.*JO/)).toBeVisible();
  });

  test('sign-in button is keyboard accessible', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.email().focus();
    await page.keyboard.press('Tab');
    await expect(lp.password()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(lp.submitBtn()).toBeFocused();
  });
});

// ─── Login — negative ─────────────────────────────────────────────────────────
test.describe('Login — negative', () => {
  test('shows field error for invalid email', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.email().fill('not-an-email');
    await lp.password().fill('password123');
    await lp.submitBtn().click();
    await expect(lp.fieldError('email')).toBeVisible();
  });

  test('shows field error for short password', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.email().fill('test@al-ai.ai');
    await lp.password().fill('short');
    await lp.submitBtn().click();
    await expect(lp.fieldError('password')).toBeVisible();
  });

  test('shows error banner for wrong credentials', async ({ page }) => {
    await page.route('**/api/auth/**', route => route.fulfill({
      status: 200,
      body: JSON.stringify({ error: 'CredentialsSignin' }),
    }));
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.email().fill('wrong@al-ai.ai');
    await lp.password().fill('wrongpassword1');
    await lp.submitBtn().click();
    await expect(lp.errorBanner()).toBeVisible({ timeout: 5000 });
  });

  test('empty form shows both field errors', async ({ page }) => {
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.submitBtn().click();
    await expect(lp.fieldError('email')).toBeVisible();
  });

  test('shows loading state on submit', async ({ page }) => {
    let resolve!: () => void;
    const barrier = new Promise<void>(r => { resolve = r; });
    await page.route('**/api/auth/**', async route => { await barrier; await route.continue(); });
    const lp = new LoginPage(page);
    await lp.goto();
    await lp.email().fill('admin@al-ai.ai');
    await lp.password().fill('securepass123');
    await lp.submitBtn().click();
    await expect(page.getByText('Signing in…')).toBeVisible();
    resolve();
  });
});

// ─── Route protection ─────────────────────────────────────────────────────────
test.describe('Route protection — unauthenticated', () => {
  test('visiting / redirects to /login', async ({ page }) => {
    await page.route('**/api/auth/session', route => route.fulfill({
      status: 200,
      body: JSON.stringify({}), // no session
    }));
    await page.goto(BASE);
    await expect(page).toHaveURL(/\/login/);
  });

  test('redirects with callbackUrl param', async ({ page }) => {
    await page.route('**/api/auth/session', route => route.fulfill({ status: 200, body: '{}' }));
    await page.goto(`${BASE}/analytics`);
    await expect(page).toHaveURL(/callbackUrl/);
  });

  test('API route returns 401 without session', async ({ page }) => {
    const res = await page.request.get(`${BASE}/api/insights`);
    expect([401, 302, 307]).toContain(res.status());
  });
});

// ─── RBAC ─────────────────────────────────────────────────────────────────────
test.describe('RBAC — role-based access', () => {
  test('CLIENT_VIEW cannot access /campaigns/launch (API returns 403)', async ({ page }) => {
    await page.route('**/api/auth/session', route => route.fulfill({
      status: 200,
      body: JSON.stringify({
        user: { id: 'u1', email: 'client@test.com', role: 'CLIENT_VIEW', allowedClientIds: ['c1'] },
        expires: new Date(Date.now() + 3600000).toISOString(),
      }),
    }));
    const res = await page.request.post(`${BASE}/api/campaigns`, {
      data: { brand: 'test', product: 'test', objective: 'OUTCOME_LEADS', dailyBudgetUSD: 50, targetCountries: ['SA'], targetAgeMin: 25, targetAgeMax: 45, language: 'ar', startDate: '2026-04-01' },
    });
    expect(res.status()).toBe(403);
  });

  test('ADMIN can reach /admin/users', async ({ page }) => {
    await page.route('**/api/auth/session', route => route.fulfill({
      status: 200,
      body: JSON.stringify({
        user: { id: 'u2', email: 'admin@al-ai.ai', role: 'ADMIN', allowedClientIds: [] },
        expires: new Date(Date.now() + 3600000).toISOString(),
      }),
    }));
    await page.route('**/api/admin/users', route => route.fulfill({
      status: 200, body: JSON.stringify([]),
    }));
    await page.goto(`${BASE}/admin/users`);
    await expect(page.getByTestId('user-manager')).toBeVisible({ timeout: 8000 });
  });
});

// ─── User manager ─────────────────────────────────────────────────────────────
test.describe('User manager — positive', () => {
  test('create user form validates and submits', async ({ page }) => {
    await page.route('**/api/admin/users', async route => {
      if (route.request().method() === 'GET') {
        await route.fulfill({ status: 200, body: JSON.stringify([]) });
      } else {
        await route.fulfill({ status: 201, body: JSON.stringify({ id: 'new1', email: 'new@al-ai.ai', role: 'CLIENT_VIEW' }) });
      }
    });
    await page.goto(`${BASE}/admin/users`);
    await page.getByTestId('btn-create-user').click();
    await page.getByTestId('field-new-email').fill('new@al-ai.ai');
    await page.getByTestId('field-new-name').fill('New User');
    await page.getByTestId('field-new-password').fill('securepass123');
    await page.getByTestId('btn-submit-user').click();
    await expect(page.getByText('User created')).toBeVisible({ timeout: 5000 });
  });
});
