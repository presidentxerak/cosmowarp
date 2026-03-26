import { describe, it, expect } from 'vitest';
import {
  getReconnectDelay, HeartbeatMonitor, EventBatcher, ConnectionTracker,
} from './realtime-optimizer';

describe('Realtime Optimizer', () => {
  describe('getReconnectDelay', () => {
    it('increases with each attempt', () => {
      const d0 = getReconnectDelay(0);
      const d1 = getReconnectDelay(1);
      const d2 = getReconnectDelay(2);
      // Account for jitter
      expect(d1).toBeGreaterThan(d0 - 1000);
      expect(d2).toBeGreaterThan(d1 - 1000);
    });

    it('caps at max delay', () => {
      const d = getReconnectDelay(100);
      expect(d).toBeLessThanOrEqual(31_000); // MAX_DELAY + JITTER
    });
  });

  describe('HeartbeatMonitor', () => {
    it('starts as connected', () => {
      const monitor = new HeartbeatMonitor();
      monitor.receivePong();
      expect(monitor.getHealth()).toBe('connected');
      monitor.stop();
    });
  });

  describe('EventBatcher', () => {
    it('batches events after debounce', async () => {
      const batches: number[][] = [];
      const batcher = new EventBatcher<number>((batch) => batches.push(batch), 50);

      batcher.add(1);
      batcher.add(2);
      batcher.add(3);

      expect(batches).toHaveLength(0); // not flushed yet

      // Wait for debounce
      await new Promise(r => setTimeout(r, 100));
      expect(batches).toHaveLength(1);
      expect(batches[0]).toEqual([1, 2, 3]);

      batcher.clear();
    });

    it('flushes immediately at max batch size', () => {
      const batches: number[][] = [];
      const batcher = new EventBatcher<number>((batch) => batches.push(batch), 5000, 3);

      batcher.add(1);
      batcher.add(2);
      batcher.add(3); // hits maxBatchSize

      expect(batches).toHaveLength(1);
      expect(batches[0]).toEqual([1, 2, 3]);

      batcher.clear();
    });

    it('tracks pending count', () => {
      const batcher = new EventBatcher<string>(() => {}, 5000);
      expect(batcher.pending).toBe(0);
      batcher.add('a');
      batcher.add('b');
      expect(batcher.pending).toBe(2);
      batcher.flush();
      expect(batcher.pending).toBe(0);
    });
  });

  describe('ConnectionTracker', () => {
    it('tracks health state', () => {
      const tracker = new ConnectionTracker();
      expect(tracker.getState().health).toBe('disconnected');

      tracker.setHealth('connected');
      expect(tracker.getState().health).toBe('connected');
    });

    it('tracks events per minute', () => {
      const tracker = new ConnectionTracker();
      tracker.recordEvent();
      tracker.recordEvent();
      tracker.recordEvent();
      expect(tracker.getState().eventsPerMinute).toBe(3);
    });

    it('resets reconnect attempts on connected', () => {
      const tracker = new ConnectionTracker();
      tracker.recordReconnectAttempt();
      tracker.recordReconnectAttempt();
      expect(tracker.getState().reconnectAttempts).toBe(2);

      tracker.setHealth('connected');
      expect(tracker.getState().reconnectAttempts).toBe(0);
    });

    it('notifies subscribers', () => {
      const tracker = new ConnectionTracker();
      const states: string[] = [];
      tracker.subscribe(s => states.push(s.health));

      tracker.setHealth('connected');
      tracker.setHealth('degraded');
      expect(states).toEqual(['connected', 'degraded']);
    });
  });
});
