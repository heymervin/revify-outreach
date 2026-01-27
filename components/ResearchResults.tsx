import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Lightbulb, TrendingUp, Target, ExternalLink, Code, ChevronDown, ChevronUp } from 'lucide-react';
import SentimentChart from './SentimentChart';
import { Link } from 'react-router-dom';
import {
  CompanyProfileCard,
  RecentSignalsSection,
  PainPointHypothesesSection,
  PersonaAnglesSection,
  OutreachPriorityCard,
  ResearchConfidenceIndicator,
} from './research';

const ResearchResults: React.FC = () => {
  const { currentSessionId, getSessionById } = useApp();
  const session = currentSessionId ? getSessionById(currentSessionId) : null;
  const [showRawJson, setShowRawJson] = useState(false);

  if (!session) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-dashed border-slate-300">
        <div className="mx-auto w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
          <SearchIcon className="w-8 h-8 text-slate-300" />
        </div>
        <h3 className="text-lg font-medium text-slate-900">No Active Research</h3>
        <p className="text-slate-500 max-w-sm mx-auto mt-2">Start a new research session above to see AI-generated insights here.</p>
      </div>
    );
  }

  // Rich format display
  if (session.format === 'rich' && session.richData) {
    const { richData } = session;

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Row 1: Company Profile + Confidence */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <CompanyProfileCard profile={richData.company_profile} />
          </div>
          <div className="lg:col-span-1">
            <ResearchConfidenceIndicator confidence={richData.research_confidence} />
          </div>
        </div>

        {/* Row 2: Recent Signals + Outreach Priority */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <RecentSignalsSection signals={richData.recent_signals} />
          </div>
          <div className="lg:col-span-1">
            <OutreachPriorityCard priority={richData.outreach_priority} />
          </div>
        </div>

        {/* Row 3: Pain Point Hypotheses */}
        <PainPointHypothesesSection hypotheses={richData.pain_point_hypotheses} />

        {/* Row 4: Persona Angles */}
        <PersonaAnglesSection
          angles={richData.persona_angles}
          recommendedPersonas={richData.outreach_priority.recommended_personas}
        />

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
            {showRawJson ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
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
  }

  // Legacy format display
  const sentimentScore = session.sentimentScore || 0;
  const hypotheses = session.hypotheses || [];
  const keyTrends = session.keyTrends || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Main Brief */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-slate-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-slate-900 flex items-center">
              <Target className="w-5 h-5 text-brand-600 mr-2" />
              Executive Brief: {session.companyName}
            </h3>
            <span className="bg-brand-50 text-brand-700 text-xs px-2 py-1 rounded-full font-medium border border-brand-100">
              {session.industry}
            </span>
          </div>
          <p className="text-slate-600 leading-relaxed text-sm">
            {session.brief}
          </p>

          <div className="mt-6 pt-6 border-t border-slate-100">
            <h4 className="text-sm font-semibold text-slate-800 mb-3 flex items-center">
              <Lightbulb className="w-4 h-4 text-amber-500 mr-2" />
              Strategic Hypotheses
            </h4>
            <ul className="space-y-3">
              {hypotheses.map((hyp, idx) => (
                <li key={idx} className="flex items-start text-sm text-slate-600">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center text-xs font-bold mr-3 mt-0.5 border border-amber-100">
                    {idx + 1}
                  </span>
                  {hyp}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Sidebar Stats */}
        <div className="space-y-6">
          {/* Sentiment Score */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-4">Market Sentiment</h4>
            <div className="flex items-center justify-center relative mb-4">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  className="text-slate-100"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="12"
                  fill="transparent"
                  strokeDasharray={351.86}
                  strokeDashoffset={351.86 - (351.86 * sentimentScore) / 100}
                  className={`${sentimentScore > 70 ? 'text-green-500' : sentimentScore > 40 ? 'text-yellow-500' : 'text-red-500'} transition-all duration-1000 ease-out`}
                />
              </svg>
              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-center">
                <span className="text-3xl font-bold text-slate-900">{sentimentScore}</span>
                <span className="block text-[10px] text-slate-400 font-medium">SCORE</span>
              </div>
            </div>
            <p className="text-xs text-center text-slate-500">
              Based on recent market news and industry outlook.
            </p>
          </div>

          {/* Trends Chart */}
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
            <h4 className="text-sm font-semibold text-slate-700 mb-2 flex items-center">
              <TrendingUp className="w-4 h-4 mr-2 text-brand-600" />
              Key Trends
            </h4>
            <SentimentChart data={keyTrends} />
          </div>

          <Link
            to="/email"
            className="block w-full text-center bg-slate-900 text-white py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
          >
            Draft Outreach Email
          </Link>
        </div>
      </div>
    </div>
  );
};

// Helper for empty state
function SearchIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
      <svg
        {...props}
        xmlns="http://www.w3.org/2000/svg"
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    );
  }

export default ResearchResults;