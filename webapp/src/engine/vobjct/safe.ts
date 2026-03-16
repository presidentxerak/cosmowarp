/**
 * Strangrz Safe — Active Preservation & Repair Engine
 *
 * State machine for health monitoring, storage continuity checks,
 * route degradation detection, and authorized repair actions.
 *
 * CRITICAL RULE: Strangrz Safe NEVER alters the canonical asset.
 * It may only restore/reinforce recoverability routes, mirrors,
 * validation states, and storage continuity according to policy.
 */

// crypto used for future integrity checks
import { storage } from '../storage';
import type { StrangrzManifest, StorageRoute, RecoveryRoute } from './schema';

// ─── Safe Health States ─────────────────────────────────────

export type SafeHealthState =
  | 'healthy'
  | 'warning'
  | 'degraded'
  | 'repairing'
  | 'recovered'
  | 'unavailable'
  | 'policy_blocked';

export type SafeMode = 'active' | 'passive' | 'disabled';

// ─── Safe Config ────────────────────────────────────────────

export interface StrangrzSafeConfig {
  safe_version: '1.0.0';
  mode: SafeMode;
  health_status: SafeHealthState;
  min_available_routes: number;
  check_interval_hours: number;
  repair_threshold: {
    failed_checks_required: number;
    critical_route_loss: boolean;
  };
  allowed_actions: RepairAction[];
  forbidden_actions: string[];
  repair_authority: {
    type: 'single' | 'multisig' | 'creator_only';
    threshold?: string;
    members: string[];
  };
  funding: {
    model: 'project_treasury' | 'mint_reserve' | 'royalty_reserve' | 'subscription' | 'sponsor';
    budget_status: 'funded' | 'limited' | 'exhausted';
  };
  incident_log: IncidentLogEntry[];
  recovery_routes: RecoveryRoute[];
}

export type RepairAction =
  | 'repin_ipfs'
  | 'add_https_mirror'
  | 'reannounce_route'
  | 'revalidate_manifest'
  | 'trigger_mirror_replication'
  | 'restore_from_vault'
  | 'restore_from_onchain';

export const FORBIDDEN_ACTIONS = [
  'modify_canonical_asset',
  'replace_canonical_asset_hash',
  'rewrite_rights',
  'change_token_binding',
  'mutate_policy_without_auth',
] as const;

// ─── Incident Log ───────────────────────────────────────────

export interface IncidentLogEntry {
  id: string;
  timestamp: string;
  type: 'check' | 'warning' | 'degradation' | 'repair_start' | 'repair_success' | 'repair_failure' | 'policy_block';
  description: string;
  route_network?: string;
  route_locator?: string;
  action_taken?: RepairAction;
  previous_state: SafeHealthState;
  new_state: SafeHealthState;
}

// ─── Route Check Result ─────────────────────────────────────

export interface RouteCheckResult {
  route: StorageRoute;
  available: boolean;
  response_time_ms?: number;
  error?: string;
  checked_at: string;
}

// ─── State Machine ──────────────────────────────────────────

const VALID_TRANSITIONS: Record<SafeHealthState, SafeHealthState[]> = {
  healthy:        ['warning'],
  warning:        ['healthy', 'degraded'],
  degraded:       ['repairing', 'unavailable'],
  repairing:      ['recovered', 'policy_blocked', 'degraded'],
  recovered:      ['healthy', 'warning'],
  unavailable:    ['repairing', 'degraded'],
  policy_blocked: ['degraded', 'unavailable'],
};

export function canTransition(from: SafeHealthState, to: SafeHealthState): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

export function transition(
  config: StrangrzSafeConfig,
  newState: SafeHealthState,
  description: string,
  action?: RepairAction,
): StrangrzSafeConfig {
  if (!canTransition(config.health_status, newState)) {
    // Log the blocked transition
    config.incident_log.push({
      id: generateIncidentId(),
      timestamp: new Date().toISOString(),
      type: 'policy_block',
      description: `Blocked transition ${config.health_status} -> ${newState}: ${description}`,
      previous_state: config.health_status,
      new_state: config.health_status,
    });
    return config;
  }

  const logType = newState === 'repairing' ? 'repair_start' :
    newState === 'recovered' ? 'repair_success' :
    newState === 'warning' ? 'warning' :
    newState === 'degraded' ? 'degradation' :
    'check';

  config.incident_log.push({
    id: generateIncidentId(),
    timestamp: new Date().toISOString(),
    type: logType,
    description,
    action_taken: action,
    previous_state: config.health_status,
    new_state: newState,
  });

  config.health_status = newState;
  return config;
}

