'use client';

import { Suspense } from 'react';
import { OutreachWizard } from '@/components/email/OutreachWizard';
import { Loader2 } from 'lucide-react';

function LoadingFallback() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
    </div>
  );
}

export default function EmailPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <OutreachWizard />
    </Suspense>
  );
}
