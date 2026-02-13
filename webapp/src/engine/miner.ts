// CosmoWarp Miner - Proof-of-Computation using CosmoCode VM (browser-side)
// Implements a simplified CosmoVM that runs in the browser

interface MiningResult {
  success: boolean;
  cycles: number;
  energy: number;
  output: number[];
  hash: number;
}

// Simplified CosmoVM for browser mining
function cosmicHashFloat(value: number): number {
  const buf = new ArrayBuffer(8);
  const f64 = new Float64Array(buf);
  const u32 = new Uint32Array(buf);
  f64[0] = value;
  let h = 0x811c9dc5;
  h ^= u32[0];
  h = Math.imul(h, 0x01000193);
  h ^= u32[1];
  h = Math.imul(h, 0x01000193);
  return (h >>> 0) / 0xffffffff;
}

export function runMiningProgram(code: string): MiningResult {
  // Parse and execute a simplified CosmoASM program
  const lines = code.split('\n')
    .map(l => l.replace(/;.*$/, '').trim())
    .filter(l => l.length > 0);

  const registers = new Float64Array(12);
  registers[1] = 1.618033988749895; // PHI
  registers[7] = 3.141592653589793; // PI
  registers[10] = 0.001; // EPSILON

  const output: number[] = [];
  const stack: number[] = [];
  const memory: Float64Array = new Float64Array(256);
  let energy = 0;
  let cycles = 0;
  const maxCycles = 500;

  // Resolve labels
  const labels: Record<string, number> = {};
  const instructions: string[] = [];
  for (const line of lines) {
    const labelMatch = line.match(/^(\w+):\s*(.*)/);
    if (labelMatch) {
      labels[labelMatch[1]] = instructions.length;
      if (labelMatch[2].trim()) instructions.push(labelMatch[2].trim());
    } else {
      instructions.push(line);
    }
  }

  function parseReg(s: string): number {
    s = s.replace(/^(GRID|HELIX|GLYPH|COSMO|CHRONOS|NEXUS|LUMINA)\./, '');
    const map: Record<string, number> = {
      'RΩ': 0, 'R0': 0, 'ROMEGA': 0,
      'Rφ': 1, 'R1': 1, 'RPHI': 1,
      'Rψ': 2, 'R2': 2, 'RPSI': 2,
      'R∞': 3, 'R3': 3, 'RINFINITY': 3,
      'Rδ': 4, 'R4': 4, 'RDELTA': 4,
      'Rλ': 5, 'R5': 5, 'RLAMBDA': 5,
      'Rμ': 6, 'R6': 6, 'RMU': 6,
      'Rπ': 7, 'R7': 7, 'RPI': 7,
      'Rσ': 8, 'R8': 8, 'RSIGMA': 8,
      'Rθ': 9, 'R9': 9, 'RTHETA': 9,
      'Rε': 10, 'R10': 10, 'REPSILON': 10,
      'Rξ': 11, 'R11': 11, 'RXI': 11,
    };
    return map[s.toUpperCase()] ?? map[s] ?? 0;
  }

  function parseImm(s: string): number | string {
    if (s.startsWith('#')) {
      const val = s.slice(1);
      if (labels[val] !== undefined) return val;
      return parseFloat(val);
    }
    return parseFloat(s) || 0;
  }

  let pc = 0;
  while (pc < instructions.length && cycles < maxCycles) {
    const parts = instructions[pc].split(/[\s,]+/).filter(Boolean);
    const op = parts[0]?.toUpperCase();
    const arg1 = parts[1] || '';
    const arg2 = parts[2] || '';
    const arg3 = parts[3] || '';

    const r1 = parseReg(arg1);
    const immSrc = arg3 || arg2;
    const imm = immSrc.startsWith('#') ? parseImm(immSrc) : 0;
    const r2 = !arg2.startsWith('#') ? parseReg(arg2) : 0;

    cycles++;
    energy += 1;

    switch (op) {
      case 'WARP_INIT':
        energy += 0.5;
        break;
      case 'ENERGY_LOAD':
        registers[r1] = typeof imm === 'number' ? imm : 0;
        break;
      case 'FLUX_GATE': {
        if (registers[r1] !== 0) {
          const target = typeof imm === 'string' ? labels[imm] : (typeof imm === 'number' ? imm : 0);
          if (target !== undefined) { pc = target as number; continue; }
        }
        break;
      }
      case 'QUANTUM_JUMP': {
        const target = typeof imm === 'string' ? labels[imm] : (typeof imm === 'number' ? imm : 0);
        if (target !== undefined) { pc = target as number; continue; }
        break;
      }
      case 'FOLD_SPACE':
        memory[Math.abs(Math.round(registers[r2])) % 256] = registers[r1];
        break;
      case 'VOID_BRIDGE':
        registers[r1] = memory[Math.abs(Math.round(registers[r2 as number])) % 256];
        break;
      case 'SYNC_PULSE':
        registers[r1] = registers[r2];
        break;
      case 'DRIFT_ALIGN':
        registers[r1] += typeof imm === 'number' ? imm : 0;
        break;
      case 'MIND_LINK':
        registers[0] = registers[r1] * registers[r2];
        energy += 2;
        break;
      case 'ECHO_THOUGHT':
        stack.push(registers[r1]);
        break;
      case 'PSI_BURST':
        registers[r1] = stack.pop() ?? 0;
        break;
      case 'KARMA_CHECK':
        registers[0] = registers[r1] > registers[r2] ? 1 : registers[r1] < registers[r2] ? -1 : 0;
        break;
      case 'COSMO_SENSE':
        registers[0] = energy;
        break;
      case 'HASH_STAR':
        registers[0] = cosmicHashFloat(registers[r1]);
        energy += 3;
        break;
      case 'KEY_FORGE':
        registers[11] = (registers[11] * 1.618 + Date.now() % 1000) % 1;
        registers[0] = registers[11];
        energy += 5;
        break;
      case 'ENCRYPT_VOID': {
        const buf = new ArrayBuffer(8);
        const f64 = new Float64Array(buf);
        const u32 = new Uint32Array(buf);
        f64[0] = registers[r1];
        const kbuf = new ArrayBuffer(8);
        const kf64 = new Float64Array(kbuf);
        const ku32 = new Uint32Array(kbuf);
        kf64[0] = registers[r2];
        u32[0] ^= ku32[0];
        u32[1] ^= ku32[1];
        registers[0] = f64[0];
        energy += 4;
        break;
      }
      case 'DECRYPT_LIGHT': {
        const buf = new ArrayBuffer(8);
        const f64 = new Float64Array(buf);
        const u32 = new Uint32Array(buf);
        f64[0] = registers[r1];
        const kbuf = new ArrayBuffer(8);
        const kf64 = new Float64Array(kbuf);
        const ku32 = new Uint32Array(kbuf);
        kf64[0] = registers[r2];
        u32[0] ^= ku32[0];
        u32[1] ^= ku32[1];
        registers[0] = f64[0];
        energy += 4;
        break;
      }
      case 'SEAL_QUANTUM':
        memory[Math.abs(Math.round(registers[r1])) % 256] = registers[r1];
        memory[(Math.abs(Math.round(registers[r1])) + 1) % 256] = cosmicHashFloat(registers[r1]);
        energy += 6;
        break;
      case 'SIGNAL_BURST':
        output.push(registers[r1]);
        break;
      case 'BROADCAST_WAVE':
        output.push(registers[r1]);
        energy += 3;
        break;
      case 'NEURAL_MAP':
        registers[r1] = Math.tanh(registers[r1]);
        break;
      case 'DREAM_WEAVE':
        registers[0] = registers[r1] * 1.618 + registers[r2] * (1 - 1.618);
        break;
      case 'SOUL_SYNC':
        registers[2] = cosmicHashFloat(registers[r1] + energy);
        break;
      case 'SIGN_NEBULA':
        registers[0] = Math.sin(registers[r1] * registers[1]);
        energy += 3;
        break;
      case 'PROOF_COSMIC':
        registers[0] = cosmicHashFloat(registers[r1]) < registers[10] ? 1 : 0;
        energy += 5;
        break;
      case 'VERIFY_GLYPH':
        registers[0] = Math.abs(registers[r1] - registers[r2]) < registers[10] ? 1 : 0;
        break;
      case 'NODE_CONNECT':
        energy += 1;
        break;
      case 'MESH_WEAVE':
        registers[8] += registers[r1];
        energy += 1;
        break;
      case 'RELAY_CHAIN':
        output.push(registers[r1]);
        energy += 5;
        break;
      case 'ORBIT_SYNC':
        registers[r1] = Math.sin(registers[r1]) * energy;
        break;
      case 'PEER_DISCOVER':
        registers[3]++;
        break;
      case 'CHANNEL_OPEN':
        energy += 2;
        break;
      default:
        break;
    }
    pc++;
  }

  const hash = cosmicHashFloat(output.reduce((a, b) => a + b, 0) + energy);

  return {
    success: cycles < maxCycles,
    cycles,
    energy,
    output,
    hash,
  };
}