// ─── Health Evaluation ──────────────────────────────────────

export interface HealthEvaluation {
  state: SafeHealthState;
  active_routes: number;
  total_routes: number;
  failed_routes: StorageRoute[];
  warnings: string[];
  needs_repair: boolean;
  repair_actions: RepairAction[];
}

export function evaluateHealth(
  _manifest: StrangrzManifest,
  safeConfig: StrangrzSafeConfig,
  routeChecks: RouteCheckResult[],
): HealthEvaluation {
  const activeRoutes = routeChecks.filter(r => r.available);
  const failedRoutes = routeChecks.filter(r => !r.available);
  const warnings: string[] = [];
  const repairActions: RepairAction[] = [];

  let state: SafeHealthState = 'healthy';

  // Check minimum route availability
  if (activeRoutes.length < safeConfig.min_available_routes) {
    if (activeRoutes.length === 0) {
      state = 'unavailable';
      warnings.push('All storage routes unavailable');
    } else {
      state = 'degraded';
      warnings.push(`Only ${activeRoutes.length}/${routeChecks.length} routes available (minimum: ${safeConfig.min_available_routes})`);
    }
  } else if (failedRoutes.length > 0) {
    state = 'warning';
    warnings.push(`${failedRoutes.length} storage route(s) degraded`);
  }

  // Determine repair actions for failed routes
  for (const failed of failedRoutes) {
    if (failed.route.network === 'ipfs' && safeConfig.allowed_actions.includes('repin_ipfs')) {
      repairActions.push('repin_ipfs');
    }
    if (failed.route.network === 'https' && safeConfig.allowed_actions.includes('add_https_mirror')) {
      repairActions.push('add_https_mirror');
    }
    if (safeConfig.allowed_actions.includes('reannounce_route')) {
      repairActions.push('reannounce_route');
    }
  }

  // Check funding
  if (safeConfig.funding.budget_status === 'exhausted') {
    warnings.push('Repair budget exhausted — automated repairs disabled');
    if (state === 'degraded') state = 'policy_blocked';
  }

  const needsRepair = state === 'degraded' || state === 'unavailable';

  return {
    state,
    active_routes: activeRoutes.length,
    total_routes: routeChecks.length,
    failed_routes: failedRoutes.map(r => r.route),
    warnings,
    needs_repair: needsRepair,
    repair_actions: [...new Set(repairActions)],
  };
}

// ─── Safe Engine ────────────────────────────────────────────

const SAFE_STORAGE_KEY = 'strangrz_vobjct_safe';

export class StrangrzSafeEngine {
  private configs: Map<string, StrangrzSafeConfig> = new Map();

  constructor() {
    this.load();
  }

  private load(): void {
    const raw = storage.getItem(SAFE_STORAGE_KEY);
    if (!raw) return;
    try {
      const data: Record<string, StrangrzSafeConfig> = JSON.parse(raw);
      for (const [id, config] of Object.entries(data)) {
        this.configs.set(id, config);
      }
    } catch { /* corrupt */ }
  }

  private save(): void {
    const data: Record<string, StrangrzSafeConfig> = {};
    for (const [id, config] of this.configs) {
      data[id] = config;
    }
    storage.setItem(SAFE_STORAGE_KEY, JSON.stringify(data));
  }

  /**
   * Create a Safe config for a Strangrz.
   */
  createSafe(objectId: string, creatorAddress: string): StrangrzSafeConfig {
    const config: StrangrzSafeConfig = {
      safe_version: '1.0.0',
      mode: 'active',
      health_status: 'healthy',
      min_available_routes: 2,
      check_interval_hours: 24,
      repair_threshold: {
        failed_checks_required: 2,
        critical_route_loss: true,
      },
      allowed_actions: [
        'repin_ipfs',
        'add_https_mirror',
        'reannounce_route',
        'revalidate_manifest',
        'restore_from_vault',
        'restore_from_onchain',
      ],
      forbidden_actions: [...FORBIDDEN_ACTIONS],
      repair_authority: {
        type: 'creator_only',
        members: [creatorAddress],
      },
      funding: {
        model: 'project_treasury',
        budget_status: 'funded',
      },
      incident_log: [],
      recovery_routes: [],
    };

    this.configs.set(objectId, config);
    this.save();
    return config;
  }

