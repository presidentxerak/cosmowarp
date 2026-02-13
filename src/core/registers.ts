/**
 * 12 Registres Cosmiques
 * Chaque registre a une signification symbolique et un rôle dans la VM
 */

export enum RegisterId {
  OMEGA   = 0,   // RΩ — Registre de résultat / accumulateur
  PHI     = 1,   // Rφ — Registre du nombre d'or / harmonie
  PSI     = 2,   // Rψ — Registre de conscience / état mental
  INFINITY = 3,  // R∞ — Registre d'infini / compteur de boucle
  DELTA   = 4,   // Rδ — Registre de changement / différentiel
  LAMBDA  = 5,   // Rλ — Registre de fonction / pointeur de code
  MU      = 6,   // Rμ — Registre de masse / mémoire
  PI      = 7,   // Rπ — Registre circulaire / index rotatif
  SIGMA   = 8,   // Rσ — Registre de somme / accumulateur secondaire
  THETA   = 9,   // Rθ — Registre angulaire / direction
  EPSILON = 10,  // Rε — Registre de précision / seuil
  XI      = 11,  // Rξ — Registre d'aléatoire / entropie
}

export const REGISTER_COUNT = 12;

export interface RegisterMeta {
  id: RegisterId;
  name: string;
  symbol: string;
  greekName: string;
  description: string;
  defaultValue: number;
}

export const REGISTER_META: ReadonlyArray<RegisterMeta> = [
  { id: RegisterId.OMEGA,    name: 'RΩ', symbol: 'Ω', greekName: 'Omega',    description: 'Résultat / accumulateur',           defaultValue: 0 },
  { id: RegisterId.PHI,      name: 'Rφ', symbol: 'φ', greekName: 'Phi',      description: 'Nombre d\'or / harmonie',           defaultValue: 1.618033988749895 },
  { id: RegisterId.PSI,      name: 'Rψ', symbol: 'ψ', greekName: 'Psi',      description: 'Conscience / état mental',          defaultValue: 0 },
  { id: RegisterId.INFINITY, name: 'R∞', symbol: '∞', greekName: 'Infinity', description: 'Infini / compteur de boucle',       defaultValue: 0 },
  { id: RegisterId.DELTA,    name: 'Rδ', symbol: 'δ', greekName: 'Delta',    description: 'Changement / différentiel',         defaultValue: 0 },
  { id: RegisterId.LAMBDA,   name: 'Rλ', symbol: 'λ', greekName: 'Lambda',   description: 'Fonction / pointeur de code',       defaultValue: 0 },
  { id: RegisterId.MU,       name: 'Rμ', symbol: 'μ', greekName: 'Mu',       description: 'Masse / mémoire',                  defaultValue: 0 },
  { id: RegisterId.PI,       name: 'Rπ', symbol: 'π', greekName: 'Pi',       description: 'Circulaire / index rotatif',        defaultValue: 3.141592653589793 },
  { id: RegisterId.SIGMA,    name: 'Rσ', symbol: 'σ', greekName: 'Sigma',    description: 'Somme / accumulateur secondaire',   defaultValue: 0 },
  { id: RegisterId.THETA,    name: 'Rθ', symbol: 'θ', greekName: 'Theta',    description: 'Angulaire / direction',             defaultValue: 0 },
  { id: RegisterId.EPSILON,  name: 'Rε', symbol: 'ε', greekName: 'Epsilon',  description: 'Précision / seuil',                defaultValue: 0.001 },
  { id: RegisterId.XI,       name: 'Rξ', symbol: 'ξ', greekName: 'Xi',       description: 'Aléatoire / entropie',             defaultValue: 0 },
];

// Map nom -> id pour le parsing
export const REGISTER_BY_NAME: Record<string, RegisterId> = {};
for (const meta of REGISTER_META) {
  REGISTER_BY_NAME[meta.name] = meta.id;
  REGISTER_BY_NAME[meta.symbol] = meta.id;
  REGISTER_BY_NAME[meta.greekName.toUpperCase()] = meta.id;
}

/**
 * Banque de registres cosmiques
 */
export class CosmicRegisters {
  private values: Float64Array;

  constructor() {
    this.values = new Float64Array(REGISTER_COUNT);
    this.reset();
  }

  reset(): void {
    for (const meta of REGISTER_META) {
      this.values[meta.id] = meta.defaultValue;
    }
  }

  get(reg: RegisterId): number {
    return this.values[reg];
  }

  set(reg: RegisterId, value: number): void {
    this.values[reg] = value;
  }

  /** Retourne un snapshot de tous les registres */
  snapshot(): Record<string, number> {
    const result: Record<string, number> = {};
    for (const meta of REGISTER_META) {
      result[meta.name] = this.values[meta.id];
    }
    return result;
  }

  /** Clone les registres */
  clone(): CosmicRegisters {
    const copy = new CosmicRegisters();
    copy.values.set(this.values);
    return copy;
  }

  toString(): string {
    return REGISTER_META
      .map(m => `${m.name}(${m.symbol}) = ${this.values[m.id]}`)
      .join('\n');
  }
}
