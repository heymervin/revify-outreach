'use client';

import {
  Building2,
  Search,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  Zap,
  Target,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useState } from 'react';
import type { GHLCompany, ResearchData } from '../OutreachWizard';

interface ResearchCheckStepProps {
  company: GHLCompany | null;
  hasResearch: boolean;
  researchData: ResearchData | null;
  onResearchNow: () => void;
  onSkip: () => void;
  onContinue: () => void;
  onBack: () => void;
}

export function ResearchCheckStep({
  company,
  hasResearch,
  researchData,
  onResearchNow,
  onSkip,
  onContinue,
  onBack,
}: ResearchCheckStepProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  if (!company) {
    return (
      <div className="card p-8 text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <p className="text-slate-500">No company selected. Please go back and select a company.</p>
        <button
          onClick={onBack}
          className="mt-4 flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900 mx-auto"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
      </div>
    );
  }

  // No research found - show prompt
  if (!hasResearch || !researchData) {
    return (
      <div className="space-y-6">
        <div className="card p-8 text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-amber-600" />
          </div>
          <h3 className="text-xl font-semibold text-slate-900 mb-2">No Research Found</h3>
          <p className="text-slate-500 mb-6 max-w-md mx-auto">
            <span className="font-medium text-slate-700">{company.companyName}</span> hasn't been
            researched yet. Research helps generate more personalized and relevant outreach emails.
          </p>

          {/* Company Summary */}
          <div className="bg-slate-50 rounded-xl p-4 mb-6 max-w-sm mx-auto">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-slate-200 rounded-lg flex items-center justify-center">
                <Building2 className="w-5 h-5 text-slate-500" />
              </div>
              <div className="text-left">
                <p className="font-medium text-slate-900">{company.companyName}</p>
                {company.industry && (
                  <p className="text-xs text-slate-500">{company.industry}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onResearchNow}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors"
            >
              <Search className="w-4 h-4" />
              Research Now
            </button>
            <button
              onClick={onSkip}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors"
            >
              Skip
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-4">
            Skipping research will result in less personalized email content.
          </p>
        </div>

        {/* Back Button */}
        <div className="flex justify-start">
          <button
            onClick={onBack}
            className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-slate-900"
          >
            <ChevronLeft className="w-4 h-4" />
            Back to Company Selection
          </button>
        </div>
      </div>
    );
  }

  // Has research - show preview from GHL data
  const companyProfile = researchData.company_profile;
  const painPoints = researchData.pain_point_hypotheses || [];
  const signals = researchData.recent_signals || [];
  const recommendedPersonas = researchData.outreach_priority?.recommended_personas || [];
  const urgency = researchData.outreach_priority?.urgency;

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-slate-900">Research Available</h3>
            <p className="text-sm text-slate-500">
              We found existing research for {company.companyName}
            </p>
          </div>
        </div>

        {/* Research Info */}
        <div className="bg-emerald-50 rounded-xl p-4 mb-4 border border-emerald-100">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-slate-900">
                {companyProfile?.confirmed_name || company.companyName}
              </p>
              <p className="text-sm text-slate-500">
                {companyProfile?.industry || company.industry}
              </p>
            </div>
            {urgency && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                urgency === 'high'
                  ? 'bg-red-100 text-red-700'
                  : urgency === 'medium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-slate-100 text-slate-600'
              }`}>
                {urgency.charAt(0).toUpperCase() + urgency.slice(1)} Priority
              </span>
            )}
          </div>
          {companyProfile && (
            <div className="flex gap-4 mt-3 text-xs text-slate-600">
              {companyProfile.estimated_revenue && (
                <span>Revenue: {companyProfile.estimated_revenue}</span>
              )}
              {companyProfile.employee_count && (
                <span>Employees: {companyProfile.employee_count}</span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Research Preview Card - Inline version */}
      <div className="card overflow-hidden">
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
                {painPoints.length} pain points, {signals.length} signals
              </p>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-slate-400" />
          ) : (
            <ChevronDown className="w-5 h-5 text-slate-400" />
          )}
        </button>

        {isExpanded && (
          <div className="px-6 pb-6 space-y-5 border-t border-slate-100 pt-5">
            {/* Top Pain Points */}
            {painPoints.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Top Pain Points
                </h4>
                <div className="space-y-2">
                  {painPoints.slice(0, 3).map((pp, idx) => (
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
            {signals.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Zap className="w-3.5 h-3.5" />
                  Recent Signals
                </h4>
                <div className="space-y-2">
                  {signals.slice(0, 3).map((signal, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-100"
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                          {signal.type}
                        </span>
                        {signal.date && (
                          <span className="text-xs text-slate-400">{signal.date}</span>
                        )}
                      </div>
                      <p className="text-sm text-slate-800 line-clamp-2">
                        {signal.headline || signal.description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommended Personas */}
            {recommendedPersonas.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
                  Recommended Personas
                </h4>
                <div className="flex flex-wrap gap-2">
                  {recommendedPersonas.map((persona, idx) => (
                    <span
                      key={idx}
                      className="text-xs font-medium px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700"
                    >
                      {persona}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="flex flex-col sm:flex-row justify-between gap-3">
        <button
          onClick={onBack}
          className="flex items-center justify-center gap-2 px-4 py-3 text-slate-600 hover:text-slate-900 order-2 sm:order-1"
        >
          <ChevronLeft className="w-4 h-4" />
          Back
        </button>
        <div className="flex flex-col sm:flex-row gap-3 order-1 sm:order-2">
          <button
            onClick={onResearchNow}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-slate-100 text-slate-700 rounded-xl font-medium hover:bg-slate-200 transition-colors min-h-[48px]"
          >
            <Search className="w-4 h-4" />
            Re-research
          </button>
          <button
            onClick={onContinue}
            className="flex items-center justify-center gap-2 px-6 py-3 bg-emerald-500 text-white rounded-xl font-medium hover:bg-emerald-600 transition-colors min-h-[48px]"
          >
            Continue
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
