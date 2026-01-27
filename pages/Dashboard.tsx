import React, { useState } from 'react';
import ResearchForm from '../components/ResearchForm';
import ResearchFormV2 from '../components/ResearchFormV2';
import { ResearchFormV3 } from '../components/research';
import ResearchResults from '../components/ResearchResults';
import { Sparkles, Zap, Shield } from 'lucide-react';

type ResearchVersion = 'classic' | 'v2' | 'v3';

const Dashboard: React.FC = () => {
  const [version, setVersion] = useState<ResearchVersion>('v3'); // Default to V3

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Research & Intelligence</h1>
          <p className="text-slate-500 mt-1">Generate deep insights on target accounts in seconds.</p>
        </div>

        {/* Version Tabs */}
        <div className="flex items-center gap-1 bg-slate-100 rounded-lg p-1">
          <button
            onClick={() => setVersion('classic')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              version === 'classic'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Zap className="w-4 h-4" />
            Classic
          </button>
          <button
            onClick={() => setVersion('v2')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              version === 'v2'
                ? 'bg-white text-brand-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            V2 Enhanced
          </button>
          <button
            onClick={() => setVersion('v3')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              version === 'v3'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Shield className="w-4 h-4" />
            V3 Strict
          </button>
        </div>
      </div>

      {version === 'classic' && <ResearchForm />}
      {version === 'v2' && <ResearchFormV2 />}
      {version === 'v3' && <ResearchFormV3 />}
      <ResearchResults />
    </div>
  );
};

export default Dashboard;
