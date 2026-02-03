import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import Sidebar from '@/components/ui/Sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createServerSupabaseClient();

  // Get authenticated user
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    redirect('/login');
  }

  // Get user profile
  const { data: user } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single();

  // Check if onboarding is completed
  if (user && !user.onboarding_completed) {
    redirect('/onboarding');
  }

  // Get subscription
  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('organization_id', user?.organization_id)
    .single();

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar
        user={user ? {
          full_name: user.full_name,
          email: user.email,
          avatar_url: user.avatar_url,
        } : null}
        subscription={subscription ? {
          plan_id: subscription.plan_id,
          credits_used: subscription.credits_used,
          credits_limit: subscription.credits_limit,
        } : null}
      />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
