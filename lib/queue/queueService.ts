import { SupabaseClient } from '@supabase/supabase-js';

export type QueueStatus = 'pending' | 'researching' | 'complete' | 'failed' | 'cancelled';
export type QueueSource = 'manual' | 'csv' | 'ghl' | 'api';
export type ResearchType = 'quick' | 'standard' | 'deep';

export interface QueueItem {
  id: string;
  user_id: string;
  organization_id: string;
  company_domain: string;
  company_name?: string;
  company_website?: string;
  industry?: string;
  status: QueueStatus;
  priority: number;
  position?: number;
  research_type: ResearchType;
  research_id?: string;
  research_result?: any;
  error_message?: string;
  retry_count: number;
  max_retries: number;
  source: QueueSource;
  ghl_company_id?: string;
  ghl_account_id?: string;
  batch_id?: string;
  created_at: string;
  updated_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface AddToQueueInput {
  company_domain: string;
  company_name?: string;
  company_website?: string;
  industry?: string;
  research_type?: ResearchType;
  priority?: number;
  source?: QueueSource;
  ghl_company_id?: string;
  ghl_account_id?: string;
  batch_id?: string;
}

export interface QueueServiceOptions {
  supabase: SupabaseClient;
  organizationId: string;
  userId: string;
}

export class QueueService {
  private supabase: SupabaseClient;
  private organizationId: string;
  private userId: string;

  constructor(options: QueueServiceOptions) {
    this.supabase = options.supabase;
    this.organizationId = options.organizationId;
    this.userId = options.userId;
  }

