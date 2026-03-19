// apps/dashboard/auth.ts
import NextAuth, { type DefaultSession, type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import type { Role } from '@prisma/client';

// ─── Augment session types ────────────────────────────────────────────────────
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      role: Role;
      allowedClientIds: string[];
    } & DefaultSession['user'];
  }
  interface User {
    role: Role;
    allowedClientIds: string[];
  }
}

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(8),
});

export const authConfig: NextAuthConfig = {
  adapter: PrismaAdapter(prisma),

  session: { strategy: 'jwt', maxAge: 8 * 60 * 60 }, // 8-hour sessions

  pages: {
    signIn:  '/login',
    error:   '/login',
  },

  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email:    { label: 'Email',    type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const parsed = LoginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
        });

        if (!user || !user.password || !user.active) return null;

        const valid = await bcrypt.compare(password, user.password);
        if (!valid) return null;

        return {
          id:               user.id,
          email:            user.email,
          name:             user.name,
          role:             user.role,
          allowedClientIds: user.allowedClientIds,
        };
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id               = user.id;
        token.role             = user.role;
        token.allowedClientIds = user.allowedClientIds;
      }
      // Re-fetch user on each JWT refresh to pick up role/access changes
      if (token.id && !user) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: { role: true, allowedClientIds: true, active: true },
        });
        if (!dbUser || !dbUser.active) return { ...token, error: 'user_inactive' };
        token.role             = dbUser.role;
        token.allowedClientIds = dbUser.allowedClientIds;
      }
      return token;
    },

    async session({ session, token }) {
      if (token.error === 'user_inactive') {
        // Force re-login by returning invalid session
        return { ...session, user: { ...session.user, id: '', role: 'CLIENT_VIEW' as Role } };
      }
      session.user.id               = token.id as string;
      session.user.role             = token.role as Role;
      session.user.allowedClientIds = token.allowedClientIds as string[];
      return session;
    },
  },

  events: {
    async signIn({ user }) {
      // Audit log — extend with your logging service
      console.log(`[auth] Sign-in: ${user.email} (${(user as { role?: string }).role})`);
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
