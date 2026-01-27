import React, { useState } from 'react';
import { PersonaAngles, PersonaAngle, PERSONA_DISPLAY_NAMES, RICH_PERSONA_KEYS, RichPersonaKey } from '../../types';
import { Users, MessageSquare, HelpCircle, Sparkles } from 'lucide-react';

interface Props {
  angles: PersonaAngles;
  recommendedPersonas?: string[];
}

const PersonaAnglesSection: React.FC<Props> = ({ angles, recommendedPersonas = [] }) => {
  const safeAngles = angles || {} as PersonaAngles;
  const [activeTab, setActiveTab] = useState<RichPersonaKey>(
    (recommendedPersonas[0] as RichPersonaKey) || RICH_PERSONA_KEYS[0]
  );

  const activeAngle: PersonaAngle | undefined = safeAngles[activeTab];
  const defaultAngle: PersonaAngle = { primary_hook: 'Not available', supporting_point: 'Not available', question_to_pose: 'Not available' };
  const displayAngle = activeAngle || defaultAngle;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="border-b border-slate-200">
        <div className="flex overflow-x-auto">
          {RICH_PERSONA_KEYS.map((key) => {
            const isRecommended = recommendedPersonas.includes(key);
            return (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`px-4 py-3 text-xs font-medium whitespace-nowrap border-b-2 transition-colors flex items-center ${
                  activeTab === key
                    ? 'border-brand-600 text-brand-600 bg-brand-50'
                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                }`}
              >
                {PERSONA_DISPLAY_NAMES[key]}
                {isRecommended && (
                  <span className="ml-1.5 w-2 h-2 bg-green-500 rounded-full" title="Recommended" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="p-6">
        <div className="flex items-center mb-4">
          <Users className="w-5 h-5 text-brand-600 mr-2" />
          <h4 className="text-sm font-semibold text-slate-900">
            {PERSONA_DISPLAY_NAMES[activeTab]}
          </h4>
          {recommendedPersonas.includes(activeTab) && (
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-50 text-green-700 border border-green-200">
              <Sparkles className="w-3 h-3 mr-1" />
              Recommended
            </span>
          )}
        </div>

        <div className="space-y-4">
          <div className="bg-brand-50 rounded-lg p-4 border border-brand-100">
            <div className="flex items-start space-x-3">
              <MessageSquare className="w-5 h-5 text-brand-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-brand-700 uppercase tracking-wide">Primary Hook</span>
                <p className="text-sm text-slate-700 mt-1">{displayAngle.primary_hook}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-50 rounded-lg p-4 border border-slate-100">
            <div className="flex items-start space-x-3">
              <MessageSquare className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Supporting Point</span>
                <p className="text-sm text-slate-700 mt-1">{displayAngle.supporting_point}</p>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 rounded-lg p-4 border border-amber-100">
            <div className="flex items-start space-x-3">
              <HelpCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Question to Pose</span>
                <p className="text-sm text-slate-700 mt-1 italic">"{displayAngle.question_to_pose}"</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonaAnglesSection;
