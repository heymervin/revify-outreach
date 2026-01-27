import React from 'react';
import { BarChart3, Shield, Clock, DollarSign, FileText, TrendingUp } from 'lucide-react';
import type { ConfidenceBreakdownV2 } from '../../types/researchV2Types';

interface ConfidenceBreakdownPanelProps {
  breakdown: ConfidenceBreakdownV2;
}

const ConfidenceBreakdownPanel: React.FC<ConfidenceBreakdownPanelProps> = ({ breakdown }) => {
  const getScoreColor = (score: number) => {
    if (score >= 0.7) return 'bg-green-500';
    if (score >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getOverallColor = (score: number) => {
    if (score >= 0.7) return 'text-green-600';
    if (score >= 0.4) return 'text-yellow-600';
    return 'text-red-600';
  };

  const metrics = [
    {
      label: 'Signal Quantity',
      icon: BarChart3,
      score: breakdown.signal_quantity.score,
      detail: breakdown.signal_quantity.detail,
      subtext: `${breakdown.signal_quantity.found} / ${breakdown.signal_quantity.expected} sources`,
    },
    {
      label: 'Source Quality',
      icon: Shield,
      score: breakdown.source_quality.score,
      detail: `${(breakdown.source_quality.average_credibility * 100).toFixed(0)}% avg credibility`,
      subtext: `${breakdown.source_quality.tier1_count} tier-1, ${breakdown.source_quality.tier2_count} tier-2`,
    },
    {
      label: 'Signal Freshness',
      icon: Clock,
      score: breakdown.signal_freshness.score,
      detail: `${breakdown.signal_freshness.within_3_months} recent signals`,
      subtext: `Within 3mo: ${breakdown.signal_freshness.within_3_months}, 6mo: ${breakdown.signal_freshness.within_6_months}`,
    },
    {
      label: 'Financial Data',
      icon: DollarSign,
      score: breakdown.financial_data.score,
      detail: [
        breakdown.financial_data.has_revenue && 'Revenue',
        breakdown.financial_data.has_margins && 'Margins',
        breakdown.financial_data.has_growth && 'Growth',
      ].filter(Boolean).join(', ') || 'Limited data',
      subtext: `${((breakdown.financial_data.score) * 100).toFixed(0)}% coverage`,
    },
    {
      label: 'Hypothesis Evidence',
      icon: FileText,
      score: breakdown.hypothesis_evidence.score,
      detail: `${breakdown.hypothesis_evidence.average_links_per_hypothesis.toFixed(1)} avg links/hypothesis`,
      subtext: `${breakdown.hypothesis_evidence.hypotheses_with_strong_evidence} with strong evidence`,
    },
  ];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-slate-900 flex items-center">
          <TrendingUp className="w-5 h-5 mr-2 text-brand-600" />
          Confidence Breakdown
        </h3>
        <div className="text-right">
          <div className={`text-3xl font-bold ${getOverallColor(breakdown.overall)}`}>
            {(breakdown.overall * 100).toFixed(0)}%
          </div>
          <div className="text-xs text-slate-500">Overall Score</div>
        </div>
      </div>

      <div className="space-y-4">
        {metrics.map((metric, idx) => {
          const Icon = metric.icon;
          return (
            <div key={idx} className="space-y-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon className="w-4 h-4 text-slate-400" />
                  <span className="text-sm font-medium text-slate-700">{metric.label}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {(metric.score * 100).toFixed(0)}%
                </span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getScoreColor(metric.score)}`}
                  style={{ width: `${Math.min(metric.score * 100, 100)}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{metric.detail}</span>
                <span>{metric.subtext}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-6 pt-4 border-t border-slate-100">
        <div className="flex items-center justify-center gap-6 text-xs text-slate-500">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Good (70%+)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-yellow-500" />
            <span>Moderate (40-70%)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Low (&lt;40%)</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfidenceBreakdownPanel;
