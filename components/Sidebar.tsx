import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Mail, History, Settings, BrainCircuit, Users, X } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface SidebarProps {
  open: boolean;
  onClose: () => void;
}

const navItems = [
  { icon: LayoutDashboard, label: 'Research', path: '/research' },
  { icon: Users, label: 'Bulk Research', path: '/bulk' },
  { icon: Mail, label: 'Email Outreach', path: '/email' },
  { icon: History, label: 'History', path: '/history' },
  { icon: Settings, label: 'Settings', path: '/settings' },
];

const Sidebar = ({ open, onClose }: SidebarProps) => {
  const { getUsageStats } = useSettings();
  const stats = getUsageStats();
  const usageCount = stats.records.length;
  const usageCap = 100;
  const usagePercent = Math.min(Math.round((usageCount / usageCap) * 100), 100);

  return (
    <>
      {/* Mobile overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/30 z-30 md:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col h-full shadow-sm
          transform transition-transform duration-200 ease-in-out
          md:relative md:translate-x-0
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
        role="navigation"
        aria-label="Main navigation"
      >
        <div className="p-6 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center space-x-3">
            <div className="bg-brand-700 p-2 rounded-lg">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800 tracking-tight">Revify</span>
          </div>
          <button
            onClick={onClose}
            className="md:hidden p-1 text-slate-400 hover:text-slate-600 transition-colors"
            aria-label="Close navigation menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors duration-200 ${
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-medium border-l-4 border-brand-600'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <item.icon className="w-5 h-5" />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
            <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Usage</h4>
            <div className="w-full bg-slate-200 h-2 rounded-full mb-2">
              <div
                className="bg-brand-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${usagePercent}%` }}
              />
            </div>
            <p className="text-xs text-slate-500">{usageCount} API calls tracked</p>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
