import { SyncQueueItem } from "@shared/schema";

export class SyncQueueCloud {
  private queue: Map<string, SyncQueueItem> = new Map();
  private readonly MAX_ATTEMPTS = 5;
  private readonly RETRY_DELAY_MS = 1000;

  async add(item: SyncQueueItem): Promise<SyncQueueItem> {
    this.queue.set(item.id, item);
    console.log('[SyncQueueCloud] Added item to queue:', item.id, item.payload.type);
    return item;
  }

  async getPending(userId: string): Promise<SyncQueueItem[]> {
    return Array.from(this.queue.values())
      .filter(item => 
        item.userId === userId && 
        item.status === 'pending' &&
        item.attempts < this.MAX_ATTEMPTS
      )
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  async markSyncing(id: string): Promise<SyncQueueItem | null> {
    const item = this.queue.get(id);
    if (!item) {
      return null;
    }

    const updated: SyncQueueItem = {
      ...item,
      status: 'syncing',
      attempts: item.attempts + 1,
    };

    this.queue.set(id, updated);
    return updated;
  }

  async markCompleted(id: string): Promise<SyncQueueItem | null> {
    const item = this.queue.get(id);
    if (!item) {
      return null;
    }

    const updated: SyncQueueItem = {
      ...item,
      status: 'completed',
    };

    this.queue.set(id, updated);
    console.log('[SyncQueueCloud] Item completed:', id);
    return updated;
  }

  async markFailed(id: string, error: string): Promise<SyncQueueItem | null> {
    const item = this.queue.get(id);
    if (!item) {
      return null;
    }

    const updated: SyncQueueItem = {
      ...item,
      status: item.attempts >= this.MAX_ATTEMPTS ? 'failed' : 'pending',
      lastError: error,
    };

    this.queue.set(id, updated);
    
    if (updated.status === 'failed') {
      console.error('[SyncQueueCloud] Item permanently failed after', this.MAX_ATTEMPTS, 'attempts:', id);
    } else {
      console.warn('[SyncQueueCloud] Item retry scheduled (attempt', item.attempts + 1, '):', id);
    }
    
    return updated;
  }

  async cleanupCompleted(userId: string, olderThan: number): Promise<number> {
    const toDelete: string[] = [];
    
    for (const [id, item] of Array.from(this.queue.entries())) {
      if (item.userId === userId && 
          item.status === 'completed' &&
          item.timestamp < olderThan) {
        toDelete.push(id);
      }
    }

    toDelete.forEach(id => this.queue.delete(id));
    
    if (toDelete.length > 0) {
      console.log('[SyncQueueCloud] Cleaned up', toDelete.length, 'completed items for user:', userId);
    }
    
    return toDelete.length;
  }

  async getStats(userId: string): Promise<{
    pending: number;
    syncing: number;
    completed: number;
    failed: number;
  }> {
    const userItems = Array.from(this.queue.values())
      .filter(item => item.userId === userId);

    return {
      pending: userItems.filter(i => i.status === 'pending').length,
      syncing: userItems.filter(i => i.status === 'syncing').length,
      completed: userItems.filter(i => i.status === 'completed').length,
      failed: userItems.filter(i => i.status === 'failed').length,
    };
  }
}
