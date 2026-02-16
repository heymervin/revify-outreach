'use client';

import { useState } from 'react';
import {
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Newspaper,
  Briefcase,
  Globe,
  MessageSquare,
  FileText,
  DollarSign,
  Star,
} from 'lucide-react';
import { type SourceType, type PainPointSource } from '@/types/researchTypesV3';

interface SourceAttributionProps {
  sources: PainPointSource[];
  maxVisible?: number;
  className?: string;
}

const sourceTypeConfig: Record<
  SourceType,
  { icon: typeof Newspaper; label: string; color: string }
> = {
  news: { icon: Newspaper, label: 'News', color: 'text-blue-600 bg-blue-50' },
  job_posting: { icon: Briefcase, label: 'Job Posting', color: 'text-purple-600 bg-purple-50' },
  website: { icon: Globe, label: 'Website', color: 'text-teal-600 bg-teal-50' },
  social: { icon: MessageSquare, label: 'Social', color: 'text-pink-600 bg-pink-50' },
  press_release: { icon: FileText, label: 'Press Release', color: 'text-amber-600 bg-amber-50' },
  financial: { icon: DollarSign, label: 'Financial', color: 'text-green-600 bg-green-50' },
  review: { icon: Star, label: 'Review', color: 'text-orange-600 bg-orange-50' },
};

export function SourceAttribution({
  sources,
  maxVisible = 3,
  className = '',
}: SourceAttributionProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) {
    return null;
  }

  const visibleSources = expanded ? sources : sources.slice(0, maxVisible);
  const hasMore = sources.length > maxVisible;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
          Sources ({sources.length})
        </span>
        {hasMore && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-xs text-teal-600 hover:text-teal-700 flex items-center gap-0.5 focus-visible:ring-2 focus-visible:ring-teal-500 focus:outline-none rounded"
            aria-expanded={expanded}
            aria-controls="source-list"
          >
            {expanded ? (
              <>
                Show less <ChevronUp className="w-3 h-3" aria-hidden="true" />
              </>
            ) : (
              <>
                Show all <ChevronDown className="w-3 h-3" aria-hidden="true" />
              </>
            )}
          </button>
        )}
      </div>

      <div id="source-list" className="space-y-1.5" role="list" aria-label="Research sources">
        {visibleSources.map((source, index) => {
          const config = sourceTypeConfig[source.type] || sourceTypeConfig.website;
          const Icon = config.icon;

          return (
            <div
              key={index}
              className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg"
              role="listitem"
            >
              <div
                className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${config.color}`}
                aria-hidden="true"
              >
                <Icon className="w-3.5 h-3.5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {source.url ? (
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-slate-700 hover:text-teal-600 truncate flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-teal-500 focus:outline-none rounded"
                    >
                      {source.title}
                      <ExternalLink className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                      <span className="sr-only">(opens in new tab)</span>
                    </a>
                  ) : (
                    <span className="text-sm text-slate-700 truncate">
                      {source.title}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-slate-400">{config.label}</span>
                  {source.date && (
                    <>
                      <span className="text-xs text-slate-300">•</span>
                      <span className="text-xs text-slate-400">{source.date}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Compact inline source list for smaller spaces
interface InlineSourcesProps {
  sources: PainPointSource[];
  className?: string;
}

export function InlineSources({ sources, className = '' }: InlineSourcesProps) {
  if (!sources || sources.length === 0) {
    return null;
  }

  return (
    <div className={`flex items-center gap-1.5 flex-wrap ${className}`}>
      {sources.slice(0, 4).map((source, index) => {
        const config = sourceTypeConfig[source.type] || sourceTypeConfig.website;
        const Icon = config.icon;

        return (
          <span
            key={index}
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${config.color}`}
            title={source.title}
          >
            <Icon className="w-3 h-3" />
            {config.label}
          </span>
        );
      })}
      {sources.length > 4 && (
        <span className="text-xs text-slate-400">+{sources.length - 4} more</span>
      )}
    </div>
  );
}

export default SourceAttribution;
