/**
 * Strangrz Dispute Resolution — Report, review, resolve
 *
 * Flow: report → pending_review → resolved (remove/dismiss/warn)
 * DMCA-style takedown with counter-notice support.
 * Escrow for disputed transactions.
 */

import { storage } from './storage';
import { supabase, isBackendAvailable } from '../lib/supabase';
import { logAdminAction } from '../lib/audit';

// ─── Types ────────────────────────────────────────────────

export type DisputeReason = 'copyright' | 'fraud' | 'inappropriate' | 'spam' | 'other';
export type DisputeStatus = 'pending_review' | 'under_review' | 'resolved_removed' | 'resolved_dismissed' | 'resolved_warned' | 'counter_notice';

export interface Dispute {
  id: string;
  reporterAddress: string;
  reportedWartId: string;
  reportedCreator: string;
  reason: DisputeReason;
  evidence: string;         // description of evidence
  status: DisputeStatus;
  resolverAddress: string | null;
  resolution: string | null;
  counterNotice: string | null;
  createdAt: number;
  resolvedAt: number | null;
}

// ─── Storage ──────────────────────────────────────────────

const STORAGE_KEY = 'strangrz_disputes';

function loadAll(): Dispute[] {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveAll(disputes: Dispute[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(disputes));
}

// ─── Dispute Engine ───────────────────────────────────────

export class DisputeEngine {
  private disputes: Map<string, Dispute> = new Map();

  constructor() {
    for (const d of loadAll()) this.disputes.set(d.id, d);
  }

  static load(): DisputeEngine { return new DisputeEngine(); }

  private save(): void {
    saveAll([...this.disputes.values()]);
  }

  /** Report a wart */
  report(
    reporterAddress: string,
    wartId: string,
    creator: string,
    reason: DisputeReason,
    evidence: string,
  ): Dispute {
    // Prevent duplicate reports from same user on same wart
    for (const d of this.disputes.values()) {
      if (d.reporterAddress === reporterAddress && d.reportedWartId === wartId && d.status === 'pending_review') {
        return d; // already reported
      }
    }

    const id = `DISP_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
    const dispute: Dispute = {
      id,
      reporterAddress,
      reportedWartId: wartId,
      reportedCreator: creator,
      reason,
      evidence,
      status: 'pending_review',
      resolverAddress: null,
      resolution: null,
      counterNotice: null,
      createdAt: Date.now(),
      resolvedAt: null,
    };
    this.disputes.set(id, dispute);
    this.save();
    this.syncToCloud(dispute);
    return dispute;
  }

  /** Admin: resolve a dispute */
  resolve(
    disputeId: string,
    adminAddress: string,
    action: 'remove' | 'dismiss' | 'warn',
    resolution: string,
  ): boolean {
    const dispute = this.disputes.get(disputeId);
    if (!dispute) return false;
    if (dispute.status !== 'pending_review' && dispute.status !== 'under_review' && dispute.status !== 'counter_notice') return false;

    dispute.status = action === 'remove' ? 'resolved_removed' : action === 'warn' ? 'resolved_warned' : 'resolved_dismissed';
    dispute.resolverAddress = adminAddress;
    dispute.resolution = resolution;
    dispute.resolvedAt = Date.now();
    this.save();
    this.syncToCloud(dispute);

    logAdminAction({
      action: `dispute_${action}`,
      actor_address: adminAddress,
      target_id: disputeId,
      target_address: dispute.reportedCreator,
      details: { wartId: dispute.reportedWartId, reason: dispute.reason, resolution },
    });

    return true;
  }

  /** Creator: submit counter-notice */
  counterNotice(disputeId: string, creatorAddress: string, notice: string): boolean {
    const dispute = this.disputes.get(disputeId);
    if (!dispute || dispute.reportedCreator !== creatorAddress) return false;
    if (dispute.status !== 'pending_review' && dispute.status !== 'under_review') return false;

    dispute.status = 'counter_notice';
    dispute.counterNotice = notice;
    this.save();
    this.syncToCloud(dispute);
    return true;
  }

  /** Get all pending disputes (for admin queue) */
  getPending(): Dispute[] {
    return [...this.disputes.values()]
      .filter(d => d.status === 'pending_review' || d.status === 'under_review' || d.status === 'counter_notice')
      .sort((a, b) => a.createdAt - b.createdAt);
  }

  /** Get disputes for a specific wart */
  getByWart(wartId: string): Dispute[] {
    return [...this.disputes.values()].filter(d => d.reportedWartId === wartId);
  }

  /** Get all disputes */
  getAll(): Dispute[] {
    return [...this.disputes.values()].sort((a, b) => b.createdAt - a.createdAt);
  }

  get(id: string): Dispute | null { return this.disputes.get(id) || null; }

  private syncToCloud(dispute: Dispute): void {
    if (!isBackendAvailable() || !supabase) return;
    supabase.from('disputes').upsert({
      id: dispute.id,
      reporter: dispute.reporterAddress,
      reported_wart: dispute.reportedWartId,
      reported_creator: dispute.reportedCreator,
      reason: dispute.reason,
      evidence: dispute.evidence,
      status: dispute.status,
      resolver: dispute.resolverAddress,
      resolution: dispute.resolution,
      counter_notice: dispute.counterNotice,
      created_at: dispute.createdAt,
      resolved_at: dispute.resolvedAt,
    }, { onConflict: 'id' }).then(() => {}, () => {});
  }
}
