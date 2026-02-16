import { useState, useEffect } from 'react';
import type {
  PainPointHypothesis,
  RecentSignalV3,
  UrgencyLevel,
} from '@/types/researchTypesV3';

export interface ResearchPreview {
  company_name: string;
  industry: string;
  top_pain_points: PainPointHypothesis[];
  top_signals: RecentSignalV3[];
  recommended_personas: string[];
  urgency?: UrgencyLevel;
}

interface UseResearchPreviewResult {
  preview: ResearchPreview | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useResearchPreview(
  sessionId: string | null
): UseResearchPreviewResult {
  const [preview, setPreview] = useState<ResearchPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPreview = async () => {
    if (!sessionId) {
      setPreview(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/research/${sessionId}/preview`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch preview');
      }

      setPreview(data.preview);
    } catch (err) {
      console.error('Failed to fetch research preview:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch preview');
      setPreview(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPreview();
  }, [sessionId]);

  return {
    preview,
    loading,
    error,
    refetch: fetchPreview,
  };
}
