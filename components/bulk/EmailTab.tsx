import { useState } from 'react';
import { Mail, X } from 'lucide-react';
import { BulkResearchSession } from '../../types/bulkResearchTypes';

interface EmailTabProps {
  session: BulkResearchSession | null;
}

const EmailTab = ({ session }: EmailTabProps) => {
  const [showNotice, setShowNotice] = useState(false);

  if (!session || session.successCount === 0) {
    return (
      <div className="text-center py-12 text-slate-500">
        Complete bulk research first to generate emails.
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-6">
      <div className="text-center py-8">
        <Mail className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-900 mb-2">Batch Email Generation</h3>
        <p className="text-slate-500 mb-4">
          Generate personalized emails for {session.successCount} researched companies.
        </p>
        <button
          className="px-6 py-3 bg-emerald-600 text-white font-medium rounded-lg hover:bg-emerald-700"
          onClick={() => setShowNotice(true)}
        >
          Generate Emails
        </button>

        {showNotice && (
          <div className="mt-4 inline-flex items-center bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-lg px-4 py-2">
            <span>Batch email generation coming soon.</span>
            <button
              onClick={() => setShowNotice(false)}
              className="ml-2 text-amber-500 hover:text-amber-700"
              aria-label="Dismiss notice"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmailTab;
