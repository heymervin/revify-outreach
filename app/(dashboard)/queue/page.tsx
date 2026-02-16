'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  Layers,
  Play,
  Pause,
  Trash2,
  Download,
  RefreshCw,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { QueueTable } from '@/components/queue/QueueTable';
import { QuickAdd } from '@/components/queue/QuickAdd';
import { ImportCSV } from '@/components/queue/ImportCSV';
import {
  createQueueService,
  type QueueItem,
  type QueueStatus,
  type ResearchType,
} from '@/lib/queue/queueService';

type TabId = 'queue' | 'add' | 'import';

export default function QueuePage() {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabId>('queue');
  const [loading, setLoading] = useState(true);
  const [queueItems, setQueueItems] = useState<QueueItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [stats, setStats] = useState({
    pending: 0,
    researching: 0,
    complete: 0,
    failed: 0,
    total: 0,
  });

  const [processing, setProcessing] = useState(false);
  const [paused, setPaused] = useState(false);

  const [organizationId, setOrganizationId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Initialize user context
  useEffect(() => {
    const initUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: userData } = await supabase
        .from('users')
        .select('organization_id')
        .eq('id', user.id)
        .single();

      if (userData) {
        setUserId(user.id);
        setOrganizationId(userData.organization_id);
      }
    };

    initUser();
  }, [supabase]);

  // Load queue items
  const loadQueue = useCallback(async () => {
    if (!organizationId || !userId) return;

    setLoading(true);
    try {
      const service = createQueueService(supabase, organizationId, userId);
      const [items, queueStats] = await Promise.all([
        service.getAll(100),
        service.getStats(),
      ]);

      setQueueItems(items);
      setStats(queueStats);
    } catch (error) {
      console.error('Failed to load queue:', error);
    } finally {
      setLoading(false);
    }
  }, [supabase, organizationId, userId]);

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Queue service instance
  const getService = useCallback(() => {
    if (!organizationId || !userId) throw new Error('Not authenticated');
    return createQueueService(supabase, organizationId, userId);
  }, [supabase, organizationId, userId]);

  // Add single item
  const handleAdd = async (domain: string, researchType: ResearchType) => {
    try {
      const service = getService();
      await service.addToQueue({
        company_domain: domain,
        research_type: researchType,
        source: 'manual',
      });
      await loadQueue();
      setActiveTab('queue');
    } catch (error) {
      console.error('Failed to add to queue:', error);
    }
  };

  // Research now (add and immediately process)
  const handleResearchNow = async (domain: string, researchType: ResearchType) => {
    try {
      const service = getService();
      await service.addToQueue({
        company_domain: domain,
        research_type: researchType,
        source: 'manual',
        priority: 100, // High priority
      });
      await loadQueue();
      setActiveTab('queue');
      // Start processing
      startProcessing();
    } catch (error) {
      console.error('Failed to research:', error);
    }
  };

  // Import CSV
  const handleImport = async (rows: any[]) => {
    try {
      const service = getService();
      await service.addBatchToQueue(
        rows.map((row) => ({
          company_domain: row.domain,
          company_name: row.name,
          company_website: row.website,
          industry: row.industry,
          source: 'csv' as const,
        }))
      );
      await loadQueue();
      setActiveTab('queue');
    } catch (error) {
      console.error('Failed to import:', error);
    }
  };

  // Process queue
  const startProcessing = async () => {
    if (!organizationId || !userId) return;

    setProcessing(true);
    setPaused(false);

    const service = getService();

    while (!paused) {
      const nextItem = await service.getNext();
      if (!nextItem) break;

      // Mark as researching
      await service.updateStatus(nextItem.id, 'researching');
      await loadQueue();

      try {
        // Call research API
        const response = await fetch('/api/research', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company_name: nextItem.company_name || nextItem.company_domain,
            company_website: nextItem.company_website || `https://${nextItem.company_domain}`,
            industry: nextItem.industry,
            research_type: nextItem.research_type,
          }),
        });

        const data = await response.json();

        if (response.ok) {
          await service.updateStatus(nextItem.id, 'complete', {
            research_id: data.session_id,
            research_result: data.research,
          });
        } else {
          throw new Error(data.error || 'Research failed');
        }
      } catch (error) {
        await service.updateStatus(nextItem.id, 'failed', {
          error_message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      await loadQueue();
    }

    setProcessing(false);
  };

  const togglePause = () => {
    setPaused(!paused);
    if (paused) {
      startProcessing();
    }
  };

  // Delete selected
  const handleDeleteSelected = async () => {
    try {
      const service = getService();
      await service.deleteBatch(selectedIds);
      setSelectedIds([]);
      await loadQueue();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  // Clear completed
  const [exporting, setExporting] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const handleExport = async (bundleType: 'individual' | 'combined') => {
    setExporting(true);
    setShowExportMenu(false);
    try {
      // Get research session IDs from completed queue items
      const completedItems = queueItems.filter(
        (item) => item.status === 'complete' && item.research_id
      );
      const sessionIds = completedItems.map((item) => item.research_id!);

      if (!sessionIds.length) return;

      const response = await fetch('/api/research/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_ids: sessionIds, bundle_type: bundleType }),
      });

      if (!response.ok) throw new Error('Export failed');

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = bundleType === 'combined'
        ? 'bulk_research_report.pdf'
        : 'research_reports.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExporting(false);
    }
  };

  const handleClearCompleted = async () => {
    try {
      const service = getService();
      await service.clearCompleted();
      await loadQueue();
    } catch (error) {
      console.error('Failed to clear:', error);
    }
  };

  // Retry item
  const handleRetry = async (id: string) => {
    try {
      const service = getService();
      await service.retry(id);
      await loadQueue();
    } catch (error) {
      console.error('Failed to retry:', error);
    }
  };

  // Cancel item
  const handleCancel = async (id: string) => {
    try {
      const service = getService();
      await service.cancel(id);
      await loadQueue();
    } catch (error) {
      console.error('Failed to cancel:', error);
    }
  };

  // Delete item
  const handleDelete = async (id: string) => {
    try {
      const service = getService();
      await service.delete(id);
      await loadQueue();
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  // Priority change
  const handlePriorityChange = async (id: string, priority: number) => {
    try {
      const service = getService();
      await service.updatePriority(id, priority);
      await loadQueue();
    } catch (error) {
      console.error('Failed to update priority:', error);
    }
  };

  const tabs = [
    { id: 'queue' as TabId, label: 'My Queue', count: stats.total },
    { id: 'add' as TabId, label: 'Quick Add' },
    { id: 'import' as TabId, label: 'Import CSV' },
  ];

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 px-4 sm:px-8 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 font-heading flex items-center gap-3">
              <Layers className="w-6 h-6 text-teal-600" />
              Research Queue
            </h2>
            <p className="text-slate-500 text-sm mt-0.5 hidden sm:block">
              Manage and process your research queue
            </p>
          </div>

          {/* Stats badges */}
          <div className="flex items-center gap-3">
            <Badge variant="neutral" size="md" icon={<Clock className="w-3.5 h-3.5" />}>
              {stats.pending} pending
            </Badge>
            <Badge variant="success" size="md" icon={<CheckCircle className="w-3.5 h-3.5" />}>
              {stats.complete} complete
            </Badge>
            {stats.failed > 0 && (
              <Badge variant="danger" size="md" icon={<AlertCircle className="w-3.5 h-3.5" />}>
                {stats.failed} failed
              </Badge>
            )}
          </div>
        </div>
      </header>

      <div className="p-4 sm:p-8">
        <div className="max-w-6xl mx-auto">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-6 border-b border-slate-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-teal-500 text-teal-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span className="ml-2 px-2 py-0.5 bg-slate-100 rounded-full text-xs">
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'queue' && (
            <div className="space-y-6">
              {/* Action bar */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {stats.pending > 0 && (
                    <Button
                      variant={processing ? 'secondary' : 'primary'}
                      onClick={processing ? togglePause : startProcessing}
                      leftIcon={
                        processing ? (
                          paused ? (
                            <Play className="w-4 h-4" />
                          ) : (
                            <Pause className="w-4 h-4" />
                          )
                        ) : (
                          <Play className="w-4 h-4" />
                        )
                      }
                    >
                      {processing ? (paused ? 'Resume' : 'Pause') : 'Start Processing'}
                    </Button>
                  )}

                  {selectedIds.length > 0 && (
                    <Button
                      variant="danger"
                      onClick={handleDeleteSelected}
                      leftIcon={<Trash2 className="w-4 h-4" />}
                    >
                      Delete ({selectedIds.length})
                    </Button>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    onClick={loadQueue}
                    leftIcon={<RefreshCw className="w-4 h-4" />}
                    loading={loading}
                  >
                    Refresh
                  </Button>

                  {stats.complete + stats.failed > 0 && (
                    <Button
                      variant="ghost"
                      onClick={handleClearCompleted}
                      leftIcon={<Trash2 className="w-4 h-4" />}
                    >
                      Clear Completed
                    </Button>
                  )}

                  {stats.complete > 0 && (
                    <div className="relative">
                      <Button
                        variant="secondary"
                        leftIcon={exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                        onClick={() => setShowExportMenu(!showExportMenu)}
                        disabled={exporting}
                      >
                        {exporting ? 'Exporting...' : 'Export Results'}
                      </Button>
                      {showExportMenu && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowExportMenu(false)} />
                          <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-2 z-50">
                            <button
                              onClick={() => handleExport('individual')}
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              Export as PDF (Individual ZIP)
                            </button>
                            <button
                              onClick={() => handleExport('combined')}
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                            >
                              Export as PDF (Combined)
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Queue table */}
              <QueueTable
                items={queueItems}
                selectedIds={selectedIds}
                onSelectChange={setSelectedIds}
                onRetry={handleRetry}
                onCancel={handleCancel}
                onDelete={handleDelete}
                onPriorityChange={handlePriorityChange}
                loading={loading}
              />
            </div>
          )}

          {activeTab === 'add' && (
            <div className="max-w-md">
              <QuickAdd
                onAdd={handleAdd}
                onResearchNow={handleResearchNow}
              />
            </div>
          )}

          {activeTab === 'import' && (
            <div className="max-w-2xl">
              <ImportCSV onImport={handleImport} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
