import React, { useState } from 'react';

// Revify Outreach - Enterprise Dashboard Preview
// Design: Clean, modern SaaS with Emerald/Green theme
// Inspired by: AixUP interface with card-based navigation

const RevifyDashboard = () => {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [credits] = useState({ used: 47, total: 500 });

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboardIcon },
    { id: 'research', label: 'Research', icon: SearchIcon },
    { id: 'bulk', label: 'Bulk Research', icon: LayersIcon },
    { id: 'email', label: 'Email Outreach', icon: MailIcon },
    { id: 'history', label: 'History', icon: ClockIcon },
    { id: 'settings', label: 'Settings', icon: SettingsIcon },
  ];

  const researchOptions = [
    {
      id: 'quick',
      title: 'Quick Research',
      description: 'Fast company overview with key signals',
      icon: ZapIcon,
      credits: 1,
      color: 'emerald',
    },
    {
      id: 'standard',
      title: 'Standard Research',
      description: 'Comprehensive analysis with pain points',
      icon: SearchIcon,
      credits: 2,
      color: 'emerald',
    },
    {
      id: 'deep',
      title: 'Deep Research',
      description: 'Full competitive intelligence report',
      icon: MicroscopeIcon,
      credits: 3,
      color: 'emerald',
    },
    {
      id: 'bulk',
      title: 'Bulk Research',
      description: 'Research multiple companies at once',
      icon: LayersIcon,
      credits: 'varies',
      color: 'blue',
    },
    {
      id: 'ghl',
      title: 'Import from GHL',
      description: 'Pull companies from GoHighLevel',
      icon: CloudDownloadIcon,
      credits: 'free',
      color: 'purple',
    },
    {
      id: 'email',
      title: 'Generate Emails',
      description: 'Create personalized outreach emails',
      icon: MailIcon,
      credits: 'included',
      color: 'amber',
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex" style={{ fontFamily: "'Plus Jakarta Sans', -apple-system, sans-serif" }}>
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shadow-sm">
        {/* Logo */}
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8"/>
                <path d="m21 21-4.35-4.35"/>
              </svg>
            </div>
            <div>
              <h1 className="font-bold text-slate-900 text-lg tracking-tight">Revify</h1>
              <p className="text-xs text-slate-500 -mt-0.5">Outreach Intelligence</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveNav(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 ${
                activeNav === item.id
                  ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <item.icon className="w-5 h-5" />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Credits Widget */}
        <div className="p-4 border-t border-slate-100">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Credits</span>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">Pro Plan</span>
            </div>
            <div className="flex items-end gap-1 mb-2">
              <span className="text-3xl font-bold text-slate-900">{credits.total - credits.used}</span>
              <span className="text-slate-400 text-sm mb-1">/ {credits.total}</span>
            </div>
            <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${((credits.total - credits.used) / credits.total) * 100}%` }}
              />
            </div>
            <button className="w-full mt-3 text-xs text-emerald-600 font-semibold hover:text-emerald-700 transition-colors">
              Upgrade Plan →
            </button>
          </div>
        </div>

        {/* User */}
        <div className="p-4 border-t border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-lg">
              JD
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 truncate">John Doe</p>
              <p className="text-xs text-slate-500 truncate">john@company.com</p>
            </div>
            <button className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors">
              <LogOutIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        {/* Header */}
        <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">What are you researching?</h2>
              <p className="text-slate-500 text-sm mt-0.5">Select a research type to get started</p>
            </div>
            <div className="flex items-center gap-3">
              <button className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2">
                <HelpCircleIcon className="w-4 h-4" />
                Help
              </button>
              <button className="px-4 py-2 text-sm font-medium bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-lg shadow-slate-900/10">
                <PlusIcon className="w-4 h-4" />
                Quick Research
              </button>
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
                    <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5"/>
                  </pattern>
                </defs>
                <rect width="100" height="100" fill="url(#grid)"/>
              </svg>
            </div>
            <div className="absolute -right-10 -top-10 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
            <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-teal-400/20 rounded-full blur-3xl" />

            <div className="relative z-10">
              <div className="flex items-start justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 backdrop-blur-xl rounded-full text-xs font-semibold mb-4">
                    <SparklesIcon className="w-3 h-3" />
                    AI-Powered Research
                  </span>
                  <h3 className="text-3xl font-bold mb-2">Research smarter, close faster</h3>
                  <p className="text-emerald-100 max-w-lg">
                    Get deep insights on any company in seconds. Our AI analyzes news, financials, and signals to give you the perfect talking points.
                  </p>
                </div>
                <div className="hidden lg:block">
                  <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20">
                    <div className="text-4xl font-bold mb-1">2,847</div>
                    <div className="text-emerald-100 text-sm">Companies researched this month</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Research Options Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {researchOptions.map((option) => (
              <ResearchCard key={option.id} option={option} />
            ))}
          </div>

          {/* Recent Activity */}
          <div className="mt-10">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Recent Research</h3>
              <button className="text-sm font-medium text-emerald-600 hover:text-emerald-700 transition-colors">
                View All →
              </button>
            </div>
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {[
                { company: 'Acme Corporation', industry: 'Manufacturing', time: '2 hours ago', confidence: 92 },
                { company: 'TechFlow Inc', industry: 'SaaS', time: '5 hours ago', confidence: 87 },
                { company: 'Global Logistics', industry: 'Transportation', time: 'Yesterday', confidence: 78 },
              ].map((item, i) => (
                <div key={i} className={`flex items-center justify-between p-4 hover:bg-slate-50 transition-colors ${i !== 2 ? 'border-b border-slate-100' : ''}`}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center">
                      <BuildingIcon className="w-5 h-5 text-slate-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">{item.company}</p>
                      <p className="text-xs text-slate-500">{item.industry} • {item.time}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="text-sm font-semibold text-slate-900">{item.confidence}%</div>
                      <div className="text-xs text-slate-500">Confidence</div>
                    </div>
                    <button className="p-2 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
                      <ArrowRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

// Research Card Component
const ResearchCard = ({ option }) => {
  const colorClasses = {
    emerald: {
      bg: 'bg-emerald-50 hover:bg-emerald-100',
      icon: 'bg-emerald-500 text-white',
      border: 'border-emerald-200 hover:border-emerald-300',
      badge: 'bg-emerald-100 text-emerald-700',
    },
    blue: {
      bg: 'bg-blue-50 hover:bg-blue-100',
      icon: 'bg-blue-500 text-white',
      border: 'border-blue-200 hover:border-blue-300',
      badge: 'bg-blue-100 text-blue-700',
    },
    purple: {
      bg: 'bg-purple-50 hover:bg-purple-100',
      icon: 'bg-purple-500 text-white',
      border: 'border-purple-200 hover:border-purple-300',
      badge: 'bg-purple-100 text-purple-700',
    },
    amber: {
      bg: 'bg-amber-50 hover:bg-amber-100',
      icon: 'bg-amber-500 text-white',
      border: 'border-amber-200 hover:border-amber-300',
      badge: 'bg-amber-100 text-amber-700',
    },
  };

  const colors = colorClasses[option.color] || colorClasses.emerald;

  return (
    <button className={`group relative p-6 rounded-2xl border-2 ${colors.border} ${colors.bg} transition-all duration-300 text-left hover:shadow-lg hover:-translate-y-1`}>
      <div className={`w-12 h-12 ${colors.icon} rounded-xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        <option.icon className="w-6 h-6" />
      </div>
      <h4 className="font-bold text-slate-900 text-lg mb-1">{option.title}</h4>
      <p className="text-slate-600 text-sm mb-4">{option.description}</p>
      <span className={`inline-flex items-center px-3 py-1 ${colors.badge} rounded-full text-xs font-semibold`}>
        {typeof option.credits === 'number' ? `${option.credits} credit${option.credits > 1 ? 's' : ''}` : option.credits}
      </span>
    </button>
  );
};

// Icon Components (simplified Lucide-style icons)
const LayoutDashboardIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>
  </svg>
);

const SearchIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
);

const LayersIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
  </svg>
);

const MailIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
  </svg>
);

const ClockIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);

const SettingsIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const ZapIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>
  </svg>
);

const MicroscopeIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>
  </svg>
);

const CloudDownloadIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/><path d="M12 12v9"/><path d="m8 17 4 4 4-4"/>
  </svg>
);

const LogOutIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
);

const HelpCircleIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/>
  </svg>
);

const PlusIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const SparklesIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/><path d="M5 3v4"/><path d="M19 17v4"/><path d="M3 5h4"/><path d="M17 19h4"/>
  </svg>
);

const BuildingIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="4" y="2" width="16" height="20" rx="2" ry="2"/><path d="M9 22v-4h6v4"/><path d="M8 6h.01"/><path d="M16 6h.01"/><path d="M12 6h.01"/><path d="M12 10h.01"/><path d="M12 14h.01"/><path d="M16 10h.01"/><path d="M16 14h.01"/><path d="M8 10h.01"/><path d="M8 14h.01"/>
  </svg>
);

const ArrowRightIcon = ({ className }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>
  </svg>
);

export default RevifyDashboard;
