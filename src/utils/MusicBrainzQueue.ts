import { type MusicbrainzMeta } from "../models/MusicbrainzMeta.ts";

export interface QueueItem<T> {
  id: string;
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  retryCount: number;
  maxRetries: number;
  priority: number;
  description: string;
}

export interface QueueStats {
  queued: number;
  inFlight: number;
  completed: number;
  failed: number;
  retrying: number;
  total: number;
}

export type QueueStatus =
  | { type: 'idle'; stats: QueueStats }
  | { type: 'running'; stats: QueueStats }
  | { type: 'completed'; stats: QueueStats }
  | { type: 'error'; stats: QueueStats; errors: Array<{ item: string; error: string }> };

export class MusicBrainzQueue {
  private queue: QueueItem<any>[] = [];
  private inFlight = 0;
  private maxConcurrent = 2;
  private processing = false;
  private completed = 0;
  private failed = 0;
  private retrying = 0;
  private total = 0;
  private errors: Array<{ item: string; error: string }> = [];
  private statusListeners: ((status: QueueStatus) => void)[] = [];
  private idCounter = 0;

  constructor(maxConcurrent = 2) {
    this.maxConcurrent = maxConcurrent;
  }

  onStatusChange(listener: (status: QueueStatus) => void): () => void {
    this.statusListeners.push(listener);
    return () => {
      const index = this.statusListeners.indexOf(listener);
      if (index > -1) {
        this.statusListeners.splice(index, 1);
      }
    };
  }

  private notifyStatusChange() {
    const status = this.getStatus();
    this.statusListeners.forEach(listener => {
      try {
        listener(status);
      } catch (e) {
        console.error('Queue status listener error:', e);
      }
    });
  }

  getStatus(): QueueStatus {
    const stats: QueueStats = {
      queued: this.queue.length,
      inFlight: this.inFlight,
      completed: this.completed,
      failed: this.failed,
      retrying: this.retrying,
      total: this.total
    };

    if (this.processing) {
      return { type: 'running', stats };
    } else if (this.failed > 0 && this.queue.length === 0 && this.inFlight === 0) {
      return { type: 'error', stats, errors: this.errors };
    } else if (this.completed > 0 && this.queue.length === 0 && this.inFlight === 0) {
      return { type: 'completed', stats };
    } else {
      return { type: 'idle', stats };
    }
  }

  async enqueue<T>(
    execute: () => Promise<T>,
    options?: {
      maxRetries?: number;
      priority?: number;
      description?: string;
    }
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      const id = `${++this.idCounter}-${Date.now()}`;
      const item: QueueItem<T> = {
        id,
        execute,
        resolve,
        reject,
        retryCount: 0,
        maxRetries: options?.maxRetries ?? 3,
        priority: options?.priority ?? 0,
        description: options?.description ?? id
      };

      this.queue.push(item);
      this.total++;
      
      // Sort by priority (higher priority first)
      this.queue.sort((a, b) => b.priority - a.priority);
      
      this.notifyStatusChange();
      this.processQueue();
    });
  }

  clear(): void {
    // Reject all pending items
    this.queue.forEach(item => {
      item.reject(new Error('Queue cleared'));
    });
    this.queue = [];
    this.completed = 0;
    this.failed = 0;
    this.retrying = 0;
    this.total = 0;
    this.errors = [];
    this.processing = false;
    this.notifyStatusChange();
  }

  private async processQueue(): Promise<void> {
    if (this.processing) return;
    if (this.queue.length === 0 && this.inFlight === 0) {
      this.notifyStatusChange();
      return;
    }

    this.processing = true;
    this.notifyStatusChange();

    while (this.queue.length > 0 || this.inFlight > 0) {
      // Start new requests up to maxConcurrent
      while (this.queue.length > 0 && this.inFlight < this.maxConcurrent) {
        const item = this.queue.shift()!;
        this.inFlight++;
        this.notifyStatusChange();
        
        // Process item asynchronously
        this.processItem(item).finally(() => {
          this.inFlight--;
          this.notifyStatusChange();
        });
      }

      // Wait a bit before checking again
      await this.delay(50);
    }

    this.processing = false;
    this.notifyStatusChange();
  }

  private async processItem<T>(item: QueueItem<T>): Promise<void> {
    try {
      const result = await item.execute();
      item.resolve(result);
      this.completed++;
      this.retrying = Math.max(0, this.retrying - 1);
    } catch (error: any) {
      const shouldRetry = this.shouldRetry(error, item);
      
      if (shouldRetry && item.retryCount < item.maxRetries) {
        // Requeue at the end with backoff
        item.retryCount++;
        this.retrying++;
        
        const backoffDelay = this.calculateBackoff(item.retryCount);
        console.log(`[Queue] Rate limited for "${item.description}". Retrying in ${backoffDelay}ms (attempt ${item.retryCount}/${item.maxRetries})`);
        
        await this.delay(backoffDelay);
        
        // Add back to queue with lower priority
        this.queue.push(item);
        this.retrying = Math.max(0, this.retrying - 1);
        this.notifyStatusChange();
      } else {
        // Max retries reached or non-retryable error
        item.reject(error);
        this.failed++;
        this.errors.push({
          item: item.description,
          error: error?.message || String(error)
        });
        this.retrying = Math.max(0, this.retrying - 1);
      }
    }
  }

  private shouldRetry(error: any, item: QueueItem<any>): boolean {
    // Check for rate limit (429)
    if (error?.status === 429) {
      return true;
    }
    
    // Check for service unavailable (503)
    if (error?.status === 503) {
      return true;
    }
    
    // Check for network errors
    if (error?.name === 'TypeError' || error?.name === 'NetworkError') {
      return true;
    }
    
    // Check for timeout
    if (error?.name === 'AbortError' || error?.code === 'ETIMEDOUT') {
      return true;
    }
    
    return false;
  }

  private calculateBackoff(retryCount: number): number {
    // Exponential backoff: 1s, 2s, 4s, 8s, max 30s
    const baseDelay = 1000;
    const exponentialDelay = baseDelay * Math.pow(2, retryCount - 1);
    const maxDelay = 30000;
    
    // Add some jitter to prevent thundering herd
    const jitter = Math.random() * 500;
    
    return Math.min(exponentialDelay, maxDelay) + jitter;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
