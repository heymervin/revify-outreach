'use client';

import { useState } from 'react';
import { Plus, Search, Zap, Microscope } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { type ResearchType } from '@/lib/queue/queueService';

interface QuickAddProps {
  onAdd: (domain: string, researchType: ResearchType) => void;
  onResearchNow?: (domain: string, researchType: ResearchType) => void;
  loading?: boolean;
}

const researchTypeOptions: {
  id: ResearchType;
  label: string;
  icon: typeof Search;
  credits: number;
}[] = [
  { id: 'quick', label: 'Quick', icon: Zap, credits: 1 },
  { id: 'standard', label: 'Standard', icon: Search, credits: 2 },
  { id: 'deep', label: 'Deep', icon: Microscope, credits: 5 },
];

export function QuickAdd({ onAdd, onResearchNow, loading = false }: QuickAddProps) {
  const [domain, setDomain] = useState('');
  const [researchType, setResearchType] = useState<ResearchType>('standard');

  const handleAdd = () => {
    if (!domain.trim()) return;
    onAdd(domain.trim(), researchType);
    setDomain('');
  };

  const handleResearchNow = () => {
    if (!domain.trim() || !onResearchNow) return;
    onResearchNow(domain.trim(), researchType);
    setDomain('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && domain.trim()) {
      handleAdd();
    }
  };

  return (
    <Card padding="md">
      <h3 className="font-semibold text-slate-900 mb-4">Quick Add</h3>

      <div className="space-y-4">
        {/* Domain input */}
        <Input
          label="Company Domain"
          placeholder="e.g., company.com"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          onKeyDown={handleKeyDown}
          leftIcon={<Search className="w-4 h-4" />}
        />

        {/* Research type selector */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-2">
            Research Type
          </label>
          <div className="grid grid-cols-3 gap-2">
            {researchTypeOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = researchType === option.id;

              return (
                <button
                  key={option.id}
                  onClick={() => setResearchType(option.id)}
                  className={`p-3 rounded-xl border-2 transition-all text-center ${
                    isSelected
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <Icon
                    className={`w-5 h-5 mx-auto mb-1 ${
                      isSelected ? 'text-teal-600' : 'text-slate-400'
                    }`}
                  />
                  <span
                    className={`block text-sm font-medium ${
                      isSelected ? 'text-teal-700' : 'text-slate-600'
                    }`}
                  >
                    {option.label}
                  </span>
                  <span className="block text-xs text-slate-400">
                    {option.credits} credit{option.credits > 1 ? 's' : ''}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            variant="secondary"
            onClick={handleAdd}
            disabled={!domain.trim() || loading}
            leftIcon={<Plus className="w-4 h-4" />}
            className="flex-1"
          >
            Add to Queue
          </Button>
          {onResearchNow && (
            <Button
              variant="primary"
              onClick={handleResearchNow}
              disabled={!domain.trim() || loading}
              loading={loading}
              leftIcon={<Search className="w-4 h-4" />}
              className="flex-1"
            >
              Research Now
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}

export default QuickAdd;
