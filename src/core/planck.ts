/**
 * Planck Loop — Cycle d'exécution du CosmoCode
 *
 * 7 étapes suivant la suite de Fibonacci pour les durées Planck:
 * ABSORB(1) → DECODE(1) → RESONATE(2) → EXECUTE(3) → PROPAGATE(5) → HARMONIZE(8) → TRANSCEND(13)
 * Total: 33 temps Planck par cycle complet
 */

export enum PlanckPhase {
  ABSORB     = 0,  // Lecture instruction
  DECODE     = 1,  // Décodage cosmique
  RESONATE   = 2,  // Vérification harmonique
  EXECUTE    = 3,  // Exécution quantique
  PROPAGATE  = 4,  // Propagation des effets
  HARMONIZE  = 5,  // Harmonisation état
  TRANSCEND  = 6,  // Transcendance cycle
}

export interface PlanckPhaseMeta {
  phase: PlanckPhase;
  name: string;
  description: string;
  planckTime: number;  // Durée en temps de Planck (Fibonacci)
}

export const PLANCK_PHASES: ReadonlyArray<PlanckPhaseMeta> = [
  { phase: PlanckPhase.ABSORB,    name: 'ABSORB',    description: 'Lecture instruction',       planckTime: 1 },
  { phase: PlanckPhase.DECODE,    name: 'DECODE',     description: 'Décodage cosmique',         planckTime: 1 },
  { phase: PlanckPhase.RESONATE,  name: 'RESONATE',   description: 'Vérification harmonique',   planckTime: 2 },
  { phase: PlanckPhase.EXECUTE,   name: 'EXECUTE',    description: 'Exécution quantique',       planckTime: 3 },
  { phase: PlanckPhase.PROPAGATE, name: 'PROPAGATE',  description: 'Propagation des effets',    planckTime: 5 },
  { phase: PlanckPhase.HARMONIZE, name: 'HARMONIZE',  description: 'Harmonisation état',        planckTime: 8 },
  { phase: PlanckPhase.TRANSCEND, name: 'TRANSCEND',  description: 'Transcendance cycle',       planckTime: 13 },
];

export const TOTAL_PLANCK_PER_CYCLE = PLANCK_PHASES.reduce((s, p) => s + p.planckTime, 0); // 33

/**
 * Événement émis à chaque phase du cycle Planck
 */
export interface PlanckEvent {
  cycle: number;
  phase: PlanckPhase;
  planckTime: number;
  totalPlanck: number;
}

/**
 * Compteur de cycle Planck
 */
export class PlanckClock {
  private _cycle: number = 0;
  private _phase: PlanckPhase = PlanckPhase.ABSORB;
  private _totalPlanck: number = 0;

  get cycle(): number { return this._cycle; }
  get phase(): PlanckPhase { return this._phase; }
  get totalPlanck(): number { return this._totalPlanck; }

  reset(): void {
    this._cycle = 0;
    this._phase = PlanckPhase.ABSORB;
    this._totalPlanck = 0;
  }

  /** Avance à la phase suivante, retourne l'événement */
  tick(): PlanckEvent {
    const meta = PLANCK_PHASES[this._phase];
    this._totalPlanck += meta.planckTime;

    const event: PlanckEvent = {
      cycle: this._cycle,
      phase: this._phase,
      planckTime: meta.planckTime,
      totalPlanck: this._totalPlanck,
    };

    // Avance à la phase suivante
    if (this._phase === PlanckPhase.TRANSCEND) {
      this._phase = PlanckPhase.ABSORB;
      this._cycle++;
    } else {
      this._phase++;
    }

    return event;
  }

  /** Exécute un cycle complet (7 phases), retourne tous les événements */
  fullCycle(): PlanckEvent[] {
    const events: PlanckEvent[] = [];
    for (let i = 0; i < 7; i++) {
      events.push(this.tick());
    }
    return events;
  }
}
