/**
 * CosmoASM Parser — Assembleur Cosmique
 *
 * Parse le code source CosmoASM en programme exécutable.
 *
 * Syntaxe:
 *   [LABEL:]  OPCODE  [LAYER.]REG1, REG2  [#immédiat]  ; commentaire
 *
 * Exemples:
 *   WARP_INIT    GRID.RΩ, Rφ           ; Initialise le warp sur GRID
 *   ENERGY_LOAD  HELIX.Rψ, #42         ; Charge 42 dans Rψ sur HELIX
 *   loop: FLUX_GATE  Rδ, #loop         ; Boucle si Rδ != 0
 */

import { CosmoInstruction, CosmoProgram } from '../core/instruction';
import { OPCODE_BY_NAME } from '../core/opcodes';
import { REGISTER_BY_NAME, RegisterId } from '../core/registers';
import { LayerId } from '../core/layers';

const LAYER_BY_NAME: Record<string, LayerId> = {
  'GRID':    LayerId.GRID,
  'HELIX':   LayerId.HELIX,
  'GLYPH':   LayerId.GLYPH,
  'COSMO':   LayerId.COSMO,
  'CHRONOS': LayerId.CHRONOS,
  'NEXUS':   LayerId.NEXUS,
  'LUMINA':  LayerId.LUMINA,
};

export class CosmoASMError extends Error {
  constructor(message: string, public readonly line: number, public readonly source?: string) {
    super(`[CosmoASM] Ligne ${line}: ${message}${source ? ` → "${source}"` : ''}`);
    this.name = 'CosmoASMError';
  }
}

export interface ParseOptions {
  name?: string;
  version?: string;
}

/**
 * Parse du code source CosmoASM en programme
 */
export function parseCosmoASM(source: string, options: ParseOptions = {}): CosmoProgram {
  const lines = source.split('\n');
  const instructions: CosmoInstruction[] = [];
  const labels = new Map<string, number>();
  const labelRefs: Array<{ instrIndex: number; label: string; line: number }> = [];

  // Premier pass : collecter les labels et parser les instructions
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    let line = lines[lineNum].trim();

    // Supprime les commentaires
    const commentIdx = line.indexOf(';');
    const comment = commentIdx >= 0 ? line.substring(commentIdx + 1).trim() : undefined;
    if (commentIdx >= 0) {
      line = line.substring(0, commentIdx).trim();
    }

    // Ignore les lignes vides et les directives
    if (!line || line.startsWith('.') || line.startsWith('#')) continue;

    // Détecte les labels
    let label: string | undefined;
    const labelMatch = line.match(/^(\w+):\s*/);
    if (labelMatch) {
      label = labelMatch[1];
      labels.set(label, instructions.length);
      line = line.substring(labelMatch[0].length).trim();
    }

    // Si la ligne ne contient qu'un label, continuer
    if (!line) continue;

    // Parse l'instruction
    const inst = parseInstruction(line, lineNum + 1);
    inst.comment = comment;
    inst.sourceLine = lineNum + 1;

    // Vérifie si l'immédiat est une référence de label
    if (inst.label) {
      labelRefs.push({ instrIndex: instructions.length, label: inst.label, line: lineNum + 1 });
    }

    instructions.push(inst);
  }

  // Second pass : résoudre les références de labels
  for (const ref of labelRefs) {
    const target = labels.get(ref.label);
    if (target === undefined) {
      throw new CosmoASMError(`Label inconnu: '${ref.label}'`, ref.line);
    }
    instructions[ref.instrIndex].immediate = target;
  }

  return {
    name: options.name ?? 'unnamed',
    version: options.version ?? '1.0.0',
    instructions,
    labels,
  };
}

function parseInstruction(line: string, lineNum: number): CosmoInstruction {
  // Tokenize
  const tokens = tokenize(line);

  if (tokens.length === 0) {
    throw new CosmoASMError('Instruction vide', lineNum, line);
  }

  // Premier token : opcode
  const opcodeName = tokens[0].toUpperCase();
  const opcode = OPCODE_BY_NAME[opcodeName];
  if (opcode === undefined) {
    throw new CosmoASMError(`Opcode inconnu: '${opcodeName}'`, lineNum, line);
  }

  // Parse les opérandes
  let layer: LayerId = LayerId.GRID;
  let reg1: RegisterId = RegisterId.OMEGA;
  let reg2: RegisterId = RegisterId.OMEGA;
  let immediate: number | undefined;
  let labelRef: string | undefined;

  const operands = tokens.slice(1).join(' ').split(',').map(s => s.trim()).filter(s => s);

  for (let i = 0; i < operands.length; i++) {
    let operand = operands[i];

    // Détecte le préfixe de couche : LAYER.REG
    const layerMatch = operand.match(/^(\w+)\.(.*)/);
    if (layerMatch) {
      const layerName = layerMatch[1].toUpperCase();
      if (LAYER_BY_NAME[layerName] !== undefined) {
        layer = LAYER_BY_NAME[layerName];
        operand = layerMatch[2];
      }
    }

    // Immédiat (#valeur ou #label)
    if (operand.startsWith('#')) {
      const immStr = operand.substring(1);
      const num = parseFloat(immStr);
      if (isNaN(num)) {
        // C'est une référence de label
        labelRef = immStr;
      } else {
        immediate = num;
      }
      continue;
    }

    // Registre
    const regId = parseRegister(operand);
    if (regId !== undefined) {
      if (i === 0) {
        reg1 = regId;
      } else {
        reg2 = regId;
      }
      continue;
    }

    // Valeur numérique directe
    const numVal = parseFloat(operand);
    if (!isNaN(numVal)) {
      immediate = numVal;
      continue;
    }

    throw new CosmoASMError(`Opérande inconnu: '${operand}'`, lineNum, line);
  }

  return {
    opcode,
    layer,
    reg1,
    reg2,
    immediate,
    label: labelRef,
  };
}

function parseRegister(token: string): RegisterId | undefined {
  const upper = token.toUpperCase();
  // Essaie les noms directs (RΩ, Rφ, etc.)
  if (REGISTER_BY_NAME[token] !== undefined) return REGISTER_BY_NAME[token];
  if (REGISTER_BY_NAME[upper] !== undefined) return REGISTER_BY_NAME[upper];

  // Essaie les noms ASCII (ROMEGA, RPHI, etc.)
  const asciiMap: Record<string, string> = {
    'ROMEGA': 'Ω', 'RPHI': 'φ', 'RPSI': 'ψ', 'RINFINITY': '∞', 'RINF': '∞',
    'RDELTA': 'δ', 'RLAMBDA': 'λ', 'RMU': 'μ', 'RPI': 'π',
    'RSIGMA': 'σ', 'RTHETA': 'θ', 'REPSILON': 'ε', 'RXI': 'ξ',
    // Formes courtes
    'R0': 'Ω', 'R1': 'φ', 'R2': 'ψ', 'R3': '∞',
    'R4': 'δ', 'R5': 'λ', 'R6': 'μ', 'R7': 'π',
    'R8': 'σ', 'R9': 'θ', 'R10': 'ε', 'R11': 'ξ',
  };

  const mapped = asciiMap[upper];
  if (mapped && REGISTER_BY_NAME[mapped] !== undefined) {
    return REGISTER_BY_NAME[mapped];
  }

  return undefined;
}

function tokenize(line: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inString = false;

  for (const ch of line) {
    if (ch === '"' || ch === "'") {
      inString = !inString;
      current += ch;
    } else if (!inString && (ch === ' ' || ch === '\t')) {
      if (current) {
        tokens.push(current);
        current = '';
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);

  return tokens;
}
