import { NextResponse } from 'next/server';

const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
] as const;

export async function GET() {
  const envStatus = requiredEnvVars.reduce<Record<string, boolean>>((acc, key) => {
    acc[key] = Boolean(process.env[key]);
    return acc;
  }, {});

  const missing = Object.entries(envStatus)
    .filter(([, isSet]) => !isSet)
    .map(([key]) => key);

  return NextResponse.json(
    {
      ok: missing.length === 0,
      service: 'liftgo-web',
      timestamp: new Date().toISOString(),
      checks: {
        env: envStatus,
      },
      ...(missing.length > 0
        ? {
            warning:
              'Missing required environment variables. Backend endpoints may fail in production.',
            missing,
          }
        : {}),
    },
    {
      status: missing.length === 0 ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store, max-age=0',
      },
    },
  );
}
