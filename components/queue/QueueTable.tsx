'use client';

import { useState } from 'react';
import {
  CheckCircle,
  XCircle,
  Loader2,
  Clock,
  Trash2,
  RotateCcw,
  Eye,
  MoreHorizontal,
  ChevronUp,
  ChevronDown,
  Ban,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { type QueueItem, type QueueStatus } from '@/lib/queue/queueService';

interface QueueTableProps {
  items: QueueItem[];
  onViewResult?: (item: QueueItem) => void;
  onRetry?: (id: string) => void;
  onCancel?: (id: string) => void;
  onDelete?: (id: string) => void;
  onPriorityChange?: (id: string, priority: number) => void;
  onSelectChange?: (ids: string[]) => void;
  selectedIds?: string[];
  loading?: boolean;
}

const statusConfig: Record<
  QueueStatus,
  { icon: typeof CheckCircle; label: string; variant: 'success' | 'warning' | 'danger' | 'info' | 'neutral' }
> = {
  pending: { icon: Clock, label: 'Pending', variant: 'neutral' },
  researching: { icon: Loader2, label: 'Researching', variant: 'info' },
  complete: { icon: CheckCircle, label: 'Complete', variant: 'success' },
  failed: { icon: XCircle, label: 'Failed', variant: 'danger' },
  cancelled: { icon: Ban, label: 'Cancelled', variant: 'warning' },
};

export function QueueTable({
  items,
  onViewResult,
  onRetry,
  onCancel,
  onDelete,
  onPriorityChange,
  onSelectChange,
  selectedIds = [],
  loading = false,
}: QueueTableProps) {
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  const handleSelectAll = () => {
    if (selectedIds.length === items.length) {
      onSelectChange?.([]);
    } else {
      onSelectChange?.(items.map((i) => i.id));
    }
  };

  const handleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      onSelectChange?.(selectedIds.filter((i) => i !== id));
    } else {
      onSelectChange?.([...selectedIds, id]);
    }
  };

  if (items.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-xl border border-slate-200">
        <Clock className="w-12 h-12 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-600 mb-2">Queue is empty</h3>
        <p className="text-sm text-slate-500">
          Add companies to start researching
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {/* Table header */}
      <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-medium text-slate-500 uppercase tracking-wider">
        <div className="col-span-1 flex items-center">
          <input
            type="checkbox"
            checked={selectedIds.length === items.length}
            onChange={handleSelectAll}
            className="w-4 h-4 rounded border-slate-300 focus-visible:ring-2 focus-visible:ring-teal-500"
            aria-label="Select all items"
          />
        </div>
        <div className="col-span-4">Company</div>
        <div className="col-span-2">Status</div>
        <div className="col-span-2">Type</div>
        <div className="col-span-1">Priority</div>
        <div className="col-span-2 text-right">Actions</div>
      </div>

      {/* Table body */}
      <div className="divide-y divide-slate-100">
        {items.map((item) => {
          const status = statusConfig[item.status];
          const StatusIcon = status.icon;
          const isSelected = selectedIds.includes(item.id);
          const isActionOpen = openActionId === item.id;

          return (
            <div
              key={item.id}
              className={`grid grid-cols-12 gap-4 px-4 py-3 items-center hover:bg-slate-50 transition-colors ${
                isSelected ? 'bg-teal-50' : ''
              }`}
            >
              {/* Checkbox */}
              <div className="col-span-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleSelect(item.id)}
                  className="w-4 h-4 rounded border-slate-300 focus-visible:ring-2 focus-visible:ring-teal-500"
                  aria-label={`Select ${item.company_name || item.company_domain}`}
                />
              </div>

              {/* Company info */}
              <div className="col-span-4 min-w-0">
                <p className="font-medium text-slate-900 truncate">
                  {item.company_name || item.company_domain}
                </p>
                <p className="text-xs text-slate-500 truncate">
                  {item.company_domain}
                </p>
              </div>

              {/* Status */}
              <div className="col-span-2">
                <Badge
                  variant={status.variant}
                  size="sm"
                  icon={
                    <StatusIcon
                      className={`w-3 h-3 ${
                        item.status === 'researching' ? 'animate-spin' : ''
                      }`}
                    />
                  }
                >
                  {status.label}
                </Badge>
              </div>

              {/* Research type */}
              <div className="col-span-2">
                <span className="text-sm text-slate-600 capitalize">
                  {item.research_type}
                </span>
              </div>

              {/* Priority */}
              <div className="col-span-1">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-data text-slate-600 w-6 text-center">
                    {item.priority}
                  </span>
                  {onPriorityChange && item.status === 'pending' && (
                    <div className="flex flex-col">
                      <button
                        onClick={() => onPriorityChange(item.id, item.priority + 1)}
                        className="p-0.5 text-slate-400 hover:text-slate-600"
                        aria-label="Increase priority"
                      >
                        <ChevronUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => onPriorityChange(item.id, Math.max(0, item.priority - 1))}
                        className="p-0.5 text-slate-400 hover:text-slate-600"
                        aria-label="Decrease priority"
                      >
                        <ChevronDown className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="col-span-2 flex items-center justify-end gap-2">
                {item.status === 'complete' && onViewResult && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewResult(item)}
                    leftIcon={<Eye className="w-4 h-4" />}
                  >
                    View
                  </Button>
                )}

                {item.status === 'failed' && onRetry && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onRetry(item.id)}
                    leftIcon={<RotateCcw className="w-4 h-4" />}
                  >
                    Retry
                  </Button>
                )}

                <div className="relative">
                  <button
                    onClick={() => setOpenActionId(isActionOpen ? null : item.id)}
                    className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg focus-visible:ring-2 focus-visible:ring-teal-500 focus:outline-none"
                    aria-label={`More actions for ${item.company_name || item.company_domain}`}
                    aria-expanded={isActionOpen}
                    aria-haspopup="menu"
                  >
                    <MoreHorizontal className="w-4 h-4" aria-hidden="true" />
                  </button>

                  {isActionOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setOpenActionId(null)}
                      />
                      <div
                        className="absolute right-0 top-full mt-1 w-40 bg-white border border-slate-200 rounded-lg shadow-lg py-1 z-20"
                        role="menu"
                        aria-label="Item actions"
                      >
                        {item.status === 'pending' && onCancel && (
                          <button
                            onClick={() => {
                              onCancel(item.id);
                              setOpenActionId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 focus:outline-none"
                            role="menuitem"
                          >
                            <Ban className="w-4 h-4" aria-hidden="true" />
                            Cancel
                          </button>
                        )}
                        {onDelete && (
                          <button
                            onClick={() => {
                              onDelete(item.id);
                              setOpenActionId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm text-danger-600 hover:bg-danger-50 flex items-center gap-2 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500 focus:outline-none"
                            role="menuitem"
                          >
                            <Trash2 className="w-4 h-4" aria-hidden="true" />
                            Delete
                          </button>
                        )}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
        </div>
      )}
    </div>
  );
}

export default QueueTable;
