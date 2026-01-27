import React, { useState, useMemo } from 'react';
import { PromptTemplate } from '../../types';
import { interpolateTemplate } from '../../utils/templateEngine';

interface PromptPreviewProps {
  template: PromptTemplate;
}

const SAMPLE_VALUES: Record<string, string> = {
  company: 'Acme Corp',
  industry: 'SaaS',
  website: 'https://acme.example.com',
  persona: 'CEO',
  brief: 'Acme Corp is a leading SaaS provider specializing in enterprise workflow automation. They have recently raised Series B funding and are expanding into the European market.',
  hypotheses: '1. They may need better data analytics tools\n2. Their customer onboarding could be streamlined\n3. Integration capabilities could be enhanced',
};

const PromptPreview: React.FC<PromptPreviewProps> = ({ template }) => {
  const [customValues, setCustomValues] = useState<Record<string, string>>({});

  const previewText = useMemo(() => {
    const values = { ...SAMPLE_VALUES, ...customValues };
    return interpolateTemplate(template.content, values);
  }, [template.content, customValues]);

  return (
    <div className="border-t border-slate-200 p-4 bg-slate-50">
      <h5 className="text-xs font-semibold text-slate-700 uppercase tracking-wide mb-3">Live Preview</h5>

      {/* Variable Inputs */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {template.variables.map(variable => (
          <div key={variable}>
            <label className="text-xs text-slate-600 block mb-1 font-medium">
              {`{{${variable}}}`}
            </label>
            <input
              type="text"
              value={customValues[variable] ?? SAMPLE_VALUES[variable] ?? ''}
              onChange={(e) => setCustomValues(prev => ({ ...prev, [variable]: e.target.value }))}
              className="w-full text-xs rounded border-slate-300 p-2 focus:border-brand-500 focus:ring-brand-500"
              placeholder={SAMPLE_VALUES[variable]?.substring(0, 30) + '...'}
            />
          </div>
        ))}
      </div>

      {/* Preview Output */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 max-h-64 overflow-auto">
        <pre className="text-xs text-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
          {previewText}
        </pre>
      </div>
    </div>
  );
};

export default PromptPreview;
