/**
 * 7 Couches Fractales du CosmoCode
 * Architecture en couches fractales auto-similaires
 */

export enum LayerId {
  GRID    = 0,  // Physique
  HELIX   = 1,  // Temporel
  GLYPH   = 2,  // Symbolique
  COSMO   = 3,  // Spatial
  CHRONOS = 4,  // Causal
  NEXUS   = 5,  // Relationnel
  LUMINA  = 6,  // Transcendant
}

export interface FractalLayer {
  id: LayerId;
  name: string;
  domain: string;
  energy: number;
  symbol: string;
  color: string;
  frequency: number;
}

export const FRACTAL_LAYERS: ReadonlyArray<FractalLayer> = [
  {
    id: LayerId.GRID,
    name: 'GRID',
    domain: 'Physique',
    energy: 1.0,
    symbol: '⊞',
    color: '#FF0000',
    frequency: 1.0,
  },
  {
    id: LayerId.HELIX,
    name: 'HELIX',
    domain: 'Temporel',
    energy: 1.618,      // Phi (nombre d'or)
    symbol: '🌀',
    color: '#FF8800',
    frequency: 1.618,
  },
  {
    id: LayerId.GLYPH,
    name: 'GLYPH',
    domain: 'Symbolique',
    energy: 3.14,        // Pi
    symbol: '◈',
    color: '#FFFF00',
    frequency: 3.14159,
  },
  {
    id: LayerId.COSMO,
    name: 'COSMO',
    domain: 'Spatial',
    energy: 7.77,        // Nombre cosmique
    symbol: '✦',
    color: '#00FF00',
    frequency: 7.77,
  },
  {
    id: LayerId.CHRONOS,
    name: 'CHRONOS',
    domain: 'Causal',
    energy: 13.37,       // Leet
    symbol: '⧖',
    color: '#0088FF',
    frequency: 13.37,
  },
  {
    id: LayerId.NEXUS,
    name: 'NEXUS',
    domain: 'Relationnel',
    energy: 21.0,        // Fibonacci
    symbol: '⬡',
    color: '#8800FF',
    frequency: 21.0,
  },
  {
    id: LayerId.LUMINA,
    name: 'LUMINA',
    domain: 'Transcendant',
    energy: 42.0,        // Réponse universelle
    symbol: '☀',
    color: '#FFFFFF',
    frequency: 42.0,
  },
];

/**
 * Calcule la résonance entre deux couches fractales.
 * La résonance est maximale quand le ratio d'énergie est proche du nombre d'or.
 */
export function computeResonance(layer1: LayerId, layer2: LayerId): number {
  const e1 = FRACTAL_LAYERS[layer1].energy;
  const e2 = FRACTAL_LAYERS[layer2].energy;
  const ratio = Math.max(e1, e2) / Math.min(e1, e2);
  const PHI = 1.618033988749895;
  // Plus le ratio est proche d'une puissance de Phi, plus la résonance est forte
  const logPhi = Math.log(ratio) / Math.log(PHI);
  const nearestInt = Math.round(logPhi);
  const deviation = Math.abs(logPhi - nearestInt);
  return Math.max(0, 1.0 - deviation);
}
