import React from 'react';
import { AlertTriangle, Search, ExternalLink, ChevronRight } from 'lucide-react';

interface ResearchGapsPanelProps {
  gaps: string[];
  companyName?: string;
}

const ResearchGapsPanel: React.FC<ResearchGapsPanelProps> = ({ gaps, companyName }) => {
  if (!gaps || gaps.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center mb-4">
          <Search className="w-5 h-5 mr-2 text-green-600" />
          Research Coverage
        </h3>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <span className="text-green-700 text-sm">
            No significant research gaps identified. Coverage appears comprehensive.
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 flex items-center mb-4">
        <AlertTriangle className="w-5 h-5 mr-2 text-amber-500" />
        Research Gaps & Next Steps
      </h3>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
        <p className="text-amber-800 text-sm">
          The following gaps were identified during research. Consider addressing these for a more complete picture.
        </p>
      </div>

      <ul className="space-y-3">
        {gaps.map((gap, idx) => (
          <li key={idx} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
            <ChevronRight className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <span className="text-sm text-slate-700">{gap}</span>
          </li>
        ))}
      </ul>

      {/* Suggested actions */}
      {companyName && (
        <div className="mt-6 pt-4 border-t border-slate-100">
          <h4 className="text-sm font-semibold text-slate-700 mb-3">Suggested Actions</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(companyName + ' revenue annual report')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Search Annual Reports
            </a>
            <a
              href={`https://www.linkedin.com/company/${encodeURIComponent(companyName.toLowerCase().replace(/\s+/g, '-'))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View LinkedIn Profile
            </a>
            <a
              href={`https://www.google.com/search?q=${encodeURIComponent(companyName + ' news recent')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Search Recent News
            </a>
            <a
              href={`https://www.sec.gov/cgi-bin/browse-edgar?company=${encodeURIComponent(companyName)}&CIK=&type=10-K&owner=include&count=10&action=getcompany`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-600 hover:border-brand-300 hover:text-brand-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              Check SEC Filings
            </a>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResearchGapsPanel;
