'use client';

import { useState } from 'react';
import { Search, Building2, TrendingUp, Target, Sparkles } from 'lucide-react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { ProgressiveLoader, type ProgressStep } from '@/components/ui/ProgressiveLoader';

const RESEARCH_STEPS: ProgressStep[] = [
  { id: 'website', label: 'Analyzing company website', description: 'Extracting company information' },
  { id: 'news', label: 'Searching recent news', description: 'Finding latest company updates' },
  { id: 'signals', label: 'Identifying business signals', description: 'Detecting growth indicators' },
  { id: 'insights', label: 'Generating insights', description: 'Creating actionable recommendations' },
];

const SAMPLE_COMPANIES = [
  { domain: 'salesforce.com', name: 'Salesforce', industry: 'CRM Software' },
  { domain: 'hubspot.com', name: 'HubSpot', industry: 'Marketing Software' },
  { domain: 'stripe.com', name: 'Stripe', industry: 'Fintech' },
];

interface SampleResearchProps {
  onResearchComplete?: (result: any) => void;
  onResearchStart?: () => void;
  hasApiKey?: boolean;
}

export function SampleResearch({
  onResearchComplete,
  onResearchStart,
  hasApiKey = false,
}: SampleResearchProps) {
  const [domain, setDomain] = useState('');
  const [isResearching, setIsResearching] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStartResearch = async () => {
    const targetDomain = domain.trim() || 'salesforce.com';
    setIsResearching(true);
    setCurrentStep(0);
    setError(null);
    onResearchStart?.();

    try {
      // Simulate step progression for demo
      for (let i = 0; i < RESEARCH_STEPS.length; i++) {
        setCurrentStep(i);
        await new Promise((r) => setTimeout(r, 1500));
      }

      // If we have an API key, try real research
      if (hasApiKey) {
        const response = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_website: targetDomain,
            company_name: '',
            research_type: 'quick',
          }),
        });

        if (!response.ok) {
          throw new Error('Research failed');
        }

        const data = await response.json();
        setResult(data.research);
        onResearchComplete?.(data.research);
      } else {
        // Demo result
        setResult({
          company_profile: {
            confirmed_name: 'Salesforce',
            industry: 'Enterprise Software',
            estimated_revenue: '$31.4B',
            employee_count: '70,000+',
          },
          recent_signals: [
            { signal_type: 'Growth', description: 'Expanded AI capabilities with Einstein GPT' },
            { signal_type: 'Strategic', description: 'Recent acquisition in data analytics space' },
          ],
          pain_point_hypotheses: [
            { hypothesis: 'Complex pricing across product lines', evidence: 'Multiple pricing tiers mentioned' },
            { hypothesis: 'Enterprise deal velocity challenges', evidence: 'Long sales cycles reported' },
          ],
        });
        onResearchComplete?.(result);
      }
    } catch (err) {
      setError('Research failed. You can continue setup and try again later.');
    } finally {
      setIsResearching(false);
    }
  };

  const handleCancel = () => {
    setIsResearching(false);
    setCurrentStep(0);
  };

  if (isResearching) {
    return (
      <ProgressiveLoader
        steps={RESEARCH_STEPS}
        currentStep={currentStep}
        estimatedTime={hasApiKey ? 15 : 6}
        onCancel={handleCancel}
        title="Researching company..."
        className="max-w-lg mx-auto"
      />
    );
  }

  if (result) {
    return (
      <div className="space-y-4">
        {/* Success message */}
        <div className="bg-success-50 border border-success-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-success-100 rounded-full flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="font-medium text-success-800">Research complete!</p>
              <p className="text-sm text-success-600">Here&apos;s a preview of what you can discover</p>
            </div>
          </div>
        </div>

        {/* Company Overview */}
        <Card padding="md">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6 text-slate-600" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-slate-900">
                {result.company_profile.confirmed_name}
              </h3>
              <p className="text-sm text-slate-600">{result.company_profile.industry}</p>
              <div className="flex gap-4 mt-2 text-sm text-slate-500">
                <span>{result.company_profile.estimated_revenue} revenue</span>
                <span>{result.company_profile.employee_count} employees</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Signals */}
        <Card padding="md" title="Business Signals">
          <div className="space-y-3">
            {result.recent_signals.slice(0, 2).map((signal: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <Badge variant="info" size="sm" className="mb-1">
                    {signal.signal_type}
                  </Badge>
                  <p className="text-sm text-slate-600">{signal.description}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Pain Points */}
        <Card padding="md" title="Pain Point Hypotheses">
          <div className="space-y-3">
            {result.pain_point_hypotheses.slice(0, 2).map((point: any, i: number) => (
              <div key={i} className="flex items-start gap-3">
                <div className="w-8 h-8 bg-warning-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Target className="w-4 h-4 text-warning-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">{point.hypothesis}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{point.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Try another button */}
        <Button
          variant="ghost"
          onClick={() => setResult(null)}
          className="w-full"
        >
          Research another company
        </Button>
      </div>
    );
  }

  return (
    <div>
      {/* Quick select */}
      <div className="mb-6">
        <p className="text-sm text-slate-600 mb-3">Try with a sample company:</p>
        <div className="flex flex-wrap gap-2">
          {SAMPLE_COMPANIES.map((company) => (
            <button
              key={company.domain}
              onClick={() => setDomain(company.domain)}
              className={`px-3 py-1.5 text-sm rounded-lg border transition-colors ${
                domain === company.domain
                  ? 'bg-teal-50 border-teal-300 text-teal-700'
                  : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
              }`}
            >
              {company.name}
            </button>
          ))}
        </div>
      </div>

      {/* Or enter custom */}
      <div className="relative">
        <Input
          label="Or enter any company domain"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
          placeholder="e.g., company.com"
          leftIcon={<Search className="w-4 h-4" />}
        />
      </div>

      {error && (
        <div className="mt-4 p-3 bg-danger-50 border border-danger-200 rounded-xl text-sm text-danger-700">
          {error}
        </div>
      )}

      {!hasApiKey && (
        <div className="mt-4 p-3 bg-warning-50 border border-warning-200 rounded-xl text-sm text-warning-700">
          This is a demo preview. Add an API key in the previous step for real research.
        </div>
      )}

      <Button
        variant="primary"
        onClick={handleStartResearch}
        className="w-full mt-6"
        leftIcon={<Search className="w-4 h-4" />}
      >
        Start Sample Research
      </Button>
    </div>
  );
}

export default SampleResearch;
