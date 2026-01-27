import React from 'react';
import { PainPointHypothesis } from '../../types';
import { Lightbulb, FileText, CheckCircle } from 'lucide-react';

interface Props {
  hypotheses: PainPointHypothesis[];
}

const PainPointHypothesesSection: React.FC<Props> = ({ hypotheses }) => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
      <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
        <Lightbulb className="w-5 h-5 text-amber-500 mr-2" />
        Pain Point Hypotheses
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {hypotheses.map((item, idx) => (
          <div key={idx} className="bg-slate-50 rounded-lg p-4 border border-slate-100">
            <div className="flex items-start space-x-3 mb-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center text-xs font-bold">
                {idx + 1}
              </span>
              <p className="text-sm font-medium text-slate-800">{item.hypothesis}</p>
            </div>

            <div className="ml-9 space-y-3">
              <div className="flex items-start text-xs">
                <FileText className="w-3 h-3 text-slate-400 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-slate-500 block mb-0.5">Evidence</span>
                  <span className="text-slate-600">{item.evidence}</span>
                </div>
              </div>

              <div className="flex items-start text-xs">
                <CheckCircle className="w-3 h-3 text-brand-500 mr-2 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-brand-600 block mb-0.5">Solution Fit</span>
                  <span className="text-brand-700">{item.revology_solution_fit}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PainPointHypothesesSection;
