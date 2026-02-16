'use client';

import { Sparkles, Users, AlertTriangle, Clock, Mail } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  type OutreachPriorityV3,
  type PersonaAnglesV3,
  PERSONA_DISPLAY_NAMES_V3,
  URGENCY_COLORS,
} from '@/types/researchTypesV3';

interface OutreachSuggestionProps {
  outreachPriority?: OutreachPriorityV3;
  personaAngles?: PersonaAnglesV3;
  onGenerateEmail?: () => void;
  className?: string;
}

export function OutreachSuggestion({
  outreachPriority,
  personaAngles,
  onGenerateEmail,
  className = '',
}: OutreachSuggestionProps) {
  if (!outreachPriority) {
    return null;
  }

  // Get the primary recommended persona and their angle
  const primaryPersona = outreachPriority.recommended_personas?.[0];
  const primaryAngle = primaryPersona && personaAngles
    ? personaAngles[primaryPersona as keyof PersonaAnglesV3]
    : null;

  return (
    <Card
      padding="md"
      className={`bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-200 ${className}`}
    >
      <div className="flex items-start gap-4">
        <div className="p-3 bg-teal-500 rounded-xl flex-shrink-0">
          <Sparkles className="w-6 h-6 text-white" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <h3 className="text-lg font-bold text-slate-900 font-heading">
              Recommended Outreach
            </h3>
            {outreachPriority.urgency && (
              <span
                className={`px-2 py-0.5 rounded text-xs font-semibold ${
                  URGENCY_COLORS[outreachPriority.urgency]
                }`}
              >
                {outreachPriority.urgency.charAt(0).toUpperCase() +
                  outreachPriority.urgency.slice(1)}{' '}
                Urgency
              </span>
            )}
          </div>

          {/* Recommended Personas */}
          {outreachPriority.recommended_personas &&
            outreachPriority.recommended_personas.length > 0 && (
              <div className="mb-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Users className="w-4 h-4 text-teal-600" />
                  <span className="text-xs font-medium text-teal-700 uppercase tracking-wider">
                    Target Personas
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {outreachPriority.recommended_personas.map((persona, i) => (
                    <Badge
                      key={i}
                      variant={i === 0 ? 'success' : 'neutral'}
                      size="md"
                    >
                      {PERSONA_DISPLAY_NAMES_V3[persona] || persona}
                      {i === 0 && ' (Primary)'}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

          {/* Suggested Opening */}
          {primaryAngle && (
            <div className="bg-white/60 rounded-xl p-4 mb-4 border border-teal-200/50">
              <span className="text-xs font-medium text-teal-600 uppercase tracking-wider">
                Suggested Opening Hook
              </span>
              <p className="text-slate-700 mt-2 italic">
                &ldquo;{primaryAngle.hook}&rdquo;
              </p>
              {primaryAngle.question && (
                <div className="mt-3 pt-3 border-t border-teal-100">
                  <span className="text-xs font-medium text-slate-500">
                    Question to pose:
                  </span>
                  <p className="text-sm text-slate-600 mt-1">
                    {primaryAngle.question}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Timing */}
          {(outreachPriority.timing_notes || outreachPriority.urgency_reason) && (
            <div className="flex items-start gap-2 mb-4">
              <Clock className="w-4 h-4 text-teal-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-teal-700 uppercase tracking-wider">
                  Timing
                </span>
                <p className="text-sm text-slate-600 mt-0.5">
                  {outreachPriority.timing_notes || outreachPriority.urgency_reason}
                </p>
              </div>
            </div>
          )}

          {/* Cautions */}
          {outreachPriority.cautions && (
            <div className="flex items-start gap-2 mb-4">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-medium text-amber-700 uppercase tracking-wider">
                  Cautions
                </span>
                <div className="mt-1">
                  {Array.isArray(outreachPriority.cautions) ? (
                    <ul className="text-sm text-slate-600 space-y-1">
                      {outreachPriority.cautions.map((caution, i) => (
                        <li key={i}>• {caution}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-slate-600">
                      {outreachPriority.cautions}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* CTA */}
          {onGenerateEmail && (
            <Button
              variant="primary"
              size="md"
              onClick={onGenerateEmail}
              leftIcon={<Mail className="w-4 h-4" />}
              className="w-full sm:w-auto"
            >
              Generate Outreach Email
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default OutreachSuggestion;
