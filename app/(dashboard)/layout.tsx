import Sidebar, { MobileBottomNav } from '@/components/ui/Sidebar';

// TEMPORARY: Auth bypass for UI preview - remove in production
const BYPASS_AUTH = false;

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Skip link component for keyboard accessibility
  const SkipLink = () => (
    <a
      href="#main-content"
      className="skip-link"
    >
      Skip to main content
    </a>
  );
  // Mock user data for UI preview
  const mockUser = {
    full_name: 'Demo User',
    email: 'demo@revify.io',
    avatar_url: undefined,
  };

  const mockSubscription = {
    plan_id: 'pro',
    credits_used: 15,
    credits_limit: 50,
  };

  if (!BYPASS_AUTH) {
    // Original auth logic - uncomment when ready
    const { redirect } = await import('next/navigation');
    const { createServerSupabaseClient } = await import('@/lib/supabase/server');

    const supabase = await createServerSupabaseClient();
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (!authUser) {
      redirect('/login');
    }

    // Fetch user profile first (needed for org_id and onboarding check)
    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser!.id)
      .single();

    if (user && !user.onboarding_completed) {
      redirect('/onboarding');
    }

    // Fetch subscription in parallel only if we have org_id (no await needed before this)
    // Note: subscription fetch is now parallel-ready if we add more queries later
    const subscriptionPromise = user?.organization_id
      ? supabase
          .from('subscriptions')
          .select('*')
          .eq('organization_id', user.organization_id)
          .single()
      : Promise.resolve({ data: null });

    const { data: subscription } = await subscriptionPromise;

    return (
      <div className="min-h-screen bg-slate-50 lg:flex">
        <SkipLink />
        <Sidebar
          user={user ? {
            full_name: user.full_name,
            email: user.email,
            avatar_url: user.avatar_url ?? undefined,
          } : null}
          subscription={subscription ? {
            plan_id: subscription.plan_id,
            credits_used: subscription.credits_used,
            credits_limit: subscription.credits_limit,
          } : null}
        />
        <main id="main-content" className="flex-1 overflow-auto pb-20 lg:pb-0" tabIndex={-1}>
          {children}
        </main>
        <MobileBottomNav />
      </div>
    );
  }

  // Bypass mode - use mock data
  return (
    <div className="min-h-screen bg-slate-50 lg:flex">
      <SkipLink />
      {/* Desktop Sidebar - hidden on mobile */}
      <Sidebar user={mockUser} subscription={mockSubscription} />
      {/* Main content with bottom padding for mobile nav */}
      <main id="main-content" className="flex-1 overflow-auto pb-20 lg:pb-0" tabIndex={-1}>
        {children}
      </main>
      {/* Mobile Bottom Navigation - visible only on mobile */}
      <MobileBottomNav />
    </div>
  );
}
