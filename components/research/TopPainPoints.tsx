'use client';

import { useState } from 'react';
import { Target, ChevronDown, ChevronUp, Mail, Lightbulb } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ConfidenceBadge, getConfidenceLevel } from '@/components/ui/ConfidenceBadge';
import { SourceAttribution } from './SourceAttribution';
import { type PainPointHypothesis, type ConfidenceLevel } from '@/types/researchTypesV3';

interface TopPainPointsProps {
  painPoints: PainPointHypothesis[];
  maxVisible?: number;
  onGenerateEmail?: (painPoint: PainPointHypothesis) => void;
  className?: string;
}

export function TopPainPoints({
  painPoints,
  maxVisible = 3,
  onGenerateEmail,
  className = '',
}: TopPainPointsProps) {
  const [expanded, setExpanded] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!painPoints || painPoints.length === 0) {
    return null;
  }

  // Sort by confidence score (highest first)
  const sortedPainPoints = [...painPoints].sort((a, b) => {
    const scoreA = a.confidence_score ?? 50;
    const scoreB = b.confidence_score ?? 50;
    return scoreB - scoreA;
  });

  const visiblePainPoints = expanded
    ? sortedPainPoints
    : sortedPainPoints.slice(0, maxVisible);
  const hasMore = sortedPainPoints.length > maxVisible;

  return (
    <Card padding="md" className={className}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-gold-100 rounded-lg">
            <Target className="w-5 h-5 text-gold-600" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 font-heading">
              Pain Point Hypotheses
            </h3>
            <p className="text-xs text-slate-500">
              {sortedPainPoints.length} identified • Sorted by confidence
            </p>
          </div>
        </div>

        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExpanded(!expanded)}
            rightIcon={expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          >
            {expanded ? 'Show less' : `See all (${sortedPainPoints.length})`}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {visiblePainPoints.map((point, index) => {
          const isExpanded = selectedIndex === index;
          const confidence: ConfidenceLevel = point.confidence || getConfidenceLevel(point.confidence_score ?? 50);

          return (
            <div
              key={index}
              className={`rounded-xl border transition-all ${
                index < 3
                  ? 'bg-gold-50/50 border-gold-200'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              {/* Header - always visible */}
              <button
                onClick={() => setSelectedIndex(isExpanded ? null : index)}
                className="w-full p-4 text-left flex items-start gap-3"
              >
                {/* Rank badge for top 3 */}
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    index < 3
                      ? 'bg-gold-500 text-white'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  <span className="text-xs font-bold">{index + 1}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-medium text-slate-900">{point.hypothesis}</p>
                    <ConfidenceBadge
                      level={confidence}
                      score={point.confidence_score}
                      sourceCount={point.sources?.length}
                      size="sm"
                    />
                  </div>
                </div>

                <span className="text-slate-400 flex-shrink-0">
                  {isExpanded ? (
                    <ChevronUp className="w-5 h-5" />
                  ) : (
                    <ChevronDown className="w-5 h-5" />
                  )}
                </span>
              </button>

              {/* Expanded content */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-3">
                  {/* Evidence */}
                  <div className="mt-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lightbulb className="w-3.5 h-3.5 text-slate-400" />
                      <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Evidence
                      </span>
                    </div>
                    <p className="text-sm text-slate-600">{point.evidence}</p>
                  </div>

                  {/* Solution fit */}
                  {point.revology_solution_fit && (
                    <div className="p-3 bg-teal-50 rounded-lg border border-teal-100">
                      <span className="text-xs font-medium text-teal-600 uppercase tracking-wider">
                        Solution Fit
                      </span>
                      <p className="text-sm text-teal-700 mt-1">
                        {point.revology_solution_fit}
                      </p>
                    </div>
                  )}

                  {/* Sources */}
                  {point.sources && point.sources.length > 0 && (
                    <SourceAttribution sources={point.sources} maxVisible={3} />
                  )}

                  {/* Generate email button */}
                  {onGenerateEmail && (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onGenerateEmail(point)}
                      leftIcon={<Mail className="w-4 h-4" />}
                      className="w-full mt-2"
                    >
                      Generate email with this pain point
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default TopPainPoints;
