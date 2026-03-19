// apps/dashboard/middleware.ts
import { auth } from '@/auth';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import type { Role } from '@prisma/client';

// ─── Route permission matrix ──────────────────────────────────────────────────
const ROUTE_PERMISSIONS: Record<string, Role[]> = {
  '/':                           ['ADMIN', 'ACCOUNT_MGR', 'CLIENT_VIEW'],
  '/analytics':                  ['ADMIN', 'ACCOUNT_MGR', 'CLIENT_VIEW'],
  '/campaigns':                  ['ADMIN', 'ACCOUNT_MGR'],
  '/campaigns/launch':           ['ADMIN', 'ACCOUNT_MGR'],
  '/copy':                       ['ADMIN', 'ACCOUNT_MGR'],
  '/alerts':                     ['ADMIN', 'ACCOUNT_MGR', 'CLIENT_VIEW'],
  '/admin':                      ['ADMIN'],
  '/admin/users':                ['ADMIN'],
  '/admin/clients':              ['ADMIN'],
  '/api/campaigns':              ['ADMIN', 'ACCOUNT_MGR'],
  '/api/copy':                   ['ADMIN', 'ACCOUNT_MGR'],
  '/api/insights':               ['ADMIN', 'ACCOUNT_MGR', 'CLIENT_VIEW'],
  '/api/alerts':                 ['ADMIN', 'ACCOUNT_MGR', 'CLIENT_VIEW'],
  '/api/reports/generate':       ['ADMIN', 'ACCOUNT_MGR'],
  '/api/reports/share':          ['ADMIN', 'ACCOUNT_MGR', 'CLIENT_VIEW'],
  '/api/snapshots/sync':         ['ADMIN'],
  '/api/admin':                  ['ADMIN'],
};

// Public routes — no auth required
const PUBLIC_ROUTES = [
  '/login',
  '/api/auth',
  '/share/',          // public share links
  '/api/health',
];

function isPublic(pathname: string): boolean {
  return PUBLIC_ROUTES.some(p => pathname.startsWith(p));
}

function matchPermissions(pathname: string, role: Role): boolean {
  // Exact match first
  if (ROUTE_PERMISSIONS[pathname]) {
    return ROUTE_PERMISSIONS[pathname].includes(role);
  }
  // Prefix match — longest wins
  const matches = Object.entries(ROUTE_PERMISSIONS)
    .filter(([route]) => pathname.startsWith(route))
    .sort(([a], [b]) => b.length - a.length);
  if (matches.length > 0) return matches[0][1].includes(role);
  // Default: require auth but allow any role
  return true;
}

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  // Always allow public routes
  if (isPublic(pathname)) return NextResponse.next();

  // Redirect unauthenticated users to login
  if (!session?.user?.id) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const role = session.user.role as Role;

  // Check route permissions
  if (!matchPermissions(pathname, role)) {
    // API routes → 403 JSON
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'Forbidden', requiredRole: 'See route permissions', yourRole: role },
        { status: 403 },
      );
    }
    // Page routes → redirect to home with error param
    const homeUrl = new URL('/', req.url);
    homeUrl.searchParams.set('error', 'insufficient_permissions');
    return NextResponse.redirect(homeUrl);
  }

  // CLIENT_VIEW: inject X-Client-Filter header for API routes
  // so API routes can filter data to only their allowed clients
  if (role === 'CLIENT_VIEW' && pathname.startsWith('/api/')) {
    const headers = new Headers(req.headers);
    headers.set('x-allowed-client-ids', session.user.allowedClientIds.join(','));
    headers.set('x-user-role', role);
    return NextResponse.next({ request: { headers } });
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|robots.txt).*)',
  ],
};