  getSafe(objectId: string): StrangrzSafeConfig | null {
    return this.configs.get(objectId) || null;
  }

  /**
   * Run health check for a Strangrz.
   */
  async runHealthCheck(
    objectId: string,
    manifest: StrangrzManifest,
    routeChecks: RouteCheckResult[],
  ): Promise<HealthEvaluation | null> {
    const config = this.configs.get(objectId);
    if (!config || config.mode === 'disabled') return null;

    const evaluation = evaluateHealth(manifest, config, routeChecks);

    // Transition state based on evaluation
    if (evaluation.state !== config.health_status) {
      transition(
        config,
        evaluation.state,
        `Health check: ${evaluation.warnings.join('; ') || 'All routes active'}`,
      );
    } else {
      // Log the check even if no state change
      config.incident_log.push({
        id: generateIncidentId(),
        timestamp: new Date().toISOString(),
        type: 'check',
        description: `Routine check: ${evaluation.active_routes}/${evaluation.total_routes} routes active`,
        previous_state: config.health_status,
        new_state: config.health_status,
      });
    }

    this.save();
    return evaluation;
  }

  /**
   * Execute a repair action.
   */
  executeRepair(
    objectId: string,
    action: RepairAction,
    description: string,
    success: boolean,
  ): boolean {
    const config = this.configs.get(objectId);
    if (!config) return false;

    // Check if action is allowed
    if (!config.allowed_actions.includes(action)) {
      config.incident_log.push({
        id: generateIncidentId(),
        timestamp: new Date().toISOString(),
        type: 'policy_block',
        description: `Repair action '${action}' not allowed by policy`,
        action_taken: action,
        previous_state: config.health_status,
        new_state: config.health_status,
      });
      this.save();
      return false;
    }

    // Check funding
    if (config.funding.budget_status === 'exhausted') {
      transition(config, 'policy_blocked', 'Repair budget exhausted');
      this.save();
      return false;
    }

    if (success) {
      transition(config, 'recovered', description, action);
    } else {
      config.incident_log.push({
        id: generateIncidentId(),
        timestamp: new Date().toISOString(),
        type: 'repair_failure',
        description: `Repair failed: ${description}`,
        action_taken: action,
        previous_state: config.health_status,
        new_state: config.health_status,
      });
    }

    this.save();
    return success;
  }

  /**
   * Get all Safe configs with their health states.
   */
  getAllSafes(): Array<{ objectId: string; config: StrangrzSafeConfig }> {
    return Array.from(this.configs.entries()).map(([objectId, config]) => ({ objectId, config }));
  }

  /**
   * Get recent incidents across all Safes.
   */
  getRecentIncidents(limit: number = 50): Array<IncidentLogEntry & { objectId: string }> {
    const all: Array<IncidentLogEntry & { objectId: string }> = [];
    for (const [objectId, config] of this.configs) {
      for (const entry of config.incident_log) {
        all.push({ ...entry, objectId });
      }
    }
    return all.sort((a, b) => b.timestamp.localeCompare(a.timestamp)).slice(0, limit);
  }

  /**
   * Get health summary across all protected assets.
   */
  getHealthSummary(): {
    total: number;
    healthy: number;
    warning: number;
    degraded: number;
    unavailable: number;
    repairing: number;
  } {
    const summary = { total: 0, healthy: 0, warning: 0, degraded: 0, unavailable: 0, repairing: 0 };
    for (const config of this.configs.values()) {
      summary.total++;
      if (config.health_status === 'healthy' || config.health_status === 'recovered') summary.healthy++;
      else if (config.health_status === 'warning') summary.warning++;
      else if (config.health_status === 'degraded' || config.health_status === 'policy_blocked') summary.degraded++;
      else if (config.health_status === 'unavailable') summary.unavailable++;
      else if (config.health_status === 'repairing') summary.repairing++;
    }
    return summary;
  }
}

// ─── Helpers ────────────────────────────────────────────────

function generateIncidentId(): string {
  return 'INC_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
}

/**
 * Get trust badges for UI display.
 */
export function getSafeBadges(config: StrangrzSafeConfig | null): string[] {
  if (!config) return [];
  const badges: string[] = [];

  if (config.mode === 'active') badges.push('Safe Protected');
  if (config.health_status === 'healthy' || config.health_status === 'recovered') badges.push('Integrity Verified');
  if (config.funding.budget_status === 'funded') badges.push('Recovery Active');

  return badges;
}
