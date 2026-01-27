import React from 'react';
import { TrendingUp, Users, Target, Cpu, LucideIcon, Layers } from 'lucide-react';
import type { ResearchAngleId } from '../../types/researchV2Types';
import { RESEARCH_ANGLES_LIST } from '../../data/researchAngles';

// Extended type to include 'all' option
export type AngleSelection = ResearchAngleId | 'all';

interface AngleSelectorProps {
  selected: AngleSelection;
  onSelect: (angle: AngleSelection) => void;
  disabled?: boolean;
}

// Map icon names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  TrendingUp,
  Users,
  Target,
  Cpu,
};

const AngleSelector: React.FC<AngleSelectorProps> = ({ selected, onSelect, disabled = false }) => {
  const isAllSelected = selected === 'all';

  return (
    <div className="space-y-3">
      {/* All Angles Option */}
      <button
        type="button"
        onClick={() => !disabled && onSelect('all')}
        disabled={disabled}
        className={`
          w-full flex items-center justify-center gap-3 p-4 rounded-lg border-2 transition-all
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          ${isAllSelected
            ? 'border-purple-500 bg-purple-50 text-purple-700'
            : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}
        `}
      >
        <Layers className={`w-6 h-6 ${isAllSelected ? 'text-purple-600' : 'text-slate-400'}`} />
        <div className="text-left">
          <span className="text-sm font-medium">All Angles (Comprehensive)</span>
          <span className="block text-xs text-slate-500">
            Research across all 4 service lines for complete coverage
          </span>
        </div>
      </button>

      {/* Individual Angles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {RESEARCH_ANGLES_LIST.map((angle) => {
          const Icon = ICON_MAP[angle.icon] || Target;
          const isSelected = selected === angle.id;

          return (
            <button
              key={angle.id}
              type="button"
              onClick={() => !disabled && onSelect(angle.id)}
              disabled={disabled}
              className={`
                flex flex-col items-center p-4 rounded-lg border-2 transition-all
                ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                ${isSelected
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'}
              `}
            >
              <Icon
                className={`w-6 h-6 mb-2 ${isSelected ? 'text-brand-600' : 'text-slate-400'}`}
              />
              <span className="text-sm font-medium text-center">{angle.name}</span>
              <span className="text-xs text-slate-500 mt-1 text-center line-clamp-2">
                {angle.description}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default AngleSelector;
