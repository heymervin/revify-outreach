import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Radio, Lightbulb, Users, ExternalLink, AlertTriangle,
  ChevronDown, ChevronUp, CheckCircle, Clock, FileText, HelpCircle,
  Target, Code, Zap, Star, DollarSign, Save, Loader2, Database
} from 'lucide-react';
import {
  ResearchOutputV3_1,
  PERSONA_DISPLAY_NAMES_V3_1,
  SIGNAL_TYPE_CONFIG_V3_1,
  INTENT_FIT_COLORS,
  RecentSignalV3_1,
  IntentSignalV3_1
} from '../../types/researchTypesV3_1';
import { useApp } from '../../context/AppContext';
import { useSettings } from '../../context/SettingsContext';
import { GHLService } from '../../services/ghlService';

interface Props {
  output: ResearchOutputV3_1;
}

const ResearchResultsV3_1: React.FC<Props> = ({ output }) => {
  const { currentSessionId, getSessionById } = useApp();
  const { apiKeys, ghl } = useSettings();
  const session = currentSessionId ? getSessionById(currentSessionId) : null;

  const [activePersona, setActivePersona] = useState<string>('cfo_finance');
  const [showSources, setShowSources] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);
  const [savingToGHL, setSavingToGHL] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canSaveToGHL = session?.ghlRecordId && apiKeys?.ghl && ghl?.locationId;

  const handleSaveToGHL = async () => {
    if (!session?.ghlRecordId || !apiKeys?.ghl || !ghl?.locationId) return;

    setSavingToGHL(true);
    setSaveSuccess(null);
    setSaveError(null);

    try {
      const ghlService = new GHLService(apiKeys.ghl, ghl.locationId);
      await ghlService.updateBusinessResearch(session.ghlRecordId, JSON.stringify(output));
      setSaveSuccess(true);
      console.log('Research saved to GHL successfully');
    } catch (err) {
      console.error('Failed to save research to GHL:', err);
      setSaveError(err instanceof Error ? err.message : 'Failed to save to GHL');
      setSaveSuccess(false);
    } finally {
      setSavingToGHL(false);
    }
  };

  const personaKeys = Object.keys(output.persona_angles);
  const recommendedPersonas = output.outreach_priority.recommended_personas;
  const hasIntentSignals = output.intent_signals && output.intent_signals.length > 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Intent Signals Banner - Most Important! */}
      {hasIntentSignals && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center flex-shrink-0">
              <Target className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-2 flex items-center">
                Intent Signals Detected!
                <span className="ml-2 px-2 py-0.5 bg-white/20 rounded text-sm font-medium">
                  {output.intent_signals.length} found
                </span>
              </h3>
              <div className="space-y-3">
                {output.intent_signals.map((signal, idx) => (
                  <IntentSignalCard key={idx} signal={signal} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Company Profile */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {output.company_profile.confirmed_name}
              </h3>
              <p className="text-slate-500">
                {output.company_profile.industry}
                {output.company_profile.sub_segment && ` • ${output.company_profile.sub_segment}`}
              </p>
              {output.company_profile.parent_company && (
                <p className="text-sm text-slate-400 mt-1">
                  Parent: {output.company_profile.parent_company}
                </p>
              )}
            </div>
          </div>

          {/* Ownership Badge */}
          <div className="text-right">
            <span className={`inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-medium ${
              output.company_profile.ownership_type === 'Public'
                ? 'bg-green-100 text-green-700'
                : output.company_profile.ownership_type === 'PE-Backed'
                ? 'bg-purple-100 text-purple-700'
                : output.company_profile.ownership_type === 'Subsidiary'
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-100 text-slate-700'
            }`}>
              {output.company_profile.ownership_type}
            </span>
          </div>
        </div>

        {/* Profile Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <ProfileField
            label="Revenue"
            value={output.company_profile.revenue}
            source={output.company_profile.revenue_source}
            icon={<DollarSign className="w-4 h-4" />}
          />
          <ProfileField
            label="Employees"
            value={output.company_profile.employee_count}
            source={output.company_profile.employee_source}
            icon={<Users className="w-4 h-4" />}
          />
          <ProfileField
            label="Headquarters"
            value={output.company_profile.headquarters}
          />
          <ProfileField
            label="Founded"
            value={output.company_profile.founded_year}
          />
        </div>

        {/* Investors */}
        {output.company_profile.investors && output.company_profile.investors.length > 0 && (
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500 block mb-2">Investors</span>
            <div className="flex flex-wrap gap-2">
              {output.company_profile.investors.map((inv, i) => (
                <span key={i} className="px-2 py-1 bg-slate-100 text-slate-700 rounded text-sm">
                  {inv}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Hypothesis */}
      <div className={`rounded-xl border p-6 ${
        output.hypothesis.confidence === 'high'
          ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-200'
          : output.hypothesis.confidence === 'medium'
          ? 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200'
          : 'bg-gradient-to-br from-slate-50 to-gray-50 border-slate-200'
      }`}>
        <div className="flex items-start space-x-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            output.hypothesis.confidence === 'high'
              ? 'bg-green-100'
              : output.hypothesis.confidence === 'medium'
              ? 'bg-amber-100'
              : 'bg-slate-100'
          }`}>
            <Lightbulb className={`w-5 h-5 ${
              output.hypothesis.confidence === 'high'
                ? 'text-green-600'
                : output.hypothesis.confidence === 'medium'
                ? 'text-amber-600'
                : 'text-slate-600'
            }`} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h4 className={`font-semibold ${
                output.hypothesis.confidence === 'high'
                  ? 'text-green-900'
                  : output.hypothesis.confidence === 'medium'
                  ? 'text-amber-900'
                  : 'text-slate-900'
              }`}>Hypothesis</h4>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                output.hypothesis.confidence === 'high'
                  ? 'bg-green-200 text-green-800'
                  : output.hypothesis.confidence === 'medium'
                  ? 'bg-amber-200 text-amber-800'
                  : 'bg-slate-200 text-slate-800'
              }`}>
                {output.hypothesis.confidence} confidence
              </span>
            </div>
            <p className={`${
              output.hypothesis.confidence === 'high'
                ? 'text-green-800'
                : output.hypothesis.confidence === 'medium'
                ? 'text-amber-800'
                : 'text-slate-800'
            }`}>{output.hypothesis.primary_hypothesis}</p>
            {output.hypothesis.supporting_evidence.length > 0 && (
              <ul className="mt-3 space-y-1">
                {output.hypothesis.supporting_evidence.map((ev, i) => (
                  <li key={i} className="flex items-start text-sm text-slate-600">
                    <CheckCircle className="w-4 h-4 mr-2 mt-0.5 text-green-500 flex-shrink-0" />
                    {ev}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Recent Signals */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
          <Radio className="w-5 h-5 text-blue-600 mr-2" />
          Recent Signals ({output.recent_signals.length})
        </h4>

        {output.recent_signals.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <p>No recent signals found.</p>
            <p className="text-sm">Check research gaps below for more context.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {output.recent_signals.map((signal, idx) => (
              <SignalCard key={idx} signal={signal} />
            ))}
          </div>
        )}
      </div>

      {/* Persona Angles */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
          <Users className="w-5 h-5 text-blue-600 mr-2" />
          Persona Angles
        </h4>

        {/* Persona Tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {personaKeys.map((key) => {
            const isRecommended = recommendedPersonas.includes(key);
            const isActive = activePersona === key;
            return (
              <button
                key={key}
                onClick={() => setActivePersona(key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {isRecommended && (
                  <Star className={`w-3 h-3 mr-1.5 ${isActive ? 'text-yellow-300' : 'text-yellow-500'}`} />
                )}
                {PERSONA_DISPLAY_NAMES_V3_1[key]}
              </button>
            );
          })}
        </div>

        {/* Active Persona Content */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hook</label>
            <p className="text-slate-800 mt-1">
              {output.persona_angles[activePersona as keyof typeof output.persona_angles]?.hook}
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Supporting Point</label>
            <p className="text-slate-800 mt-1">
              {output.persona_angles[activePersona as keyof typeof output.persona_angles]?.supporting_point}
            </p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center">
              <HelpCircle className="w-3 h-3 mr-1" />
              Question to Pose
            </label>
            <p className="text-slate-800 mt-1 italic">
              "{output.persona_angles[activePersona as keyof typeof output.persona_angles]?.question}"
            </p>
          </div>
        </div>
      </div>

      {/* Outreach Priority */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
          <Zap className="w-5 h-5 text-blue-600 mr-2" />
          Outreach Priority
        </h4>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
              Recommended Personas
            </label>
            <div className="flex flex-wrap gap-1 mt-2">
              {recommendedPersonas.length > 0 ? (
                recommendedPersonas.map((p, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm flex items-center">
                    <Star className="w-3 h-3 mr-1 text-yellow-500" />
                    {i + 1}. {PERSONA_DISPLAY_NAMES_V3_1[p] || p}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-sm">Insufficient data to recommend</span>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center">
              Urgency
              <span className={`ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                output.outreach_priority.urgency === 'high'
                  ? 'bg-red-100 text-red-700'
                  : output.outreach_priority.urgency === 'medium'
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {output.outreach_priority.urgency}
              </span>
            </label>
            <p className="text-slate-700 mt-2 text-sm">{output.outreach_priority.urgency_reason}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" />
              Cautions
            </label>
            {output.outreach_priority.cautions.length > 0 ? (
              <ul className="mt-2 space-y-1">
                {output.outreach_priority.cautions.map((c, i) => (
                  <li key={i} className="text-slate-700 text-sm flex items-start">
                    <span className="w-1 h-1 bg-amber-500 rounded-full mt-2 mr-2 flex-shrink-0" />
                    {c}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-400 text-sm mt-2">No specific cautions</p>
            )}
          </div>
        </div>
      </div>

      {/* Research Gaps */}
      {output.research_gaps.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
          <h4 className="font-semibold text-amber-900 mb-3 flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
            Research Gaps
          </h4>
          <ul className="space-y-2">
            {output.research_gaps.map((gap, idx) => (
              <li key={idx} className="flex items-start text-amber-800 text-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 mr-2 flex-shrink-0" />
                {gap}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Sources */}
      {output.company_profile.citations.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <button
            onClick={() => setShowSources(!showSources)}
            className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
          >
            <span className="font-medium text-slate-700 flex items-center">
              <FileText className="w-4 h-4 mr-2" />
              Sources ({output.company_profile.citations.length})
            </span>
            {showSources ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showSources && (
            <div className="border-t border-slate-200 p-4 space-y-2 max-h-64 overflow-y-auto">
              {output.company_profile.citations.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-sm text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-3 h-3 mr-2 flex-shrink-0" />
                  <span className="truncate">{url}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Metadata */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <MetadataItem label="Searches" value={output.metadata.searches_performed.toString()} />
          <MetadataItem label="Sources" value={output.metadata.sources_cited.toString()} />
          <MetadataItem label="Search Model" value={output.metadata.models_used.search} />
          <MetadataItem label="Synthesis Model" value={output.metadata.models_used.synthesis} />
          <MetadataItem label="Time" value={`${(output.metadata.execution_time_ms / 1000).toFixed(1)}s`} />
          <MetadataItem label="Est. Cost" value={`$${output.metadata.estimated_cost.toFixed(3)}`} />
        </div>
      </div>

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
              {JSON.stringify(output, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="flex items-center justify-end gap-3">
        {/* Save to GHL Button */}
        {canSaveToGHL && (
          <div className="flex items-center gap-2">
            {saveSuccess === true && (
              <span className="text-sm text-green-600 flex items-center">
                <CheckCircle className="w-4 h-4 mr-1" />
                Saved to GHL
              </span>
            )}
            {saveSuccess === false && saveError && (
              <span className="text-sm text-red-600 flex items-center" title={saveError}>
                <AlertTriangle className="w-4 h-4 mr-1" />
                Failed
              </span>
            )}
            <button
              onClick={handleSaveToGHL}
              disabled={savingToGHL}
              className="inline-flex items-center bg-purple-600 text-white px-4 py-3 rounded-lg text-sm font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {savingToGHL ? (
                <>
                  <Loader2 className="animate-spin w-4 h-4 mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Database className="w-4 h-4 mr-2" />
                  Save to GHL
                </>
              )}
            </button>
          </div>
        )}
        <Link
          to="/email"
          className="inline-flex items-center bg-slate-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors"
        >
          Draft Outreach Email
          <ExternalLink className="w-4 h-4 ml-2" />
        </Link>
      </div>
    </div>
  );
};

// Sub-components

const ProfileField: React.FC<{
  label: string;
  value?: string;
  source?: string;
  icon?: React.ReactNode;
}> = ({ label, value, source, icon }) => (
  <div>
    <span className="text-xs text-slate-500 block flex items-center">
      {icon && <span className="mr-1">{icon}</span>}
      {label}
    </span>
    <span className={`text-sm font-medium ${
      value && !value.toLowerCase().includes('not found') && !value.toLowerCase().includes('unknown')
        ? 'text-slate-800'
        : 'text-slate-400'
    }`}>
      {value || 'Not found'}
    </span>
    {source && <span className="text-xs text-slate-400 block">{source}</span>}
  </div>
);

const SignalCard: React.FC<{ signal: RecentSignalV3_1 }> = ({ signal }) => {
  const config = SIGNAL_TYPE_CONFIG_V3_1[signal.type] || { label: signal.type, color: 'slate' };

  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
    cyan: 'bg-cyan-100 text-cyan-700',
    red: 'bg-red-100 text-red-700',
    slate: 'bg-slate-100 text-slate-700'
  };

  const badgeClass = colorClasses[config.color] || colorClasses.slate;

  return (
    <div className={`border-l-2 pl-4 py-2 ${
      signal.is_intent_signal ? 'border-red-400 bg-red-50/50' : 'border-blue-200'
    }`}>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded ${badgeClass}`}>
            {config.label}
          </span>
          {signal.is_intent_signal && (
            <span className="text-xs px-2 py-0.5 rounded bg-red-100 text-red-700 flex items-center">
              <Target className="w-3 h-3 mr-1" />
              Intent
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400 flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {signal.date}
        </span>
      </div>
      <p className="text-sm text-slate-800 font-medium">{signal.headline}</p>
      <p className="text-sm text-slate-600 mt-1">{signal.detail}</p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-500">{signal.relevance_to_revology}</p>
        <a
          href={signal.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline flex items-center"
        >
          {signal.source_name}
          <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      </div>
    </div>
  );
};

const IntentSignalCard: React.FC<{ signal: IntentSignalV3_1 }> = ({ signal }) => {
  const fitClass = INTENT_FIT_COLORS[signal.fit_score] || INTENT_FIT_COLORS.moderate;

  return (
    <div className="bg-white/10 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium capitalize">
          {signal.signal_type.replace('_', ' ')}
        </span>
        <span className={`px-2 py-0.5 rounded text-xs font-medium ${fitClass}`}>
          {signal.fit_score} fit
        </span>
      </div>
      <p className="text-sm opacity-90">{signal.description}</p>
      {signal.timeframe && (
        <p className="text-xs opacity-75 mt-1">Timeframe: {signal.timeframe}</p>
      )}
    </div>
  );
};

const MetadataItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <span className="text-slate-400 block text-xs">{label}</span>
    <span className="text-slate-700 font-medium">{value}</span>
  </div>
);

export default ResearchResultsV3_1;
