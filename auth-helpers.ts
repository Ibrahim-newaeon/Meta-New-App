// apps/dashboard/lib/auth-helpers.ts
import { auth }    from '@/auth';
import { prisma }  from '@/lib/prisma';
import { redirect } from 'next/navigation';
import type { Role } from '@prisma/client';
import type { NextRequest } from 'next/server';

// ─── Server component helpers ─────────────────────────────────────────────────

/** Get current user in a Server Component. Redirects to /login if not authed. */
export async function getServerUser() {
  const session = await auth();
  if (!session?.user?.id) redirect('/login');
  return session.user;
}

/** Require a specific role in a Server Component. */
export async function requireRole(minRole: Role) {
  const user = await getServerUser();
  const hierarchy: Role[] = ['CLIENT_VIEW', 'ACCOUNT_MGR', 'ADMIN'];
  const userLevel = hierarchy.indexOf(user.role);
  const required  = hierarchy.indexOf(minRole);
  if (userLevel < required) redirect('/?error=insufficient_permissions');
  return user;
}

// ─── API route helpers ────────────────────────────────────────────────────────

interface AuthResult {
  user: { id: string; role: Role; allowedClientIds: string[] } | null;
  error?: string;
}

/** Get auth context from NextRequest headers (injected by middleware). */
export function getRequestAuth(req: NextRequest): AuthResult {
  const role    = req.headers.get('x-user-role') as Role | null;
  const clients = req.headers.get('x-allowed-client-ids');

  // Headers only injected by middleware after successful auth
  // For admin/mgr routes, middleware passes through without these headers
  // so we read from the session instead
  if (!role) return { user: null, error: 'unauthenticated' };

  return {
    user: {
      id: '',  // Not needed for filter-only logic
      role,
      allowedClientIds: clients ? clients.split(',').filter(Boolean) : [],
    },
  };
}

/**
 * For API routes: check if the current user can access a given clientId.
 * ADMINs and ACCOUNT_MGRs pass through. CLIENT_VIEW must be in allowedClientIds.
 */
export function canAccessClient(
  role: Role,
  allowedClientIds: string[],
  clientId: string,
): boolean {
  if (role === 'ADMIN' || role === 'ACCOUNT_MGR') return true;
  return allowedClientIds.includes(clientId);
}

// ─── User management (ADMIN only) ────────────────────────────────────────────

export async function createUser(data: {
  email: string;
  name: string;
  password: string;
  role: Role;
  allowedClientIds?: string[];
}) {
  const bcrypt = await import('bcryptjs');
  const hash   = await bcrypt.hash(data.password, 12);

  return prisma.user.create({
    data: {
      email:            data.email.toLowerCase(),
      name:             data.name,
      password:         hash,
      role:             data.role,
      allowedClientIds: data.allowedClientIds ?? [],
    },
    select: { id: true, email: true, name: true, role: true, allowedClientIds: true, createdAt: true },
  });
}

export async function updateUserRole(userId: string, role: Role, allowedClientIds?: string[]) {
  return prisma.user.update({
    where: { id: userId },
    data: {
      role,
      ...(allowedClientIds !== undefined && { allowedClientIds }),
    },
    select: { id: true, email: true, role: true, allowedClientIds: true },
  });
}

export async function deactivateUser(userId: string) {
  return prisma.user.update({ where: { id: userId }, data: { active: false } });
}

// ─── Role display helpers ─────────────────────────────────────────────────────
export const ROLE_LABELS: Record<Role, string> = {
  ADMIN:       'Admin',
  ACCOUNT_MGR: 'Account Manager',
  CLIENT_VIEW: 'Client (read-only)',
};

export const ROLE_COLORS: Record<Role, { bg: string; text: string }> = {
  ADMIN:       { bg: '#FEE2E2', text: '#DC2626' },
  ACCOUNT_MGR: { bg: '#FEF3C7', text: '#D97706' },
  CLIENT_VIEW: { bg: '#D1FAE5', text: '#059669' },
};
