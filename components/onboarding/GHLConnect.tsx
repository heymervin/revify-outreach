'use client';

import { useState } from 'react';
import { Link as LinkIcon, ExternalLink, Check, AlertCircle, HelpCircle } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

interface GHLConnectProps {
  locationId: string;
  onLocationIdChange: (value: string) => void;
  onConnect?: () => Promise<boolean>;
  connectionStatus?: 'idle' | 'connecting' | 'connected' | 'error';
  connectionError?: string;
}

export function GHLConnect({
  locationId,
  onLocationIdChange,
  onConnect,
  connectionStatus = 'idle',
  connectionError,
}: GHLConnectProps) {
  const [showHelp, setShowHelp] = useState(false);

  return (
    <div>
      {/* Info banner */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <LinkIcon className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-purple-800">
              Connect your GoHighLevel account
            </p>
            <p className="text-sm text-purple-600 mt-1">
              Import companies and contacts directly from GHL for research.
            </p>
          </div>
        </div>
      </div>

      {/* Location ID input */}
      <Card padding="md" className="mb-4">
        <Input
          label="GHL Location ID"
          value={locationId}
          onChange={(e) => onLocationIdChange(e.target.value)}
          placeholder="e.g., abc123xyz789"
          error={connectionStatus === 'error' ? connectionError : undefined}
          helperText="Find this in GHL Settings → Business Profile → Location ID"
        />

        {/* Help toggle */}
        <button
          type="button"
          onClick={() => setShowHelp(!showHelp)}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 mt-3"
        >
          <HelpCircle className="w-4 h-4" />
          Where do I find my Location ID?
        </button>

        {showHelp && (
          <div className="mt-4 p-4 bg-slate-50 rounded-xl">
            <h4 className="text-sm font-medium text-slate-900 mb-2">
              How to find your Location ID:
            </h4>
            <ol className="text-sm text-slate-600 space-y-2 list-decimal list-inside">
              <li>Log in to your GoHighLevel account</li>
              <li>Click on Settings in the left sidebar</li>
              <li>Select Business Profile</li>
              <li>Scroll down to find your Location ID</li>
              <li>Copy and paste it here</li>
            </ol>
            <a
              href="https://help.gohighlevel.com/support/solutions/articles/48001205119-how-to-find-your-location-id"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-teal-600 hover:text-teal-700 mt-3"
            >
              View GHL documentation
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        )}
      </Card>

      {/* Connection status */}
      {connectionStatus === 'connected' && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 bg-success-100 rounded-full flex items-center justify-center">
            <Check className="w-4 h-4 text-success-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-success-800">Connected successfully!</p>
            <p className="text-xs text-success-600">Your GHL location is linked</p>
          </div>
        </div>
      )}

      {connectionStatus === 'error' && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-xl flex items-center gap-3">
          <div className="w-8 h-8 bg-danger-100 rounded-full flex items-center justify-center">
            <AlertCircle className="w-4 h-4 text-danger-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-danger-800">Connection failed</p>
            <p className="text-xs text-danger-600">
              {connectionError || 'Please check your Location ID and try again'}
            </p>
          </div>
        </div>
      )}

      {/* Benefits */}
      <Card padding="md" className="mt-4">
        <h4 className="text-sm font-medium text-slate-900 mb-3">
          With GHL connected, you can:
        </h4>
        <ul className="space-y-2">
          {[
            'Import companies from your GHL CRM',
            'Sync research results back to GHL',
            'Auto-update contact records with insights',
            'Run bulk research on your pipeline',
          ].map((benefit, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-slate-600">
              <Check className="w-4 h-4 text-teal-500 flex-shrink-0" />
              {benefit}
            </li>
          ))}
        </ul>
      </Card>

      {/* Test connection button */}
      {onConnect && locationId && connectionStatus !== 'connected' && (
        <Button
          variant="secondary"
          onClick={onConnect}
          loading={connectionStatus === 'connecting'}
          className="w-full mt-4"
        >
          Test Connection
        </Button>
      )}
    </div>
  );
}

export default GHLConnect;
