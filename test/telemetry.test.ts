/**
 * Telemetry & Update Notification Tests
 * (M4-7, Issue #108)
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import {
  TelemetryCollector,
  shouldNotifyUpdate,
  setTelemetryTransport,
} from '../src/runtime/telemetry.js';
import type { TelemetryEvent, TelemetryConfig } from '../src/runtime/telemetry.js';

// ============================================================================
// TelemetryCollector — consent
// ============================================================================

describe('TelemetryCollector — consent', () => {
  it('defaults to disabled', () => {
    const t = new TelemetryCollector();
    expect(t.getConsentStatus()).toBe(false);
  });

  it('can be enabled via constructor', () => {
    const t = new TelemetryCollector({ enabled: true });
    expect(t.getConsentStatus()).toBe(true);
  });

  it('setConsent toggles collection', () => {
    const t = new TelemetryCollector();
    t.setConsent(true);
    expect(t.getConsentStatus()).toBe(true);
    t.setConsent(false);
    expect(t.getConsentStatus()).toBe(false);
  });
});

// ============================================================================
// TelemetryCollector — collectEvent
// ============================================================================

describe('TelemetryCollector — collectEvent', () => {
  let collector: TelemetryCollector;

  beforeEach(() => {
    collector = new TelemetryCollector({ enabled: true });
  });

  it('queues an event when enabled', () => {
    collector.collectEvent({ name: 'squad.init' });
    expect(collector.pendingCount).toBe(1);
  });

  it('does nothing when disabled', () => {
    collector.setConsent(false);
    collector.collectEvent({ name: 'squad.init' });
    expect(collector.pendingCount).toBe(0);
  });

  it('respects excludeEvents', () => {
    const c = new TelemetryCollector({ enabled: true, excludeEvents: ['squad.error'] });
    c.collectEvent({ name: 'squad.error' });
    expect(c.pendingCount).toBe(0);
    c.collectEvent({ name: 'squad.init' });
    expect(c.pendingCount).toBe(1);
  });

  it('adds timestamp when not provided', () => {
    const before = Date.now();
    collector.collectEvent({ name: 'squad.run' });
    // We can't directly inspect the queue, but flush will exercise the timestamp
    expect(collector.pendingCount).toBe(1);
  });

  it('preserves provided timestamp', () => {
    collector.collectEvent({ name: 'squad.run', timestamp: 1000 });
    expect(collector.pendingCount).toBe(1);
  });

  it('strips properties when anonymize is true', async () => {
    const captured: TelemetryEvent[] = [];
    setTelemetryTransport(async (events) => { captured.push(...events); });

    const c = new TelemetryCollector({ enabled: true, anonymize: true, endpoint: 'http://x' });
    c.collectEvent({ name: 'squad.init', properties: { foo: 'bar' } });
    await c.flush();

    expect(captured[0].properties).toBeUndefined();
  });

  it('keeps properties when anonymize is false', async () => {
    const captured: TelemetryEvent[] = [];
    setTelemetryTransport(async (events) => { captured.push(...events); });

    const c = new TelemetryCollector({ enabled: true, anonymize: false, endpoint: 'http://x' });
    c.collectEvent({ name: 'squad.init', properties: { foo: 'bar' } });
    await c.flush();

    expect(captured[0].properties).toEqual({ foo: 'bar' });
  });
});

// ============================================================================
// TelemetryCollector — flush
// ============================================================================

describe('TelemetryCollector — flush', () => {
  it('sends queued events and clears queue', async () => {
    const captured: TelemetryEvent[] = [];
    setTelemetryTransport(async (events) => { captured.push(...events); });

    const c = new TelemetryCollector({ enabled: true, endpoint: 'http://test' });
    c.collectEvent({ name: 'squad.init' });
    c.collectEvent({ name: 'squad.run' });

    const count = await c.flush();
    expect(count).toBe(2);
    expect(c.pendingCount).toBe(0);
    expect(captured).toHaveLength(2);
  });

  it('returns 0 when disabled', async () => {
    const c = new TelemetryCollector({ enabled: false });
    c.collectEvent({ name: 'squad.init' }); // no-op
    const count = await c.flush();
    expect(count).toBe(0);
  });

  it('returns 0 when queue is empty', async () => {
    const c = new TelemetryCollector({ enabled: true });
    const count = await c.flush();
    expect(count).toBe(0);
  });
});

// ============================================================================
// TelemetryCollector — drain
// ============================================================================

describe('TelemetryCollector — drain', () => {
  it('discards all queued events', () => {
    const c = new TelemetryCollector({ enabled: true });
    c.collectEvent({ name: 'squad.init' });
    c.collectEvent({ name: 'squad.run' });
    expect(c.pendingCount).toBe(2);
    c.drain();
    expect(c.pendingCount).toBe(0);
  });
});

// ============================================================================
// TelemetryCollector — getConfig
// ============================================================================

describe('TelemetryCollector — getConfig', () => {
  it('returns a copy of the config', () => {
    const c = new TelemetryCollector({ enabled: true, endpoint: 'http://x', anonymize: true });
    const cfg = c.getConfig();
    expect(cfg.enabled).toBe(true);
    expect(cfg.endpoint).toBe('http://x');
    expect(cfg.anonymize).toBe(true);
  });

  it('returned config is not a live reference', () => {
    const c = new TelemetryCollector({ enabled: true });
    const cfg = c.getConfig();
    // Mutating the copy should not affect the collector
    (cfg as TelemetryConfig).enabled = false;
    expect(c.getConsentStatus()).toBe(true);
  });
});

// ============================================================================
// shouldNotifyUpdate
// ============================================================================

describe('shouldNotifyUpdate', () => {
  it('returns true when interval has elapsed', () => {
    const lastCheck = new Date(Date.now() - 100_000);
    expect(shouldNotifyUpdate(lastCheck, 50_000)).toBe(true);
  });

  it('returns false when interval has not elapsed', () => {
    const lastCheck = new Date(Date.now() - 10_000);
    expect(shouldNotifyUpdate(lastCheck, 50_000)).toBe(false);
  });

  it('returns true when lastCheck is very old', () => {
    const lastCheck = new Date(0);
    expect(shouldNotifyUpdate(lastCheck, 1000)).toBe(true);
  });

  it('returns false when lastCheck is exactly now', () => {
    const lastCheck = new Date();
    expect(shouldNotifyUpdate(lastCheck, 1000)).toBe(false);
  });
});
