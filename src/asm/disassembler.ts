/**
 * CosmoASM Disassembler — Désassembleur Cosmique
 *
 * Convertit un programme compilé en code source lisible.
 */

import { CosmoInstruction, CosmoProgram } from '../core/instruction';
import { getOpcodeName } from '../core/opcodes';
import { REGISTER_META, RegisterId } from '../core/registers';
import { FRACTAL_LAYERS, LayerId } from '../core/layers';

export function disassemble(program: CosmoProgram): string {
  const lines: string[] = [];

  // Header
  lines.push(`; ═══ Programme CosmoASM: ${program.name} v${program.version} ═══`);
  lines.push(`;`);

  // Inverse le map de labels
  const labelByIndex = new Map<number, string>();
  for (const [name, idx] of program.labels) {
    labelByIndex.set(idx, name);
  }

  for (let i = 0; i < program.instructions.length; i++) {
    const inst = program.instructions[i];
    const label = labelByIndex.get(i);

    if (label) {
      lines.push('');
      lines.push(`${label}:`);
    }

    lines.push(`  ${formatInstruction(inst, program.labels)}`);
  }

  return lines.join('\n');
}

function formatInstruction(inst: CosmoInstruction, labels: Map<string, number>): string {
  const opname = getOpcodeName(inst.opcode).padEnd(16);
  const layerName = FRACTAL_LAYERS[inst.layer].name;
  const reg1Name = REGISTER_META[inst.reg1].name;
  const reg2Name = REGISTER_META[inst.reg2].name;

  let operands = `${layerName}.${reg1Name}`;

  if (inst.reg2 !== RegisterId.OMEGA || inst.immediate !== undefined) {
    operands += `, ${reg2Name}`;
  }

  if (inst.immediate !== undefined) {
    // Cherche si l'immédiat correspond à un label
    let labelName: string | undefined;
    for (const [name, idx] of labels) {
      if (idx === inst.immediate) {
        labelName = name;
        break;
      }
    }
    operands += labelName ? `  #${labelName}` : `  #${inst.immediate}`;
  }

  let result = `${opname} ${operands}`;

  if (inst.comment) {
    result = result.padEnd(50) + `; ${inst.comment}`;
  }

  return result;
}

/**
 * Format compact sur une seule ligne (pour le debug)
 */
export function formatInstructionCompact(inst: CosmoInstruction): string {
  const op = getOpcodeName(inst.opcode);
  const layer = FRACTAL_LAYERS[inst.layer].symbol;
  const r1 = REGISTER_META[inst.reg1].symbol;
  const r2 = REGISTER_META[inst.reg2].symbol;
  const imm = inst.immediate !== undefined ? `#${inst.immediate}` : '';
  return `${layer} ${op} ${r1},${r2} ${imm}`.trim();
}
