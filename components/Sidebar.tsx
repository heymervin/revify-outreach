import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Mail, History, Settings, BrainCircuit } from 'lucide-react';

const Sidebar: React.FC = () => {
  const navItems = [
    { icon: LayoutDashboard, label: 'Research', path: '/research' },
    { icon: Mail, label: 'Email Outreach', path: '/email' },
    { icon: History, label: 'History', path: '/history' },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 hidden md:flex flex-col h-full shadow-sm z-10">
      <div className="p-6 flex items-center space-x-3 border-b border-slate-100">
        <div className="bg-brand-600 p-2 rounded-lg">
          <BrainCircuit className="w-6 h-6 text-white" />
        </div>
        <span className="text-xl font-bold text-slate-800 tracking-tight">Revify</span>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
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
          <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">Pro Plan</h4>
          <div className="w-full bg-slate-200 h-2 rounded-full mb-2">
            <div className="bg-brand-500 h-2 rounded-full w-3/4"></div>
          </div>
          <p className="text-xs text-slate-500">75/100 Credits Used</p>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;