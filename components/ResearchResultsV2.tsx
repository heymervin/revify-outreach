import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  Code,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
  TrendingUp,
  Users,
  Target,
  Cpu,
  Layers,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  CompanyProfileCard,
  RecentSignalsSection,
  PersonaAnglesSection,
  OutreachPriorityCard,
} from './research';
import EvidenceChainCard from './research/EvidenceChainCard';
import ConfidenceBreakdownPanel from './research/ConfidenceBreakdownPanel';
import ResearchGapsPanel from './research/ResearchGapsPanel';
import type { ResearchAngleId } from '../types/researchV2Types';
import { getResearchAngle } from '../data/researchAngles';

// Icon map for angle display
const ANGLE_ICONS: Record<ResearchAngleId, React.ElementType> = {
  margin_analytics: TrendingUp,
  sales_growth: Users,
  promo_effectiveness: Target,
  analytics_transformation: Cpu,
};

const ResearchResultsV2: React.FC = () => {
  const { currentSessionId, getSessionById } = useApp();
  const session = currentSessionId ? getSessionById(currentSessionId) : null;
  const [showRawJson, setShowRawJson] = useState(false);

  if (!session) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
        <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <Sparkles className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-medium text-slate-900">No Active Research</h3>
        <p className="text-slate-500 max-w-sm mx-auto mt-2">
          Start a V2 research session above to see enhanced insights with evidence chains.
        </p>
      </div>
    );
  }

  // Check if this is a V2 session
  const isV2 = session.format === 'rich_v2' && session.richData;
  const richData = session.richData;

  if (!richData) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
        <h3 className="text-lg font-medium text-slate-900">Invalid Session Data</h3>
        <p className="text-slate-500 max-w-sm mx-auto mt-2">
          This session doesn't contain the expected research data.
        </p>
      </div>
    );
  }

  // Get angle info - undefined means "All Angles" was selected
  const angleId = (richData as any).research_angle as ResearchAngleId | undefined;
  const isAllAngles = angleId === undefined;
  const angleInfo = angleId ? getResearchAngle(angleId) : null;
  const AngleIcon = angleId ? ANGLE_ICONS[angleId] : Layers;

  // V2-specific data
  const matchedPainPoints = (richData as any).matched_pain_points || [];
  const confidenceBreakdown = (richData as any).confidence_breakdown;
  const researchGaps = (richData as any).research_gaps_actionable || [];
  const depth = (richData as any).research_depth;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* V2 Header Badge */}
      {isV2 && (angleInfo || isAllAngles) && (
        <div className={`bg-gradient-to-r ${isAllAngles ? 'from-purple-50 to-indigo-50 border-purple-200' : 'from-brand-50 to-purple-50 border-brand-200'} border rounded-xl p-4`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg ${isAllAngles ? 'bg-purple-100' : 'bg-brand-100'} flex items-center justify-center`}>
                <AngleIcon className={`w-5 h-5 ${isAllAngles ? 'text-purple-600' : 'text-brand-600'}`} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${isAllAngles ? 'text-purple-700' : 'text-brand-700'}`}>
                    V2 Research: {isAllAngles ? 'All Angles (Comprehensive)' : angleInfo?.name}
                  </span>
                  <span className={`px-2 py-0.5 ${isAllAngles ? 'bg-purple-100 text-purple-600' : 'bg-brand-100 text-brand-600'} rounded text-xs font-medium`}>
                    {depth || 'standard'}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {isAllAngles ? 'All 4 service lines' : angleInfo?.service_line}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-700">
                {matchedPainPoints.length} Hypotheses Matched
              </div>
              <div className="text-xs text-slate-500">
                {richData.recent_signals?.length || 0} Signals Found
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Company Profile + Confidence Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <CompanyProfileCard profile={richData.company_profile} />
        </div>
        <div className="lg:col-span-1">
          {confidenceBreakdown ? (
            <ConfidenceBreakdownPanel breakdown={confidenceBreakdown} />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
              <h3 className="text-lg font-bold text-slate-900">Confidence</h3>
              <div className="mt-4 text-center">
                <div className="text-4xl font-bold text-brand-600">
                  {richData.research_confidence?.overall_score?.toFixed(1) || 'N/A'}
                </div>
                <div className="text-sm text-slate-500">/ 5.0</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Row 2: Evidence-Backed Hypotheses (V2 Feature) */}
      {matchedPainPoints.length > 0 && (
        <div>
          <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-brand-600" />
            Evidence-Backed Hypotheses
          </h3>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {matchedPainPoints.map((hypothesis: any, idx: number) => (
              <EvidenceChainCard
                key={hypothesis.pain_point_id || idx}
                hypothesis={hypothesis}
                signals={richData.recent_signals}
                index={idx}
              />
            ))}
          </div>
        </div>
      )}

      {/* Row 3: Recent Signals + Outreach Priority */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RecentSignalsSection signals={richData.recent_signals || []} />
        </div>
        <div className="lg:col-span-1">
          {richData.outreach_priority && (
            <OutreachPriorityCard priority={richData.outreach_priority} />
          )}
        </div>
      </div>

      {/* Row 4: Persona Angles */}
      <PersonaAnglesSection
        angles={richData.persona_angles}
        recommendedPersonas={richData.outreach_priority?.recommended_personas || []}
      />

      {/* Row 5: Research Gaps (V2 Feature) */}
      {researchGaps.length > 0 && (
        <ResearchGapsPanel gaps={researchGaps} companyName={session.companyName} />
      )}

      {/* Raw JSON Toggle */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowRawJson(!showRawJson)}
          className="w-full flex items-center justify-between p-4 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <span className="flex items-center">
            <Code className="w-4 h-4 mr-2" />
            View Raw JSON Response
          </span>
          {showRawJson ? (
            <ChevronUp className="w-4 h-4" />
          ) : (
            <ChevronDown className="w-4 h-4" />
          )}
        </button>
        {showRawJson && (
          <div className="border-t border-slate-200 p-4 bg-slate-50">
            <pre className="text-xs text-slate-700 overflow-x-auto max-h-96 overflow-y-auto">
              {JSON.stringify(session, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex justify-end">
        <Link
          to="/email"
          className="inline-flex items-center bg-slate-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
        >
          Draft Outreach Email
          <ExternalLink className="w-4 h-4 ml-2" />
        </Link>
      </div>
    </div>
  );
};

export default ResearchResultsV2;
