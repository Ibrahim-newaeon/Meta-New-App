import type { NextRequest } from 'next/server';
const store = new Map<string, { count: number; resetAt: number }>();
export async function rateLimit(req: NextRequest, { limit = 60, window: w = '1h' as '1m'|'1h' } = {}) {
  const ms = { '1m': 60_000, '1h': 3_600_000 }[w];
  const key = `${req.headers.get('x-forwarded-for') ?? 'anon'}:${req.nextUrl.pathname}`;
  const now = Date.now();
  const e = store.get(key);
  if (!e || e.resetAt < now) { store.set(key, { count: 1, resetAt: now + ms }); return { success: true, remaining: limit - 1 }; }
  e.count++;
  return { success: e.count <= limit, remaining: Math.max(0, limit - e.count) };
}
