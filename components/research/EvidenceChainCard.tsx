import React, { useState } from 'react';
import { Link2, Signal, ChevronDown, ChevronUp, ExternalLink, HelpCircle } from 'lucide-react';
import type { HypothesisWithEvidence } from '../../types/researchV2Types';
import type { RecentSignal } from '../../types';

interface EvidenceChainCardProps {
  hypothesis: HypothesisWithEvidence;
  signals?: RecentSignal[];
  index: number;
}

const EvidenceChainCard: React.FC<EvidenceChainCardProps> = ({ hypothesis, signals = [], index }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine score color
  const getScoreColor = (score: number) => {
    if (score >= 2) return 'bg-green-100 text-green-700 border-green-200';
    if (score >= 1) return 'bg-yellow-100 text-yellow-700 border-yellow-200';
    return 'bg-slate-100 text-slate-700 border-slate-200';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-brand-100 text-brand-600 flex items-center justify-center text-sm font-semibold">
              {index + 1}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800">{hypothesis.pain_point_name}</h4>
              <p className="text-sm text-slate-600 mt-1">{hypothesis.hypothesis}</p>
            </div>
          </div>
          <span className={`flex-shrink-0 px-2 py-1 rounded text-xs font-medium border ${getScoreColor(hypothesis.total_score)}`}>
            Score: {hypothesis.total_score.toFixed(1)}
          </span>
        </div>
      </div>

      {/* Evidence Chain Toggle */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-2 bg-slate-50 hover:bg-slate-100 flex items-center justify-between text-sm text-slate-600 transition-colors"
      >
        <span className="flex items-center gap-2">
          <Link2 className="w-4 h-4 text-brand-500" />
          Evidence Chain ({hypothesis.evidence_chain.length} link{hypothesis.evidence_chain.length !== 1 ? 's' : ''})
        </span>
        {isExpanded ? (
          <ChevronUp className="w-4 h-4" />
        ) : (
          <ChevronDown className="w-4 h-4" />
        )}
      </button>

      {/* Evidence Chain Content */}
      {isExpanded && (
        <div className="p-4 bg-slate-50 border-t border-slate-100">
          <div className="space-y-3">
            {hypothesis.evidence_chain.map((link, linkIdx) => {
              const signal = signals[link.signal_index];
              return (
                <div
                  key={linkIdx}
                  className="flex items-start gap-3 text-xs border-l-2 border-brand-200 pl-3 py-2 bg-white rounded-r"
                >
                  <Signal className="w-3 h-3 text-brand-500 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-700 mb-1">
                      <span className="font-medium">Signal:</span>{' '}
                      {signal?.description?.substring(0, 150) || 'Signal data not available'}
                      {signal?.description && signal.description.length > 150 ? '...' : ''}
                    </p>
                    <p className="text-slate-500">
                      <span className="font-medium">Matched:</span>{' '}
                      <code className="bg-slate-100 px-1 py-0.5 rounded text-brand-600">
                        {link.matched_text}
                      </code>
                      <span className="ml-2 text-slate-400">
                        (weight: {link.match_score.toFixed(2)})
                      </span>
                    </p>
                    {link.source_url && (
                      <a
                        href={link.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-brand-600 hover:text-brand-700 mt-1"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Source
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Discovery Questions */}
      {hypothesis.discovery_questions.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
            <HelpCircle className="w-3 h-3" />
            Discovery Questions
          </div>
          <ul className="space-y-1">
            {hypothesis.discovery_questions.slice(0, 3).map((q, qIdx) => (
              <li key={qIdx} className="text-xs text-slate-600 flex items-start gap-2">
                <span className="text-slate-400">•</span>
                {q}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Target Personas */}
      {hypothesis.primary_personas.length > 0 && (
        <div className="px-4 py-3 border-t border-slate-100 bg-slate-50">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-500">Target Personas:</span>
            {hypothesis.primary_personas.map((persona, pIdx) => (
              <span
                key={pIdx}
                className="px-2 py-0.5 bg-brand-100 text-brand-700 rounded text-xs font-medium"
              >
                {persona.replace('_', ' ')}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default EvidenceChainCard;
