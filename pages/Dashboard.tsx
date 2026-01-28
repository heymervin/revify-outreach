import React, { useState } from 'react';
import { Search, Layers } from 'lucide-react';
import { ResearchFormV3_1, ResearchFormV3_2 } from '../components/research';
import ResearchResults from '../components/ResearchResults';

type ResearchMode = 'v3_1' | 'v3_2';

const Dashboard: React.FC = () => {
  const [mode, setMode] = useState<ResearchMode>('v3_1');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Research & Intelligence</h1>
        <p className="text-slate-500 mt-1">Generate deep insights on target accounts in seconds.</p>
      </div>

      {/* Research Mode Tabs */}
      <div className="flex space-x-2 mb-6">
        <button
          onClick={() => setMode('v3_1')}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'v3_1'
              ? 'bg-emerald-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Search className="w-4 h-4 mr-2" />
          OpenAI Search
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-emerald-500/20 rounded">V3.1</span>
        </button>
        <button
          onClick={() => setMode('v3_2')}
          className={`flex items-center px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            mode === 'v3_2'
              ? 'bg-purple-600 text-white'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
          }`}
        >
          <Layers className="w-4 h-4 mr-2" />
          Hybrid
          <span className="ml-2 px-1.5 py-0.5 text-xs bg-purple-500/20 rounded">V3.2</span>
        </button>
      </div>

      {/* Mode Description */}
      <div className="mb-4 text-sm text-slate-500">
        {mode === 'v3_1' ? (
          <p>Pure OpenAI web search for news, signals, and company data.</p>
        ) : (
          <p>Tavily (website scraping + databases) combined with OpenAI web search for maximum coverage.</p>
        )}
      </div>

      {/* Render the selected form */}
      {mode === 'v3_1' && <ResearchFormV3_1 />}
      {mode === 'v3_2' && <ResearchFormV3_2 />}

      <ResearchResults />
    </div>
  );
};

export default Dashboard;