// Pre-built mining programs with increasing difficulty/reward
export const MINING_PROGRAMS = {
  basic: `; Basic Warp Mine
WARP_INIT       GRID.RΩ, RΩ
ENERGY_LOAD     GRID.RΩ, #42
HASH_STAR       GRID.RΩ
SIGNAL_BURST    GRID.RΩ
ENERGY_LOAD     GRID.R∞, #5
loop:
  KEY_FORGE     GRID.Rξ
  HASH_STAR     GRID.Rξ
  SIGNAL_BURST  GRID.RΩ
  DRIFT_ALIGN   GRID.R∞, #-1
  FLUX_GATE     GRID.R∞, #loop
COSMO_SENSE     GRID.RΩ
SIGNAL_BURST    GRID.RΩ`,

  crypto: `; Crypto Warp Mine
WARP_INIT       GRID.RΩ, RΩ
ENERGY_LOAD     GRID.RΩ, #137
KEY_FORGE       GRID.Rξ
ENCRYPT_VOID    GRID.RΩ, Rξ
SIGN_NEBULA     GRID.RΩ
SEAL_QUANTUM    GRID.RΩ
ENERGY_LOAD     GRID.R∞, #8
seal_loop:
  KEY_FORGE     GRID.Rξ
  HASH_STAR     GRID.Rξ
  ENCRYPT_VOID  GRID.RΩ, Rξ
  SEAL_QUANTUM  GRID.RΩ
  SIGNAL_BURST  GRID.RΩ
  DRIFT_ALIGN   GRID.R∞, #-1
  FLUX_GATE     GRID.R∞, #seal_loop
COSMO_SENSE     GRID.RΩ
BROADCAST_WAVE  GRID.RΩ`,

  deep: `; Deep Warp Mine
WARP_INIT       GRID.RΩ, RΩ
ENERGY_LOAD     GRID.RΩ, #256
ENERGY_LOAD     GRID.Rφ, #1.618
KEY_FORGE       GRID.Rξ
ENERGY_LOAD     GRID.R∞, #12
mine_loop:
  MIND_LINK     GRID.RΩ, Rφ
  HASH_STAR     GRID.RΩ
  KEY_FORGE     GRID.Rξ
  ENCRYPT_VOID  GRID.RΩ, Rξ
  SIGN_NEBULA   GRID.RΩ
  SEAL_QUANTUM  GRID.RΩ
  SOUL_SYNC     GRID.RΩ
  PROOF_COSMIC  GRID.RΩ
  SIGNAL_BURST  GRID.RΩ
  DRIFT_ALIGN   GRID.R∞, #-1
  FLUX_GATE     GRID.R∞, #mine_loop
COSMO_SENSE     GRID.RΩ
RELAY_CHAIN     GRID.RΩ
BROADCAST_WAVE  GRID.RΩ`,
};
