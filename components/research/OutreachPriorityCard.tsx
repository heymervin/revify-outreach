import React from 'react';
import { OutreachPriority, PERSONA_DISPLAY_NAMES } from '../../types';
import { Target, Clock, AlertTriangle } from 'lucide-react';

interface Props {
  priority: OutreachPriority;
}

const OutreachPriorityCard: React.FC<Props> = ({ priority }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
        <Target className="w-5 h-5 text-brand-600 mr-2" />
        Outreach Priority
      </h3>

      <div className="space-y-4">
        <div>
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Recommended Personas</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {(Array.isArray(priority.recommended_personas) ? priority.recommended_personas : []).map((persona, idx) => (
              <span
                key={idx}
                className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200"
              >
                {idx + 1}. {PERSONA_DISPLAY_NAMES[persona] || persona}
              </span>
            ))}
          </div>
        </div>

        {priority.timing_notes && (
          <div className="flex items-start space-x-3">
            <Clock className="w-4 h-4 text-blue-500 mt-1 flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Timing Notes</span>
              <p className="text-sm text-slate-600 mt-1">{priority.timing_notes}</p>
            </div>
          </div>
        )}

        {priority.cautions && (
          <div className="flex items-start space-x-3 bg-amber-50 rounded-lg p-3 border border-amber-100">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wide">Cautions</span>
              <p className="text-sm text-amber-800 mt-1">{priority.cautions}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OutreachPriorityCard;
