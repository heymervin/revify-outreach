import React from 'react';
import { ResearchConfidence } from '../../types';
import { Shield, AlertCircle } from 'lucide-react';

interface Props {
  confidence: ResearchConfidence;
}

const ResearchConfidenceIndicator: React.FC<Props> = ({ confidence }) => {
  const score = confidence.overall_score;
  const percentage = (score / 5) * 100;

  const getScoreColor = (s: number) => {
    if (s >= 4) return { bg: 'bg-green-100', text: 'text-green-600', bar: 'bg-green-500' };
    if (s >= 3) return { bg: 'bg-yellow-100', text: 'text-yellow-600', bar: 'bg-yellow-500' };
    return { bg: 'bg-red-100', text: 'text-red-600', bar: 'bg-red-500' };
  };

  const colors = getScoreColor(score);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 h-full">
      <h4 className="text-sm font-semibold text-slate-700 mb-4 flex items-center">
        <Shield className="w-4 h-4 mr-2 text-brand-600" />
        Research Confidence
      </h4>

      <div className="flex items-center justify-center mb-4">
        <div className={`w-16 h-16 rounded-full flex items-center justify-center ${colors.bg}`}>
          <span className={`text-2xl font-bold ${colors.text}`}>{score}</span>
          <span className={`text-sm ${colors.text}`}>/5</span>
        </div>
      </div>

      <div className="w-full bg-slate-100 rounded-full h-2 mb-4">
        <div
          className={`h-2 rounded-full transition-all duration-500 ${colors.bar}`}
          style={{ width: `${percentage}%` }}
        />
      </div>

      {confidence.gaps.length > 0 && (
        <div className="mt-4">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center">
            <AlertCircle className="w-3 h-3 mr-1" />
            Research Gaps
          </span>
          <ul className="mt-2 space-y-1">
            {confidence.gaps.map((gap, idx) => (
              <li key={idx} className="text-xs text-slate-600 flex items-start">
                <span className="w-1 h-1 rounded-full bg-slate-400 mt-1.5 mr-2 flex-shrink-0" />
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ResearchConfidenceIndicator;
