/**
 * Strangrz Realtime Optimizer — Connection health, batching, reconnection
 *
 * Features:
 * - Exponential backoff reconnection
 * - Heartbeat monitoring
 * - Event batching (debounce rapid-fire events)
 * - Connection health status
 */

// ─── Types ────────────────────────────────────────────────

export type ConnectionHealth = 'connected' | 'reconnecting' | 'disconnected' | 'degraded';

interface ConnectionState {
  health: ConnectionHealth;
  lastHeartbeat: number;
  reconnectAttempts: number;
  lastEvent: number;
  eventsPerMinute: number;
}

// ─── Exponential Backoff ──────────────────────────────────

const MIN_DELAY_MS = 1000;
const MAX_DELAY_MS = 30_000;
const BACKOFF_FACTOR = 2;
const JITTER_MAX = 1000;

/** Calculate reconnection delay with exponential backoff + jitter */
export function getReconnectDelay(attempt: number): number {
  const delay = Math.min(MIN_DELAY_MS * Math.pow(BACKOFF_FACTOR, attempt), MAX_DELAY_MS);
  const jitter = Math.random() * JITTER_MAX;
  return Math.round(delay + jitter);
}

// ─── Heartbeat Monitor ───────────────────────────────────

const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 60_000;

export class HeartbeatMonitor {
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private lastPong = Date.now();
  private onDegraded: (() => void) | null = null;

  constructor(onDegraded?: () => void) {
    this.onDegraded = onDegraded || null;
  }

  start(): void {
    this.lastPong = Date.now();
    this.intervalId = setInterval(() => {
      const elapsed = Date.now() - this.lastPong;
      if (elapsed > HEARTBEAT_TIMEOUT_MS && this.onDegraded) {
        this.onDegraded();
      }
    }, HEARTBEAT_INTERVAL_MS);
  }

  receivePong(): void {
    this.lastPong = Date.now();
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  getHealth(): ConnectionHealth {
    const elapsed = Date.now() - this.lastPong;
    if (elapsed < HEARTBEAT_INTERVAL_MS) return 'connected';
    if (elapsed < HEARTBEAT_TIMEOUT_MS) return 'degraded';
    return 'disconnected';
  }
}

// ─── Event Batcher ────────────────────────────────────────

/**
 * Batches rapid-fire events into a single callback.
 * Useful for reducing re-renders when many wart updates arrive at once.
 */
export class EventBatcher<T> {
  private queue: T[] = [];
  private timeoutId: ReturnType<typeof setTimeout> | null = null;
  private readonly debounceMs: number;
  private readonly maxBatchSize: number;
  private readonly handler: (batch: T[]) => void;

  constructor(handler: (batch: T[]) => void, debounceMs = 200, maxBatchSize = 50) {
    this.handler = handler;
    this.debounceMs = debounceMs;
    this.maxBatchSize = maxBatchSize;
  }

  add(event: T): void {
    this.queue.push(event);

    // Flush immediately if batch is full
    if (this.queue.length >= this.maxBatchSize) {
      this.flush();
      return;
    }

    // Debounce: reset timer on each new event
    if (this.timeoutId) clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => this.flush(), this.debounceMs);
  }

  flush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    if (this.queue.length === 0) return;

    const batch = [...this.queue];
    this.queue = [];
    this.handler(batch);
  }

  clear(): void {
    this.queue = [];
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  get pending(): number {
    return this.queue.length;
  }
}

// ─── Connection State Tracker ─────────────────────────────

export class ConnectionTracker {
  private state: ConnectionState = {
    health: 'disconnected',
    lastHeartbeat: 0,
    reconnectAttempts: 0,
    lastEvent: 0,
    eventsPerMinute: 0,
  };

  private eventTimestamps: number[] = [];
  private listeners = new Set<(state: ConnectionState) => void>();

  subscribe(fn: (state: ConnectionState) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  private emit(): void {
    this.listeners.forEach(fn => fn({ ...this.state }));
  }

  setHealth(health: ConnectionHealth): void {
    this.state.health = health;
    if (health === 'connected') this.state.reconnectAttempts = 0;
    this.emit();
  }

  recordEvent(): void {
    const now = Date.now();
    this.state.lastEvent = now;
    this.eventTimestamps.push(now);

    // Keep only last 60 seconds of timestamps
    const cutoff = now - 60_000;
    this.eventTimestamps = this.eventTimestamps.filter(t => t > cutoff);
    this.state.eventsPerMinute = this.eventTimestamps.length;
  }

  recordReconnectAttempt(): void {
    this.state.reconnectAttempts++;
    this.state.health = 'reconnecting';
    this.emit();
  }

  getState(): ConnectionState {
    return { ...this.state };
  }
}
