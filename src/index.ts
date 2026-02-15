/**
 * ╔══════════════════════════════════════════════════════════╗
 * ║                    COSMOWARP                              ║
 * ║           Protocole CosmoCode v2.0.0                      ║
 * ║                                                           ║
 * ║  Machine cosmique fractale avec CosmoASM                  ║
 * ║  32 opcodes · 7 couches · 12 registres · Planck Loop      ║
 * ╚══════════════════════════════════════════════════════════╝
 */

export * from './core';
export * from './vm';
export * from './asm';

// Re-export des types principaux pour un accès facile
export { CosmoVM, VMState } from './vm/cosmovm';
export type { VMConfig, ExecutionResult } from './vm/cosmovm';
export { parseCosmoASM } from './asm/parser';
export { disassemble } from './asm/disassembler';
export { CosmicRegisters, RegisterId } from './core/registers';
export { LayerId, FRACTAL_LAYERS } from './core/layers';
export { FluxOp, ConscienceOp, CryptoOp, ReseauOp } from './core/opcodes';
export { PlanckClock, PlanckPhase } from './core/planck';
