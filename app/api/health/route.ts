import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET() {
  const checks: Record<string, { status: string; latency?: number; error?: string }> = {};

  // Check Supabase
  const supabaseStart = Date.now();
  try {
    const supabase = createAdminClient();
    await supabase.from('organizations').select('id').limit(1);
    checks.supabase = { status: 'healthy', latency: Date.now() - supabaseStart };
  } catch (error) {
    checks.supabase = {
      status: 'unhealthy',
      latency: Date.now() - supabaseStart,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }

  // Determine overall status
  const allHealthy = Object.values(checks).every((c) => c.status === 'healthy');
  const anyUnhealthy = Object.values(checks).some((c) => c.status === 'unhealthy');

  const overallStatus = allHealthy ? 'healthy' : anyUnhealthy ? 'unhealthy' : 'degraded';

  return NextResponse.json(
    {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      checks,
    },
    {
      status: overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503,
    }
  );
}