  /**
   * Add a single item to the queue
   */
  async addToQueue(input: AddToQueueInput): Promise<QueueItem> {
    const { data, error } = await this.supabase
      .from('research_queue')
      .insert({
        organization_id: this.organizationId,
        user_id: this.userId,
        company_domain: input.company_domain,
        company_name: input.company_name,
        company_website: input.company_website,
        industry: input.industry,
        research_type: input.research_type || 'standard',
        priority: input.priority || 0,
        source: input.source || 'manual',
        ghl_company_id: input.ghl_company_id,
        ghl_account_id: input.ghl_account_id,
        batch_id: input.batch_id,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to add to queue: ${error.message}`);
    }

    return data;
  }

  /**
   * Add multiple items to the queue (batch)
   */
  async addBatchToQueue(
    items: AddToQueueInput[],
    batchId?: string
  ): Promise<QueueItem[]> {
    const batch_id = batchId || crypto.randomUUID();

    const records = items.map((item) => ({
      organization_id: this.organizationId,
      user_id: this.userId,
      company_domain: item.company_domain,
      company_name: item.company_name,
      company_website: item.company_website,
      industry: item.industry,
      research_type: item.research_type || 'standard',
      priority: item.priority || 0,
      source: item.source || 'csv',
      ghl_company_id: item.ghl_company_id,
      ghl_account_id: item.ghl_account_id,
      batch_id,
    }));

    const { data, error } = await this.supabase
      .from('research_queue')
      .insert(records)
      .select();

    if (error) {
      throw new Error(`Failed to add batch to queue: ${error.message}`);
    }

    return data;
  }

  /**
   * Get queue items by status
   */
  async getByStatus(status: QueueStatus | QueueStatus[]): Promise<QueueItem[]> {
    const statuses = Array.isArray(status) ? status : [status];

    const { data, error } = await this.supabase
      .from('research_queue')
      .select('*')
      .eq('organization_id', this.organizationId)
      .in('status', statuses)
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw new Error(`Failed to get queue: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all queue items for the organization
   */
  async getAll(limit?: number): Promise<QueueItem[]> {
    let query = this.supabase
      .from('research_queue')
      .select('*')
      .eq('organization_id', this.organizationId)
      .order('status', { ascending: true })
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true });

    if (limit) {
      query = query.limit(limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to get queue: ${error.message}`);
    }

    return data;
  }

  /**
   * Get a specific queue item
   */
  async getById(id: string): Promise<QueueItem | null> {
    const { data, error } = await this.supabase
      .from('research_queue')
      .select('*')
      .eq('id', id)
      .eq('organization_id', this.organizationId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get queue item: ${error.message}`);
    }

    return data;
  }

  /**
   * Update queue item status
   */
  async updateStatus(
    id: string,
    status: QueueStatus,
    additionalData?: Partial<QueueItem>
  ): Promise<QueueItem> {
    const updateData: any = { status };

    if (status === 'researching') {
      updateData.started_at = new Date().toISOString();
    } else if (status === 'complete' || status === 'failed') {
      updateData.completed_at = new Date().toISOString();
    }

    if (additionalData) {
      Object.assign(updateData, additionalData);
    }

    const { data, error } = await this.supabase
      .from('research_queue')
      .update(updateData)
      .eq('id', id)
      .eq('organization_id', this.organizationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update queue item: ${error.message}`);
    }

    return data;
  }

  /**
   * Update queue item priority
   */
  async updatePriority(id: string, priority: number): Promise<QueueItem> {
    const { data, error } = await this.supabase
      .from('research_queue')
      .update({ priority })
      .eq('id', id)
      .eq('organization_id', this.organizationId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update priority: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete a queue item
   */
  async delete(id: string): Promise<void> {
    const { error } = await this.supabase
      .from('research_queue')
      .delete()
      .eq('id', id)
      .eq('organization_id', this.organizationId);

    if (error) {
      throw new Error(`Failed to delete queue item: ${error.message}`);
    }
  }

  /**
   * Delete multiple queue items
   */
  async deleteBatch(ids: string[]): Promise<void> {
    const { error } = await this.supabase
      .from('research_queue')
      .delete()
      .in('id', ids)
      .eq('organization_id', this.organizationId);

    if (error) {
      throw new Error(`Failed to delete queue items: ${error.message}`);
    }
  }

  /**
   * Clear all completed or failed items
   */
  async clearCompleted(): Promise<number> {
    const { data, error } = await this.supabase
      .from('research_queue')
      .delete()
      .eq('organization_id', this.organizationId)
      .in('status', ['complete', 'failed', 'cancelled'])
      .select('id');

    if (error) {
      throw new Error(`Failed to clear completed: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Get next item to process
   */
  async getNext(): Promise<QueueItem | null> {
    const { data, error } = await this.supabase
      .from('research_queue')
      .select('*')
      .eq('organization_id', this.organizationId)
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at', { ascending: true })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null;
      throw new Error(`Failed to get next item: ${error.message}`);
    }

    return data;
  }

  /**
   * Get queue statistics
   */
  async getStats(): Promise<{
    pending: number;
    researching: number;
    complete: number;
    failed: number;
    total: number;
  }> {
    const { data, error } = await this.supabase
      .from('research_queue')
      .select('status')
      .eq('organization_id', this.organizationId);

    if (error) {
      throw new Error(`Failed to get stats: ${error.message}`);
    }

    const stats = {
      pending: 0,
      researching: 0,
      complete: 0,
      failed: 0,
      total: 0,
    };

    data.forEach((item) => {
      stats.total++;
      if (item.status in stats) {
        stats[item.status as keyof typeof stats]++;
      }
    });

    return stats;
  }

  /**
   * Retry a failed item
   */
  async retry(id: string): Promise<QueueItem> {
    const item = await this.getById(id);
    if (!item) {
      throw new Error('Queue item not found');
    }

    if (item.status !== 'failed') {
      throw new Error('Can only retry failed items');
    }

    if (item.retry_count >= item.max_retries) {
      throw new Error('Max retries exceeded');
    }

    return this.updateStatus(id, 'pending', {
      retry_count: item.retry_count + 1,
      error_message: undefined,
    });
  }

  /**
   * Cancel pending or researching items
   */
  async cancel(id: string): Promise<QueueItem> {
    const item = await this.getById(id);
    if (!item) {
      throw new Error('Queue item not found');
    }

    if (!['pending', 'researching'].includes(item.status)) {
      throw new Error('Can only cancel pending or researching items');
    }

    return this.updateStatus(id, 'cancelled');
  }

  /**
   * Cancel all pending items in a batch
   */
  async cancelBatch(batchId: string): Promise<number> {
    const { data, error } = await this.supabase
      .from('research_queue')
      .update({ status: 'cancelled' })
      .eq('organization_id', this.organizationId)
      .eq('batch_id', batchId)
      .in('status', ['pending', 'researching'])
      .select('id');

    if (error) {
      throw new Error(`Failed to cancel batch: ${error.message}`);
    }

    return data?.length || 0;
  }
}

// Factory function for easier usage
export function createQueueService(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): QueueService {
  return new QueueService({ supabase, organizationId, userId });
}
