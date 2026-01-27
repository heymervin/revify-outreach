import React from 'react';
import { Bell, Search, User } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-6 sticky top-0 z-20">
      <div className="flex items-center text-slate-400">
        <Search className="w-4 h-4 mr-2" />
        <input 
          type="text" 
          placeholder="Search research..." 
          className="bg-transparent border-none focus:ring-0 text-sm w-64 placeholder-slate-400"
        />
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
        </button>
        <div className="h-8 w-px bg-slate-200 mx-2"></div>
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold border border-brand-200">
            JD
          </div>
          <div className="hidden md:block text-sm">
            <p className="font-medium text-slate-700">John Doe</p>
            <p className="text-xs text-slate-500">Workspace Admin</p>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;