import { CosmoVM, VMState } from '../vm/cosmovm';
import { parseCosmoASM } from '../asm/parser';
import { CosmicRegisters, RegisterId, REGISTER_COUNT } from '../core/registers';
import { LayerId, FRACTAL_LAYERS, computeResonance } from '../core/layers';
import { PlanckClock, TOTAL_PLANCK_PER_CYCLE } from '../core/planck';
import { FluxOp, ConscienceOp, CryptoOp, ReseauOp, getOpcodeName, getOpcodeFamily, OpcodeFamily } from '../core/opcodes';
import { encodeInstruction, decodeInstruction } from '../core/instruction';

describe('CosmoCode Protocol', () => {

  // ─── Opcodes ────────────────────────────────────────

  describe('Opcodes', () => {
    test('32 opcodes across 4 families', () => {
      for (let i = 0; i <= 0x1F; i++) {
        expect(getOpcodeName(i)).not.toMatch(/UNKNOWN/);
      }
    });

    test('opcode families are correct', () => {
      expect(getOpcodeFamily(FluxOp.WARP_INIT)).toBe(OpcodeFamily.FLUX);
      expect(getOpcodeFamily(ConscienceOp.MIND_LINK)).toBe(OpcodeFamily.CONSCIENCE);
      expect(getOpcodeFamily(CryptoOp.HASH_STAR)).toBe(OpcodeFamily.CRYPTO);
      expect(getOpcodeFamily(ReseauOp.NODE_CONNECT)).toBe(OpcodeFamily.RESEAU);
    });

    test('invalid opcode throws', () => {
      expect(() => getOpcodeFamily(0x20)).toThrow();
    });
  });

  // ─── Fractal Layers ─────────────────────────────────

  describe('Fractal Layers', () => {
    test('7 layers exist', () => {
      expect(FRACTAL_LAYERS).toHaveLength(7);
    });

    test('energies match spec', () => {
      expect(FRACTAL_LAYERS[LayerId.GRID].energy).toBe(1.0);
      expect(FRACTAL_LAYERS[LayerId.HELIX].energy).toBe(1.618);
      expect(FRACTAL_LAYERS[LayerId.GLYPH].energy).toBe(3.14);
      expect(FRACTAL_LAYERS[LayerId.COSMO].energy).toBe(7.77);
      expect(FRACTAL_LAYERS[LayerId.CHRONOS].energy).toBe(13.37);
      expect(FRACTAL_LAYERS[LayerId.NEXUS].energy).toBe(21.0);
      expect(FRACTAL_LAYERS[LayerId.LUMINA].energy).toBe(42.0);
    });

    test('resonance is between 0 and 1', () => {
      const r = computeResonance(LayerId.GRID, LayerId.HELIX);
      expect(r).toBeGreaterThanOrEqual(0);
      expect(r).toBeLessThanOrEqual(1);
    });
  });

  // ─── Registers ──────────────────────────────────────

  describe('Cosmic Registers', () => {
    test('12 registers', () => {
      expect(REGISTER_COUNT).toBe(12);
    });

    test('default values', () => {
      const regs = new CosmicRegisters();
      expect(regs.get(RegisterId.PHI)).toBeCloseTo(1.618, 3);
      expect(regs.get(RegisterId.PI)).toBeCloseTo(3.14159, 4);
      expect(regs.get(RegisterId.EPSILON)).toBeCloseTo(0.001, 3);
      expect(regs.get(RegisterId.OMEGA)).toBe(0);
    });

    test('set and get', () => {
      const regs = new CosmicRegisters();
      regs.set(RegisterId.OMEGA, 42);
      expect(regs.get(RegisterId.OMEGA)).toBe(42);
    });

    test('snapshot', () => {
      const regs = new CosmicRegisters();
      const snap = regs.snapshot();
      expect(Object.keys(snap)).toHaveLength(12);
    });
  });

  // ─── Planck Clock ───────────────────────────────────

  describe('Planck Clock', () => {
    test('full cycle = 33 planck', () => {
      expect(TOTAL_PLANCK_PER_CYCLE).toBe(33);
    });

    test('fibonacci timing', () => {
      const clock = new PlanckClock();
      const events = clock.fullCycle();
      expect(events).toHaveLength(7);
      expect(events.map(e => e.planckTime)).toEqual([1, 1, 2, 3, 5, 8, 13]);
    });
  });

  // ─── Instruction Encoding ──────────────────────────

  describe('Instruction Encoding', () => {
    test('encode and decode roundtrip', () => {
      const inst = {
        opcode: FluxOp.ENERGY_LOAD,
        layer: LayerId.HELIX,
        reg1: RegisterId.OMEGA,
        reg2: RegisterId.PHI,
        immediate: 42,
      };
      const encoded = encodeInstruction(inst);
      const decoded = decodeInstruction(encoded);
      expect(decoded.opcode).toBe(inst.opcode);
      expect(decoded.layer).toBe(inst.layer);
      expect(decoded.reg1).toBe(inst.reg1);
      expect(decoded.reg2).toBe(inst.reg2);
      expect(decoded.immediate).toBe(42);
    });
  });

  // ─── Parser ─────────────────────────────────────────

  describe('CosmoASM Parser', () => {
    test('parses simple program', () => {
      const source = `
        WARP_INIT  GRID.RΩ, RΩ
        ENERGY_LOAD HELIX.RΩ, #42
      `;
      const prog = parseCosmoASM(source, { name: 'test' });
      expect(prog.instructions).toHaveLength(2);
      expect(prog.instructions[0].opcode).toBe(FluxOp.WARP_INIT);
      expect(prog.instructions[1].immediate).toBe(42);
    });

    test('parses labels', () => {
      const source = `
        ENERGY_LOAD GRID.R∞, #3
        loop: DRIFT_ALIGN GRID.R∞, #-1
        FLUX_GATE GRID.R∞, #loop
      `;
      const prog = parseCosmoASM(source);
      expect(prog.labels.get('loop')).toBe(1);
      expect(prog.instructions[2].immediate).toBe(1);
    });

    test('unknown opcode throws', () => {
      expect(() => parseCosmoASM('INVALID_OP GRID.RΩ')).toThrow();
    });
  });

  // ─── VM Execution ───────────────────────────────────

  describe('CosmoVM', () => {
    test('runs hello_cosmo', () => {
      const source = `
        WARP_INIT GRID.RΩ, RΩ
        ENERGY_LOAD GRID.RΩ, #1.0
        SIGNAL_BURST GRID.RΩ
        ENERGY_LOAD LUMINA.RΩ, #42
        SIGNAL_BURST LUMINA.RΩ
      `;
      const prog = parseCosmoASM(source, { name: 'test_hello' });
      const vm = new CosmoVM();
      vm.load(prog);
      const result = vm.run();

      expect(result.state).toBe(VMState.HALTED);
      expect(result.output).toContain(1);
      expect(result.output).toContain(42);
    });

    test('loop with counter', () => {
      const source = `
        WARP_INIT GRID.RΩ, RΩ
        ENERGY_LOAD GRID.R∞, #5
        loop: SIGNAL_BURST GRID.R∞
        DRIFT_ALIGN GRID.R∞, #-1
        FLUX_GATE GRID.R∞, #loop
      `;
      const prog = parseCosmoASM(source, { name: 'test_loop' });
      const vm = new CosmoVM();
      vm.load(prog);
      const result = vm.run();

      expect(result.state).toBe(VMState.HALTED);
      expect(result.output).toHaveLength(5);
    });

    test('crypto operations', () => {
      const source = `
        WARP_INIT GLYPH.RΩ, RΩ
        ENERGY_LOAD GLYPH.RΩ, #100
        HASH_STAR GLYPH.RΩ
        SIGNAL_BURST GLYPH.RΩ
      `;
      const prog = parseCosmoASM(source, { name: 'test_crypto' });
      const vm = new CosmoVM();
      vm.load(prog);
      const result = vm.run();

      expect(result.state).toBe(VMState.HALTED);
      expect(result.output).toHaveLength(1);
      // Hash should produce a value between 0 and 1
      expect(result.registers['RΩ']).toBeGreaterThanOrEqual(0);
      expect(result.registers['RΩ']).toBeLessThanOrEqual(1);
    });

    test('max cycles protection', () => {
      const source = `
        WARP_INIT GRID.RΩ, RΩ
        ENERGY_LOAD GRID.R∞, #1
        loop: FLUX_GATE GRID.R∞, #loop
      `;
      const prog = parseCosmoASM(source, { name: 'test_infinite' });
      const vm = new CosmoVM({ maxCycles: 100 });
      vm.load(prog);
      const result = vm.run();

      expect(result.state).toBe(VMState.ERROR);
      expect(result.cycles).toBe(100);
    });
  });
});
