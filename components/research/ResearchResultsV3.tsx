import React, { useState } from 'react';
import {
  Building2, Radio, Lightbulb, Users, ExternalLink, AlertTriangle,
  ChevronDown, ChevronUp, CheckCircle, Clock, FileText, HelpCircle, Target, Code
} from 'lucide-react';
import {
  ResearchOutputV3,
  PERSONA_DISPLAY_NAMES_V3,
  SIGNAL_TYPE_CONFIG,
  RecentSignalV3
} from '../../types/researchTypesV3';

interface Props {
  output: ResearchOutputV3;
}

const ResearchResultsV3: React.FC<Props> = ({ output }) => {
  const [activePersona, setActivePersona] = useState<string>('cfo_finance');
  const [showSources, setShowSources] = useState(false);
  const [showValidationLog, setShowValidationLog] = useState(false);
  const [showRawJson, setShowRawJson] = useState(false);

  const personaKeys = Object.keys(output.persona_angles);
  const recommendedPersonas = output.outreach_priority.recommended_personas;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Company Profile */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-slate-900">
                {output.company_profile.confirmed_name}
              </h3>
              <p className="text-slate-500">
                {output.company_profile.industry}
                {output.company_profile.sub_segment && ` • ${output.company_profile.sub_segment}`}
              </p>
            </div>
          </div>

          {/* Validation Stats Badge */}
          <div className="text-right">
            <div className="inline-flex items-center px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200">
              <CheckCircle className="w-4 h-4 text-emerald-600 mr-2" />
              <span className="text-sm font-medium text-emerald-700">
                {output.metadata.sources_validated} verified sources
              </span>
            </div>
            {output.metadata.sources_rejected > 0 && (
              <p className="text-xs text-slate-400 mt-1">
                {output.metadata.sources_rejected} rejected
              </p>
            )}
          </div>
        </div>

        {/* Profile Details */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-100">
          <ProfileField label="Revenue" value={output.company_profile.estimated_revenue} />
          <ProfileField label="Employees" value={output.company_profile.employee_count} />
          <ProfileField label="Business Model" value={output.company_profile.business_model} />
          <ProfileField label="Headquarters" value={output.company_profile.headquarters} />
        </div>
      </div>

      {/* Hypothesis */}
      <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
        <div className="flex items-start space-x-3">
          <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Lightbulb className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h4 className="font-semibold text-amber-900 mb-2">Hypothesis</h4>
            <p className="text-amber-800">{output.hypothesis}</p>
          </div>
        </div>
      </div>

      {/* Recent Signals */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
          <Radio className="w-5 h-5 text-emerald-600 mr-2" />
          Recent Signals ({output.recent_signals.length})
        </h4>

        {output.recent_signals.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <AlertTriangle className="w-8 h-8 mx-auto mb-2 text-amber-400" />
            <p>No verified signals found for this company.</p>
            <p className="text-sm">Check the research gaps below for next steps.</p>
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
          <Users className="w-5 h-5 text-emerald-600 mr-2" />
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
                    ? 'bg-emerald-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {PERSONA_DISPLAY_NAMES_V3[key]}
                {isRecommended && (
                  <span className={`ml-1.5 w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-emerald-500'}`} />
                )}
              </button>
            );
          })}
        </div>

        {/* Active Persona Content */}
        <div className="bg-slate-50 rounded-lg p-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Hook</label>
            <p className="text-slate-800 mt-1">{output.persona_angles[activePersona as keyof typeof output.persona_angles].hook}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Supporting Point</label>
            <p className="text-slate-800 mt-1">{output.persona_angles[activePersona as keyof typeof output.persona_angles].supporting_point}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center">
              <HelpCircle className="w-3 h-3 mr-1" />
              Question to Pose
            </label>
            <p className="text-slate-800 mt-1 italic">"{output.persona_angles[activePersona as keyof typeof output.persona_angles].question}"</p>
          </div>
        </div>
      </div>

      {/* Outreach Priority */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
        <h4 className="font-semibold text-slate-900 mb-4 flex items-center">
          <Target className="w-5 h-5 text-emerald-600 mr-2" />
          Outreach Priority
        </h4>

        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recommended Personas</label>
            <div className="flex flex-wrap gap-1 mt-2">
              {recommendedPersonas.length > 0 ? (
                recommendedPersonas.map((p, i) => (
                  <span key={i} className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded text-sm">
                    {i + 1}. {PERSONA_DISPLAY_NAMES_V3[p] || p}
                  </span>
                ))
              ) : (
                <span className="text-slate-400 text-sm">Insufficient data to recommend</span>
              )}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Timing</label>
            <p className="text-slate-700 mt-2 text-sm">{output.outreach_priority.timing_notes}</p>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1 text-amber-500" />
              Cautions
            </label>
            <p className="text-slate-700 mt-2 text-sm">{output.outreach_priority.cautions}</p>
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <button
          onClick={() => setShowSources(!showSources)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors"
        >
          <span className="font-medium text-slate-700 flex items-center">
            <FileText className="w-4 h-4 mr-2" />
            Verified Sources ({output.sources.length})
          </span>
          {showSources ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showSources && (
          <div className="border-t border-slate-200 p-4 space-y-2 max-h-64 overflow-y-auto">
            {output.sources.map((source, idx) => (
              <div key={idx} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                  <span className="text-slate-600 truncate max-w-md">{source.title}</span>
                </div>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-600 hover:underline flex items-center flex-shrink-0"
                >
                  {source.domain}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Metadata */}
      <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <MetadataItem label="Queries" value={output.metadata.queries_executed.toString()} />
          <MetadataItem label="Sources Found" value={output.metadata.sources_found.toString()} />
          <MetadataItem label="Validated" value={output.metadata.sources_validated.toString()} />
          <MetadataItem label="Website Scraped" value={output.metadata.website_scraped ? 'Yes' : 'No'} />
          <MetadataItem label="Time" value={`${(output.metadata.execution_time_ms / 1000).toFixed(1)}s`} />
          <MetadataItem label="Est. Cost" value={`$${output.metadata.estimated_cost.toFixed(3)}`} />
        </div>

        {output.metadata.validation_log && (
          <button
            onClick={() => setShowValidationLog(!showValidationLog)}
            className="mt-3 text-xs text-slate-500 hover:text-slate-700"
          >
            {showValidationLog ? 'Hide' : 'Show'} validation log
          </button>
        )}

        {showValidationLog && output.metadata.validation_log && (
          <pre className="mt-2 p-2 bg-slate-100 rounded text-xs text-slate-600 max-h-48 overflow-auto">
            {output.metadata.validation_log.join('\n')}
          </pre>
        )}
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
      <div className="flex justify-end">
        <button className="inline-flex items-center bg-slate-900 text-white px-6 py-3 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors">
          Draft Outreach Email
          <ExternalLink className="w-4 h-4 ml-2" />
        </button>
      </div>
    </div>
  );
};

// Sub-components

const ProfileField: React.FC<{ label: string; value?: string }> = ({ label, value }) => (
  <div>
    <span className="text-xs text-slate-500 block">{label}</span>
    <span className={`text-sm font-medium ${value && !value.includes('Not found') ? 'text-slate-800' : 'text-slate-400'}`}>
      {value || 'Not found'}
    </span>
  </div>
);

const SignalCard: React.FC<{ signal: RecentSignalV3 }> = ({ signal }) => {
  const config = SIGNAL_TYPE_CONFIG[signal.type] || { label: signal.type, color: 'slate' };

  // Map color names to Tailwind classes
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
    cyan: 'bg-cyan-100 text-cyan-700',
    slate: 'bg-slate-100 text-slate-700'
  };

  const badgeClass = colorClasses[config.color] || colorClasses.slate;

  return (
    <div className="border-l-2 border-emerald-200 pl-4 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs px-2 py-0.5 rounded ${badgeClass}`}>
          {config.label}
        </span>
        <span className="text-xs text-slate-400 flex items-center">
          <Clock className="w-3 h-3 mr-1" />
          {signal.date}
        </span>
      </div>
      <p className="text-sm text-slate-800 font-medium">{signal.signal}</p>
      <div className="flex items-center justify-between mt-2">
        <p className="text-xs text-slate-500">{signal.relevance}</p>
        <a
          href={signal.source_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-emerald-600 hover:underline flex items-center"
        >
          {signal.source_name}
          <ExternalLink className="w-3 h-3 ml-1" />
        </a>
      </div>
    </div>
  );
};

const MetadataItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div>
    <span className="text-slate-400 block text-xs">{label}</span>
    <span className="text-slate-700 font-medium">{value}</span>
  </div>
);

export default ResearchResultsV3;
