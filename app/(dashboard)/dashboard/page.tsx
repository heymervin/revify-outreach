import Link from 'next/link';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import {
  Zap,
  Search,
  Microscope,
  Layers,
  CloudDownload,
  Mail,
  Building2,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Plus,
} from 'lucide-react';

const researchOptions = [
  {
    id: 'quick',
    title: 'Quick Research',
    description: 'Fast company overview with key signals',
    href: '/research?type=quick',
    icon: Zap,
    credits: 1,
    color: 'emerald',
  },
  {
    id: 'standard',
    title: 'Standard Research',
    description: 'Comprehensive analysis with pain points',
    href: '/research?type=standard',
    icon: Search,
    credits: 2,
    color: 'emerald',
  },
  {
    id: 'deep',
    title: 'Deep Research',
    description: 'Full competitive intelligence report',
    href: '/research?type=deep',
    icon: Microscope,
    credits: 3,
    color: 'emerald',
  },
  {
    id: 'bulk',
    title: 'Bulk Research',
    description: 'Research multiple companies at once',
    href: '/bulk',
    icon: Layers,
    credits: 'varies',
    color: 'blue',
  },
  {
    id: 'ghl',
    title: 'Import from GHL',
    description: 'Pull companies from GoHighLevel',
    href: '/bulk?source=ghl',
    icon: CloudDownload,
    credits: 'free',
    color: 'purple',
  },
  {
    id: 'email',
    title: 'Generate Emails',
    description: 'Create personalized outreach emails',
    href: '/email',
    icon: Mail,
    credits: 'included',
    color: 'amber',
  },
];

const colorClasses: Record<string, { bg: string; icon: string; border: string; badge: string }> = {
  emerald: {
    bg: 'bg-emerald-50 hover:bg-emerald-100',
    icon: 'bg-emerald-500 text-white shadow-emerald-500/30',
    border: 'border-emerald-200 hover:border-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700',
  },
  blue: {
    bg: 'bg-blue-50 hover:bg-blue-100',
    icon: 'bg-blue-500 text-white shadow-blue-500/30',
    border: 'border-blue-200 hover:border-blue-300',
    badge: 'bg-blue-100 text-blue-700',
  },
  purple: {
    bg: 'bg-purple-50 hover:bg-purple-100',
    icon: 'bg-purple-500 text-white shadow-purple-500/30',
    border: 'border-purple-200 hover:border-purple-300',
    badge: 'bg-purple-100 text-purple-700',
  },
  amber: {
    bg: 'bg-amber-50 hover:bg-amber-100',
    icon: 'bg-amber-500 text-white shadow-amber-500/30',
    border: 'border-amber-200 hover:border-amber-300',
    badge: 'bg-amber-100 text-amber-700',
  },
};

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();

  // Get recent research sessions
  const { data: recentResearch } = await supabase
    .from('research_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(3);

  // Get usage stats
  const { data: usageStats } = await supabase
    .from('research_sessions')
    .select('id')
    .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  const monthlyResearchCount = usageStats?.length || 0;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">What are you researching?</h2>
            <p className="text-slate-500 text-sm mt-0.5">Select a research type to get started</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="btn-ghost">
              <HelpCircle className="w-4 h-4" />
              Help
            </button>
            <Link href="/research" className="btn-primary">
              <Plus className="w-4 h-4" />
              Quick Research
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="p-8">
        {/* Hero Section */}
        <div className="relative mb-10 overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-600 p-8 text-white shadow-2xl shadow-emerald-500/25">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10">
            <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
              <defs>
                <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                  <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />
            </svg>
          </div>
          <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-teal-400/20 rounded-full blur-3xl" />

          <div className="relative z-10">
            <div className="flex items-start justify-between">
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-xl rounded-full text-xs font-semibold mb-4">
                  <Sparkles className="w-3 h-3" />
                  AI-Powered Research
                </span>
                <h3 className="text-3xl font-bold mb-2">Research smarter, close faster</h3>
                <p className="text-emerald-100 max-w-lg text-sm leading-relaxed">
                  Get deep insights on any company in seconds. Our AI analyzes news, financials, and
                  signals to give you the perfect talking points.
                </p>
              </div>
              <div className="hidden lg:block">
                <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                  <div className="text-4xl font-bold mb-1">{monthlyResearchCount.toLocaleString()}</div>
                  <div className="text-emerald-100 text-sm">Researches this month</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Research Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {researchOptions.map((option, index) => {
            const colors = colorClasses[option.color];
            const Icon = option.icon;

            return (
              <Link
                key={option.id}
                href={option.href}
                className={`group relative p-6 rounded-2xl border-2 ${colors.border} ${colors.bg} transition-all duration-300 hover:shadow-xl hover:-translate-y-1`}
                style={{
                  animationDelay: `${index * 0.1}s`,
                }}
              >
                <div
                  className={`w-12 h-12 ${colors.icon} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}
                >
                  <Icon className="w-6 h-6" />
                </div>
                <h4 className="font-bold text-slate-900 text-lg mb-1">{option.title}</h4>
                <p className="text-slate-600 text-sm mb-4">{option.description}</p>
                <span className={`inline-flex items-center px-3 py-1 ${colors.badge} rounded-full text-xs font-semibold`}>
                  {typeof option.credits === 'number'
                    ? `${option.credits} credit${option.credits > 1 ? 's' : ''}`
                    : option.credits}
                </span>
              </Link>
            );
          })}
        </div>

        {/* Recent Activity */}
        {recentResearch && recentResearch.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Recent Research</h3>
              <Link
                href="/history"
                className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 transition-colors"
              >
                View All →
              </Link>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {recentResearch.map((research, index) => (
                <Link
                  key={research.id}
                  href={`/history/${research.id}`}
                  className={`flex items-center justify-between p-4 hover:bg-slate-50 transition-colors ${
                    index !== recentResearch.length - 1 ? 'border-b border-slate-100' : ''
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{research.company_name}</p>
                      <p className="text-xs text-slate-500">
                        {research.industry || 'Unknown'} •{' '}
                        {new Date(research.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {research.confidence_score && (
                      <div className="text-right">
                        <div className="text-sm font-semibold text-slate-900">
                          {Math.round(research.confidence_score * 100)}%
                        </div>
                        <div className="text-xs text-slate-500">Confidence</div>
                      </div>
                    )}
                    <div className="p-2 text-slate-400 group-hover:text-emerald-600 transition-colors">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Empty State for new users */}
        {(!recentResearch || recentResearch.length === 0) && (
          <div className="mt-10 bg-white rounded-2xl border border-slate-200 p-8 text-center">
            <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Search className="w-8 h-8 text-emerald-600" />
            </div>
            <h3 className="text-lg font-bold text-slate-900 mb-2">No research yet</h3>
            <p className="text-slate-500 mb-6 max-w-md mx-auto">
              Start your first research to see company insights, signals, and personalized talking
              points.
            </p>
            <Link href="/research" className="btn-primary">
              <Plus className="w-4 h-4" />
              Start Your First Research
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
