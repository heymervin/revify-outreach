import {
  CheckCircle,
  XCircle,
  DollarSign,
  Clock,
} from 'lucide-react';
import { BulkResearchSession, BulkResearchResult, formatDuration, formatCost } from '../../types/bulkResearchTypes';

interface ResultsTabProps {
  session: BulkResearchSession | null;
}

const ResultsTab = ({ session }: ResultsTabProps) => {
  if (!session || Object.keys(session.results).length === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        No research results yet. Start a bulk research from the Selection tab.
      </div>
    );
  }

  const results: BulkResearchResult[] = Object.values(session.results);
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Results Summary</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 rounded-lg p-4">
            <div className="flex items-center">
              <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
              <span className="text-sm text-green-700">Successful</span>
            </div>
            <div className="text-2xl font-bold text-green-600 mt-1">{successful.length}</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4">
            <div className="flex items-center">
              <XCircle className="w-5 h-5 text-red-600 mr-2" />
              <span className="text-sm text-red-700">Failed</span>
            </div>
            <div className="text-2xl font-bold text-red-600 mt-1">{failed.length}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center">
              <DollarSign className="w-5 h-5 text-slate-600 mr-2" />
              <span className="text-sm text-slate-700">Total Cost</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{formatCost(session.actualCost)}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-4">
            <div className="flex items-center">
              <Clock className="w-5 h-5 text-slate-600 mr-2" />
              <span className="text-sm text-slate-700">Total Time</span>
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{formatDuration(session.totalElapsedMs)}</div>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full">
            <thead className="bg-slate-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Company</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Cost</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase">Saved to GHL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {results.map(result => (
                <tr key={result.companyId} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{result.companyName}</td>
                  <td className="px-4 py-3">
                    {result.success ? (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Success
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded-full">
                        <XCircle className="w-3 h-3 mr-1" />
                        Failed
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{formatCost(result.cost)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDuration(result.executionTimeMs)}</td>
                  <td className="px-4 py-3">
                    {result.savedToGhl ? (
                      <CheckCircle className="w-4 h-4 text-green-500" aria-label="Saved" />
                    ) : (
                      <span className="text-slate-400" aria-label="Not saved">-</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ResultsTab;
