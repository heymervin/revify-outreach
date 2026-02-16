import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// TEMPORARY: Auth bypass for UI preview - remove in production
const BYPASS_AUTH = false;

export async function updateSession(request: NextRequest) {
  // Bypass auth check for UI preview
  if (BYPASS_AUTH) {
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({ name, value, ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({ name, value: '', ...options });
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  // Refresh session if expired
  const { data: { user } } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Protected routes - require authentication
  const protectedPaths = ['/dashboard', '/research', '/bulk', '/email', '/history', '/settings', '/queue'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  // Onboarding paths
  const isOnboardingPath = pathname.startsWith('/onboarding');

  if (isProtectedPath && !user) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Check if user has completed onboarding for protected routes
  if (isProtectedPath && user) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      // Redirect to onboarding wizard if not completed
      if (userData && !userData.onboarding_completed) {
        return NextResponse.redirect(new URL('/onboarding/wizard', request.url));
      }
    } catch (error) {
      // If we can't check onboarding status, let them through
      console.error('Error checking onboarding status:', error);
    }
  }

  // Redirect from onboarding to dashboard if already completed
  if (isOnboardingPath && user) {
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      // If onboarding is complete, redirect to dashboard
      if (userData && userData.onboarding_completed) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    } catch (error) {
      console.error('Error checking onboarding status:', error);
    }
  }

  // Auth routes - redirect to dashboard if already logged in
  const authPaths = ['/login', '/signup'];
  const isAuthPath = authPaths.some(path => pathname.startsWith(path));

  if (isAuthPath && user) {
    // Check onboarding status before redirecting
    try {
      const { data: userData } = await supabase
        .from('users')
        .select('onboarding_completed')
        .eq('id', user.id)
        .single();

      if (userData && !userData.onboarding_completed) {
        return NextResponse.redirect(new URL('/onboarding/wizard', request.url));
      }
    } catch {
      // Ignore errors, default to dashboard
    }
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return response;
}
