import React from 'react';
import { Zap, Clock, Search } from 'lucide-react';
import type { ResearchDepth } from '../../types/researchV2Types';
import { RESEARCH_DEPTH_CONFIGS } from '../../types/researchV2Types';

interface DepthSelectorProps {
  selected: ResearchDepth;
  onSelect: (depth: ResearchDepth) => void;
  disabled?: boolean;
}

const DEPTH_ICONS = {
  quick: Zap,
  standard: Clock,
  deep: Search,
};

const DEPTH_COLORS = {
  quick: 'green',
  standard: 'blue',
  deep: 'purple',
};

const DepthSelector: React.FC<DepthSelectorProps> = ({ selected, onSelect, disabled = false }) => {
  const depths: ResearchDepth[] = ['quick', 'standard', 'deep'];

  return (
    <div className="flex gap-2">
      {depths.map((depth) => {
        const config = RESEARCH_DEPTH_CONFIGS[depth];
        const Icon = DEPTH_ICONS[depth];
        const isSelected = selected === depth;
        const color = DEPTH_COLORS[depth];

        return (
          <button
            key={depth}
            type="button"
            onClick={() => !disabled && onSelect(depth)}
            disabled={disabled}
            className={`
              flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border-2 transition-all
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${isSelected
                ? `border-${color}-500 bg-${color}-50 text-${color}-700`
                : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300'}
              ${isSelected && depth === 'quick' ? 'border-green-500 bg-green-50 text-green-700' : ''}
              ${isSelected && depth === 'standard' ? 'border-blue-500 bg-blue-50 text-blue-700' : ''}
              ${isSelected && depth === 'deep' ? 'border-purple-500 bg-purple-50 text-purple-700' : ''}
            `}
          >
            <Icon className={`w-4 h-4 ${isSelected ? '' : 'text-slate-400'}`} />
            <div className="text-left">
              <div className="text-sm font-medium">{config.name}</div>
              <div className="text-xs text-slate-500">{config.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
};

export default DepthSelector;
