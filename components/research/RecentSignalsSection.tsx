import React from 'react';
import { RecentSignal } from '../../types';
import { AlertCircle, TrendingUp, DollarSign, Users, Cpu, Building, Radio } from 'lucide-react';

interface Props {
  signals: RecentSignal[];
}

const SIGNAL_ICONS: Record<string, typeof AlertCircle> = {
  financial: DollarSign,
  strategic: TrendingUp,
  pricing: AlertCircle,
  leadership: Users,
  technology: Cpu,
  industry: Building,
};

const SIGNAL_COLORS: Record<string, string> = {
  financial: 'bg-green-50 text-green-600 border-green-200',
  strategic: 'bg-blue-50 text-blue-600 border-blue-200',
  pricing: 'bg-amber-50 text-amber-600 border-amber-200',
  leadership: 'bg-purple-50 text-purple-600 border-purple-200',
  technology: 'bg-cyan-50 text-cyan-600 border-cyan-200',
  industry: 'bg-slate-50 text-slate-600 border-slate-200',
};

const RecentSignalsSection: React.FC<Props> = ({ signals }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
        <Radio className="w-5 h-5 text-brand-600 mr-2" />
        Recent Signals
        <span className="ml-2 text-sm font-normal text-slate-400">({signals.length})</span>
      </h3>

      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
        {signals.map((signal, idx) => {
          const Icon = SIGNAL_ICONS[signal.signal_type] || AlertCircle;
          const colorClass = SIGNAL_COLORS[signal.signal_type] || SIGNAL_COLORS.industry;

          return (
            <div key={idx} className="border-l-2 border-slate-200 pl-4 py-2">
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClass}`}>
                  <Icon className="w-3 h-3 mr-1" />
                  {signal.signal_type}
                </span>
                <span className="text-xs text-slate-400">{signal.date}</span>
              </div>
              <p className="text-sm text-slate-700 mb-2">{signal.description}</p>
              <p className="text-xs text-slate-500">
                <span className="font-medium">Source:</span> {signal.source}
              </p>
              <p className="text-xs text-brand-600 mt-1">
                <span className="font-medium">Relevance:</span> {signal.relevance_to_revology}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default RecentSignalsSection;
