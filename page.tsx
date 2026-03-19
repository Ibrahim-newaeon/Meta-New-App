// apps/dashboard/app/(auth)/login/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { z } from 'zod';

const LoginSchema = z.object({
  email:    z.string().email('Valid email required'),
  password: z.string().min(8, 'Minimum 8 characters'),
});

const ERROR_MESSAGES: Record<string, string> = {
  CredentialsSignin:      'Invalid email or password',
  user_inactive:          'Account deactivated — contact admin',
  insufficient_permissions: 'You don\'t have access to that page',
  OAuthAccountNotLinked:  'Use the same sign-in method you registered with',
};

export default function LoginPage() {
  const router      = useRouter();
  const params      = useSearchParams();
  const callbackUrl = params.get('callbackUrl') ?? '/';
  const errorParam  = params.get('error');

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState(
    errorParam ? (ERROR_MESSAGES[errorParam] ?? 'Authentication error') : ''
  );
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});

  // Inject fonts
  useEffect(() => {
    const link = document.createElement('link');
    link.rel  = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@700;800&family=DM+Sans:wght@300;400;500&display=swap';
    document.head.appendChild(link);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setFieldErrors({});

    const validation = LoginSchema.safeParse({ email, password });
    if (!validation.success) {
      const errs: Record<string, string> = {};
      validation.error.errors.forEach(e => {
        if (e.path[0]) errs[e.path[0] as string] = e.message;
      });
      setFieldErrors(errs);
      return;
    }

    setLoading(true);
    const result = await signIn('credentials', {
      email: email.toLowerCase(),
      password,
      redirect: false,
    });
    setLoading(false);

    if (result?.error) {
      setError(ERROR_MESSAGES[result.error] ?? 'Sign-in failed');
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  };

  return (
    <>
      <style>{`
        @keyframes gridMove {
          0%   { transform: translate(0,0); }
          100% { transform: translate(40px, 40px); }
        }
        @keyframes fadeUp {
          from { opacity:0; transform:translateY(16px); }
          to   { opacity:1; transform:translateY(0); }
        }
        @keyframes pulse {
          0%,100% { opacity:.6; }
          50%      { opacity:1; }
        }
        .form-card {
          animation: fadeUp 0.5s ease both;
        }
        .grid-bg {
          position:absolute; inset:-40px;
          background-image:
            linear-gradient(rgba(245,158,11,.06) 1px, transparent 1px),
            linear-gradient(90deg, rgba(245,158,11,.06) 1px, transparent 1px);
          background-size: 40px 40px;
          animation: gridMove 8s linear infinite;
        }
        .amber-dot {
          width:6px; height:6px; border-radius:50%;
          background:#F59E0B;
          animation: pulse 2s ease-in-out infinite;
        }
        input:-webkit-autofill {
          -webkit-box-shadow: 0 0 0px 1000px #0F0F1A inset !important;
          -webkit-text-fill-color: #E2E8F0 !important;
        }
      `}</style>

      <div style={{
        minHeight: '100vh', background: '#080810',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: "'DM Sans', system-ui, sans-serif",
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Animated grid background */}
        <div style={{ position: 'absolute', inset: 0, overflow: 'hidden' }}>
          <div className="grid-bg" />
          {/* Amber glow orb */}
          <div style={{
            position: 'absolute', top: '20%', left: '60%',
            width: 400, height: 400, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(245,158,11,.08) 0%, transparent 70%)',
          }} />
        </div>

        {/* Login card */}
        <div className="form-card" style={{
          position: 'relative', zIndex: 10,
          background: '#0F0F1A',
          border: '0.5px solid #1E1E2E',
          borderRadius: 16, padding: '40px 44px',
          width: '100%', maxWidth: 400,
        }}>
          {/* Logo */}
          <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div className="amber-dot" />
            <div>
              <div style={{ fontSize: 18, fontWeight: 800, fontFamily: "'Syne', sans-serif", color: '#F59E0B', letterSpacing: '-0.02em', lineHeight: 1 }}>
                al-ai.ai
              </div>
              <div style={{ fontSize: 10, color: '#3A3A55', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 1 }}>
                Meta Ads Platform
              </div>
            </div>
          </div>

          <div style={{ fontSize: 22, fontWeight: 700, fontFamily: "'Syne', sans-serif", color: '#E2E8F0', marginBottom: 6, letterSpacing: '-0.02em' }}>
            Sign in
          </div>
          <div style={{ fontSize: 13, color: '#64748B', marginBottom: 28 }}>
            Gulf markets · SA · KW · QA · JO
          </div>

          {/* Error banner */}
          {error && (
            <div data-testid="login-error" style={{
              background: '#5A1F1F', border: '0.5px solid #F87171',
              borderRadius: 8, padding: '10px 14px',
              fontSize: 13, color: '#F87171', marginBottom: 20,
            }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Email
              </label>
              <input
                data-testid="input-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@al-ai.ai"
                aria-label="Email address"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#13131F',
                  border: `0.5px solid ${fieldErrors.email ? '#F87171' : '#1E1E2E'}`,
                  borderRadius: 8, padding: '11px 14px',
                  fontSize: 13, color: '#E2E8F0', outline: 'none',
                  transition: 'border-color 0.15s',
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onFocus={e => e.target.style.borderColor = '#F59E0B'}
                onBlur={e => e.target.style.borderColor = fieldErrors.email ? '#F87171' : '#1E1E2E'}
              />
              {fieldErrors.email && (
                <div data-testid="error-email" style={{ fontSize: 11, color: '#F87171', marginTop: 4 }}>{fieldErrors.email}</div>
              )}
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: 11, color: '#64748B', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>
                Password
              </label>
              <input
                data-testid="input-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                aria-label="Password"
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: '#13131F',
                  border: `0.5px solid ${fieldErrors.password ? '#F87171' : '#1E1E2E'}`,
                  borderRadius: 8, padding: '11px 14px',
                  fontSize: 13, color: '#E2E8F0', outline: 'none',
                  fontFamily: "'DM Sans', sans-serif",
                }}
                onFocus={e => e.target.style.borderColor = '#F59E0B'}
                onBlur={e => e.target.style.borderColor = fieldErrors.password ? '#F87171' : '#1E1E2E'}
              />
              {fieldErrors.password && (
                <div data-testid="error-password" style={{ fontSize: 11, color: '#F87171', marginTop: 4 }}>{fieldErrors.password}</div>
              )}
            </div>

            {/* Submit */}
            <button
              data-testid="btn-login"
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: '12px',
                background: loading ? '#78490A' : '#F59E0B',
                color: '#0F0F1A', border: 'none', borderRadius: 8,
                fontSize: 14, fontWeight: 700,
                fontFamily: "'Syne', sans-serif", letterSpacing: '-0.01em',
                cursor: loading ? 'wait' : 'pointer',
                transition: 'all 0.15s',
              }}>
              {loading ? 'Signing in…' : 'Sign in →'}
            </button>
          </form>

          {/* Footer */}
          <div style={{ marginTop: 28, paddingTop: 20, borderTop: '0.5px solid #1E1E2E', fontSize: 11, color: '#3A3A55', textAlign: 'center' }}>
            Attribution: 7d click · 1d view · Powered by Claude
          </div>
        </div>
      </div>
    </>
  );
}
