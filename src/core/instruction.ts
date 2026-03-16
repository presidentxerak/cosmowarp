/**
 * Format d'instruction CosmoASM
 *
 * Une instruction CosmoASM encode:
 * - opcode (6 bits) : l'opération à effectuer
 * - layer  (3 bits) : la couche fractale cible
 * - reg1   (4 bits) : premier registre
 * - reg2   (4 bits) : second registre (ou immédiat)
 * - immediate (variable) : valeur immédiate optionnelle
 */

import { RegisterId } from './registers';
import { LayerId } from './layers';

export interface CosmoInstruction {
  opcode: number;
  layer: LayerId;
  reg1: RegisterId;
  reg2: RegisterId;
  immediate?: number;
  label?: string;          // Label optionnel (pour les sauts)
  comment?: string;        // Commentaire optionnel
  sourceLine?: number;     // Ligne source (pour le debug)
}

/**
 * Encode une instruction en binaire (32 bits)
 * Format: [opcode:6][layer:3][reg1:4][reg2:4][imm:15]
 */
export function encodeInstruction(inst: CosmoInstruction): number {
  let encoded = 0;
  encoded |= (inst.opcode & 0x3F) << 26;
  encoded |= (inst.layer & 0x07) << 23;
  encoded |= (inst.reg1 & 0x0F) << 19;
  encoded |= (inst.reg2 & 0x0F) << 15;
  if (inst.immediate !== undefined) {
    // Immédiat signé sur 15 bits
    const imm = Math.max(-16384, Math.min(16383, Math.round(inst.immediate)));
    encoded |= (imm & 0x7FFF);
  }
  return encoded >>> 0; // Unsigned
}

/**
 * Décode un mot binaire 32 bits en instruction
 */
export function decodeInstruction(word: number): CosmoInstruction {
  return {
    opcode: (word >>> 26) & 0x3F,
    layer: ((word >>> 23) & 0x07) as LayerId,
    reg1: ((word >>> 19) & 0x0F) as RegisterId,
    reg2: ((word >>> 15) & 0x0F) as RegisterId,
    immediate: ((word & 0x7FFF) << 17) >> 17, // Extension de signe 15-bit
  };
}

/**
 * Programme CosmoASM compilé
 */
export interface CosmoProgram {
  name: string;
  version: string;
  instructions: CosmoInstruction[];
  labels: Map<string, number>;       // label -> index d'instruction
  metadata?: Record<string, string>;
}
