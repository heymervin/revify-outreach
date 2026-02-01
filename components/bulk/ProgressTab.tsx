import {
  Loader2,
  Pause,
  Play,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { BulkResearchSession, BulkProgressUpdate, formatDuration, formatCost } from '../../types/bulkResearchTypes';

interface ProgressTabProps {
  session: BulkResearchSession | null;
  progress: BulkProgressUpdate | null;
  onPause: () => void;
  onResume: () => void;
}

const ProgressTab = ({ session, progress, onPause, onResume }: ProgressTabProps) => {
  if (!session) {
    return (
      <div className="text-center py-12 text-slate-500">
        No active research session. Start a bulk research from the Selection tab.
      </div>
    );
  }

  const percentComplete = session.totalCount > 0
    ? Math.round((session.processedCount / session.totalCount) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            {session.status === 'researching' && (
              <Loader2 className="w-6 h-6 text-emerald-600 animate-spin mr-3" />
            )}
            {session.status === 'paused' && (
              <Pause className="w-6 h-6 text-amber-600 mr-3" />
            )}
            {session.status === 'research_complete' && (
              <CheckCircle className="w-6 h-6 text-green-600 mr-3" />
            )}
            <h3 className="text-lg font-semibold text-slate-900">
              {session.status === 'researching' && 'Research in Progress'}
              {session.status === 'paused' && 'Research Paused'}
              {session.status === 'research_complete' && 'Research Complete'}
              {session.status === 'ready' && 'Starting...'}
            </h3>
          </div>

          <div className="flex space-x-2">
            {session.status === 'researching' && (
              <button
                onClick={onPause}
                className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 flex items-center"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </button>
            )}
            {session.status === 'paused' && (
              <button
                onClick={onResume}
                className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 flex items-center"
              >
                <Play className="w-4 h-4 mr-2" />
                Resume
              </button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-slate-600 mb-1">
            <span>{session.processedCount} of {session.totalCount} companies</span>
            <span>{percentComplete}%</span>
          </div>
          <div className="w-full bg-slate-200 rounded-full h-3" role="progressbar" aria-valuenow={percentComplete} aria-valuemin={0} aria-valuemax={100}>
            <div
              className="bg-emerald-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${percentComplete}%` }}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-500">Success</div>
            <div className="text-xl font-semibold text-green-600">{session.successCount}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-500">Failed</div>
            <div className="text-xl font-semibold text-red-600">{session.failureCount}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-500">Cost</div>
            <div className="text-xl font-semibold text-slate-900">{formatCost(session.actualCost)}</div>
          </div>
          <div className="bg-slate-50 rounded-lg p-3">
            <div className="text-sm text-slate-500">Saved to GHL</div>
            <div className="text-xl font-semibold text-slate-900">{session.savedToGhlCount}</div>
          </div>
        </div>
      </div>

      {/* Current Company */}
      {progress && session.status === 'researching' && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center mb-2">
            <Loader2 className="w-4 h-4 text-emerald-600 animate-spin mr-2" />
            <span className="text-sm text-slate-500">Currently researching:</span>
          </div>
          <div className="font-semibold text-slate-900">{progress.currentCompanyName}</div>
          <div className="mt-2 text-sm text-slate-500">
            Estimated time remaining: {formatDuration(progress.estimatedRemainingMs)}
          </div>
        </div>
      )}

      {/* Errors */}
      {session.errors.length > 0 && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <h4 className="font-semibold text-slate-900 mb-3 flex items-center">
            <AlertTriangle className="w-5 h-5 text-amber-500 mr-2" />
            Errors ({session.errors.length})
          </h4>
          <div className="max-h-48 overflow-y-auto space-y-2">
            {session.errors.map((err, idx) => (
              <div key={idx} className="bg-red-50 rounded p-3 text-sm" role="alert">
                <div className="font-medium text-red-800">{err.companyName}</div>
                <div className="text-red-600">{err.error}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgressTab;
