// apps/dashboard/app/api/admin/users/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { auth }           from '@/auth';
import { prisma }         from '@/lib/prisma';
import { createUser, updateUserRole, deactivateUser } from '@/lib/auth-helpers';
import { rateLimit }      from '@/lib/rate-limit';
import { z }              from 'zod';
import type { Role }      from '@prisma/client';

const CreateUserSchema = z.object({
  email:            z.string().email(),
  name:             z.string().min(1).max(100),
  password:         z.string().min(8).max(128),
  role:             z.enum(['ADMIN', 'ACCOUNT_MGR', 'CLIENT_VIEW']),
  allowedClientIds: z.array(z.string()).optional(),
});

const UpdateUserSchema = z.object({
  userId:           z.string().cuid(),
  role:             z.enum(['ADMIN', 'ACCOUNT_MGR', 'CLIENT_VIEW']).optional(),
  allowedClientIds: z.array(z.string()).optional(),
  active:           z.boolean().optional(),
});

async function assertAdmin(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return false;
  return session.user.role === 'ADMIN';
}

// GET /api/admin/users — list all users
export async function GET(req: NextRequest) {
  if (!(await assertAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    select: {
      id: true, email: true, name: true, role: true,
      allowedClientIds: true, active: true, createdAt: true,
    },
  });

  return NextResponse.json(users);
}

// POST /api/admin/users — create user
export async function POST(req: NextRequest) {
  const rl = await rateLimit(req, { limit: 20, window: '1h' });
  if (!rl.success) return NextResponse.json({ error: 'Rate limit' }, { status: 429 });

  if (!(await assertAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = CreateUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation', details: parsed.error.errors }, { status: 400 });

  try {
    const user = await createUser(parsed.data);
    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    if ((err as { code?: string }).code === 'P2002') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

// PATCH /api/admin/users — update role/access/active
export async function PATCH(req: NextRequest) {
  if (!(await assertAdmin(req))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const parsed = UpdateUserSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Validation', details: parsed.error.errors }, { status: 400 });

  const { userId, role, allowedClientIds, active } = parsed.data;

  if (active === false) {
    await deactivateUser(userId);
    return NextResponse.json({ success: true, deactivated: userId });
  }

  if (role) {
    const user = await updateUserRole(userId, role as Role, allowedClientIds);
    return NextResponse.json(user);
  }

  return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
}
