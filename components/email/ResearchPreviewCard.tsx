'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Zap,
  ExternalLink,
  Loader2,
  Target,
} from 'lucide-react';
import { useResearchPreview } from '@/lib/hooks/useResearchPreview';
import { SIGNAL_TYPE_CONFIG, PERSONA_DISPLAY_NAMES_V3 } from '@/types/researchTypesV3';

interface ResearchPreviewCardProps {
  sessionId: string;
  companyName?: string;
}

export function ResearchPreviewCard({
  sessionId,
  companyName,
}: ResearchPreviewCardProps) {
  const { preview, loading, error } = useResearchPreview(sessionId);
  const [isExpanded, setIsExpanded] = useState(true);

  if (loading) {
    return (
      <div className="card p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
          <span className="ml-2 text-sm text-slate-500">
            Loading research preview...
          </span>
        </div>
      </div>
    );
  }

  if (error || !preview) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="w-4 h-4" />
          <span className="text-sm">Could not load research preview</span>
        </div>
      </div>
    );
  }

  const hasContent =
    preview.top_pain_points.length > 0 || preview.top_signals.length > 0;

  if (!hasContent) {
    return (
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900">Research Preview</h3>
            <p className="text-sm text-slate-500">
              {companyName || preview.company_name}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-500 mt-4">
          No detailed research data available for this session.
        </p>
      </div>
    );
  }

  return (
    <div className="card overflow-hidden">
      {/* Header - Always visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <Target className="w-5 h-5 text-violet-600" />
          </div>
          <div className="text-left">
            <h3 className="font-semibold text-slate-900">Research Preview</h3>
            <p className="text-sm text-slate-500">
              {companyName || preview.company_name} &middot; {preview.industry}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {preview.urgency && (
            <span
              className={`text-xs font-medium px-2 py-1 rounded-full ${
                preview.urgency === 'high'
                  ? 'bg-red-100 text-red-700'
                  : preview.urgency === 'medium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
              }`}
            >
              {preview.urgency.charAt(0).toUpperCase() +
                preview.urgency.slice(1)}{' '}
              Priority
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </div>
      </button>

      {/* Expanded Content */}
      {isExpanded && (
        <div className="px-6 pb-6 space-y-5 border-t border-slate-100 pt-5">
          {/* Top Pain Points */}
          {preview.top_pain_points.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <AlertTriangle className="w-3.5 h-3.5" />
                Top Pain Points
              </h4>
              <div className="space-y-2">
                {preview.top_pain_points.map((pp, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 rounded-lg border border-slate-100"
                  >
                    <p className="text-sm font-medium text-slate-800">
                      {pp.hypothesis}
                    </p>
                    <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                      {pp.evidence}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Signals */}
          {preview.top_signals.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Zap className="w-3.5 h-3.5" />
                Recent Signals
              </h4>
              <div className="space-y-2">
                {preview.top_signals.map((signal, idx) => {
                  const config = SIGNAL_TYPE_CONFIG[signal.type] || {
                    label: signal.type,
                    color: 'slate',
                  };
                  const headline =
                    signal.headline ||
                    signal.description ||
                    signal.detail ||
                    signal.signal ||
                    '';

                  return (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span
                              className={`text-xs font-medium px-2 py-0.5 rounded-full bg-${config.color}-100 text-${config.color}-700`}
                            >
                              {config.label}
                            </span>
                            {signal.date && (
                              <span className="text-xs text-slate-400">
                                {signal.date}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-800 line-clamp-2">
                            {headline}
                          </p>
                          {(signal.source_name || signal.source) && (
                            <p className="text-xs text-slate-400 mt-1">
                              Source: {signal.source_name || signal.source}
                            </p>
                          )}
                        </div>
                        {signal.source_url && (
                          <a
                            href={signal.source_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-1 text-slate-400 hover:text-slate-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Recommended Personas */}
          {preview.recommended_personas.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                Recommended Personas
              </h4>
              <div className="flex flex-wrap gap-2">
                {preview.recommended_personas.map((persona, idx) => (
                  <span
                    key={idx}
                    className="text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700"
                  >
                    {PERSONA_DISPLAY_NAMES_V3[persona] || persona}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* View Full Research Link */}
          <div className="pt-2">
            <Link
              href={`/research?session=${sessionId}`}
              className="text-sm text-indigo-600 hover:text-indigo-700 font-medium flex items-center gap-1"
            >
              View Full Research
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
