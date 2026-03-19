// packages/meta-sdk/client.ts
const META_BASE = 'https://graph.facebook.com/v21.0';

// Simple in-memory rate limiter: 200 calls/hour per account
const callLog: number[] = [];
const RATE_LIMIT = 200;
const WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit() {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;
  // Purge old entries
  while (callLog.length && callLog[0] < windowStart) callLog.shift();
  if (callLog.length >= RATE_LIMIT) {
    throw new Error(`Meta API rate limit reached (${RATE_LIMIT}/hour). Retry after ${Math.ceil((callLog[0] + WINDOW_MS - now) / 1000)}s`);
  }
  callLog.push(now);
}

export class MetaAPIError extends Error {
  constructor(
    message: string,
    public code: number,
    public subcode?: number,
    public type?: string,
  ) {
    super(message);
    this.name = 'MetaAPIError';
  }
}

export async function metaRequest<T>(
  endpoint: string,
  method: 'GET' | 'POST' | 'DELETE' = 'GET',
  body?: Record<string, unknown>,
  token?: string,
): Promise<T> {
  checkRateLimit();

  const accessToken = token ?? process.env.META_ACCESS_TOKEN;
  if (!accessToken) throw new Error('META_ACCESS_TOKEN not set');

  const url = new URL(`${META_BASE}/${endpoint}`);
  if (method === 'GET') {
    url.searchParams.set('access_token', accessToken);
  }

  const res = await fetch(url.toString(), {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(method !== 'GET' && { 'Authorization': `Bearer ${accessToken}` }),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json();

  if (data.error) {
    throw new MetaAPIError(
      data.error.message,
      data.error.code,
      data.error.error_subcode,
      data.error.type,
    );
  }

  return data as T;
}

// Paginate through all results
export async function metaPaginate<T>(
  endpoint: string,
  params: Record<string, string> = {},
): Promise<T[]> {
  const results: T[] = [];
  let nextUrl: string | null = null;
  const token = process.env.META_ACCESS_TOKEN!;

  const url = new URL(`${META_BASE}/${endpoint}`);
  url.searchParams.set('access_token', token);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

  let currentUrl: string = url.toString();

  do {
    checkRateLimit();
    const res = await fetch(nextUrl ?? currentUrl);
    const data = await res.json();
    if (data.error) throw new MetaAPIError(data.error.message, data.error.code);
    if (Array.isArray(data.data)) results.push(...data.data);
    nextUrl = data.paging?.next ?? null;
  } while (nextUrl);

  return results;
}

// Convenience: build insights URL with all params
export function buildInsightsUrl(
  adAccountId: string,
  datePreset: string,
  level: string,
  fields: string[],
): string {
  const url = new URL(`${META_BASE}/${adAccountId}/insights`);
  url.searchParams.set('access_token', process.env.META_ACCESS_TOKEN!);
  url.searchParams.set('date_preset', datePreset);
  url.searchParams.set('level', level);
  url.searchParams.set('fields', fields.join(','));
  url.searchParams.set('limit', '50');
  return url.toString();
}
