/**
 * CosmoVM — Machine Virtuelle Cosmique
 *
 * Exécute les programmes CosmoASM en respectant le Planck Loop,
 * les 7 couches fractales et les 12 registres cosmiques.
 */

import { CosmoInstruction, CosmoProgram } from '../core/instruction';
import { FluxOp, ConscienceOp, CryptoOp, ReseauOp, getOpcodeName, getOpcodeFamily } from '../core/opcodes';
import { CosmicRegisters, RegisterId, REGISTER_META } from '../core/registers';
import { LayerId, FRACTAL_LAYERS, computeResonance, FractalLayer } from '../core/layers';
import { PlanckClock, PlanckPhase, PlanckEvent } from '../core/planck';

// ─── État de la VM ───────────────────────────────────────

export enum VMState {
  IDLE     = 'IDLE',
  RUNNING  = 'RUNNING',
  HALTED   = 'HALTED',
  ERROR    = 'ERROR',
  WARPED   = 'WARPED',   // En transit interdimensionnel
}

export interface VMConfig {
  maxCycles: number;
  energyLimit: number;
  debug: boolean;
  traceExecution: boolean;
}

const DEFAULT_CONFIG: VMConfig = {
  maxCycles: 10000,
  energyLimit: 999999,
  debug: false,
  traceExecution: false,
};

export interface ExecutionTrace {
  cycle: number;
  phase: PlanckPhase;
  instruction: CosmoInstruction;
  registers: Record<string, number>;
  energy: number;
  layer: LayerId;
}

// ─── Mémoire cosmique ───────────────────────────────────

export class CosmicMemory {
  private layers: Map<LayerId, Float64Array>;
  private readonly size: number;

  constructor(sizePerLayer: number = 4096) {
    this.size = sizePerLayer;
    this.layers = new Map();
    for (let i = 0; i <= LayerId.LUMINA; i++) {
      this.layers.set(i as LayerId, new Float64Array(sizePerLayer));
    }
  }

  read(layer: LayerId, address: number): number {
    const mem = this.layers.get(layer)!;
    const addr = ((address % this.size) + this.size) % this.size;
    return mem[addr];
  }

  write(layer: LayerId, address: number, value: number): void {
    const mem = this.layers.get(layer)!;
    const addr = ((address % this.size) + this.size) % this.size;
    mem[addr] = value;
  }

  clear(): void {
    for (const mem of this.layers.values()) {
      mem.fill(0);
    }
  }
}

// ─── Pile cosmique ──────────────────────────────────────

class CosmicStack {
  private data: number[] = [];
  private maxSize: number;

  constructor(maxSize: number = 1024) {
    this.maxSize = maxSize;
  }

  push(value: number): void {
    if (this.data.length >= this.maxSize) {
      throw new CosmoVMError('Stack overflow cosmique');
    }
    this.data.push(value);
  }

  pop(): number {
    if (this.data.length === 0) {
      throw new CosmoVMError('Stack underflow cosmique');
    }
    return this.data.pop()!;
  }

  peek(): number {
    if (this.data.length === 0) {
      throw new CosmoVMError('Stack vide');
    }
    return this.data[this.data.length - 1];
  }

  get depth(): number { return this.data.length; }

  clear(): void { this.data = []; }
}

// ─── Erreur VM ──────────────────────────────────────────

export class CosmoVMError extends Error {
  constructor(message: string, public readonly cycle?: number) {
    super(`[CosmoVM] ${message}`);
    this.name = 'CosmoVMError';
  }
}

// ─── Résultat d'exécution ────────────────────────────────

export interface ExecutionResult {
  state: VMState;
  cycles: number;
  totalPlanck: number;
  energy: number;
  registers: Record<string, number>;
  trace: ExecutionTrace[];
  output: number[];
}

// ─── CosmoVM ─────────────────────────────────────────────

export class CosmoVM {
  private registers: CosmicRegisters;
  private memory: CosmicMemory;
  private stack: CosmicStack;
  private clock: PlanckClock;
  private config: VMConfig;

  private state: VMState = VMState.IDLE;
  private pc: number = 0;            // Program Counter
  private energy: number = 0;
  private currentLayer: LayerId = LayerId.GRID;
  private program: CosmoProgram | null = null;
  private trace: ExecutionTrace[] = [];
  private output: number[] = [];

  // Callbacks pour les événements réseau
  private networkHandlers: Map<string, (data: any) => void> = new Map();

  constructor(config: Partial<VMConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.registers = new CosmicRegisters();
    this.memory = new CosmicMemory();
    this.stack = new CosmicStack();
    this.clock = new PlanckClock();
  }

  /** Charge un programme dans la VM */
  load(program: CosmoProgram): void {
    this.program = program;
    this.reset();
    this.state = VMState.IDLE;
  }

  /** Réinitialise la VM */
  reset(): void {
    this.registers.reset();
    this.memory.clear();
    this.stack.clear();
    this.clock.reset();
    this.pc = 0;
    this.energy = 0;
    this.currentLayer = LayerId.GRID;
    this.state = VMState.IDLE;
    this.trace = [];
    this.output = [];
  }

  /** Exécute le programme chargé jusqu'à la fin ou la limite */
  run(): ExecutionResult {
    if (!this.program) {
      throw new CosmoVMError('Aucun programme chargé');
    }

    this.state = VMState.RUNNING;
    let cycleCount = 0;

    while (this.state === VMState.RUNNING && cycleCount < this.config.maxCycles) {
      if (this.pc >= this.program.instructions.length) {
        this.state = VMState.HALTED;
        break;
      }

      const instruction = this.program.instructions[this.pc];

      // Exécute le Planck Loop complet pour cette instruction
      this.executePlanckCycle(instruction);
      cycleCount++;

      if (this.energy > this.config.energyLimit) {
        this.state = VMState.ERROR;
        throw new CosmoVMError(`Limite d'énergie dépassée: ${this.energy}`, cycleCount);
      }
    }

    if (cycleCount >= this.config.maxCycles) {
      this.state = VMState.ERROR;
    }

    return {
      state: this.state,
      cycles: cycleCount,
      totalPlanck: this.clock.totalPlanck,
      energy: this.energy,
      registers: this.registers.snapshot(),
      trace: this.trace,
      output: [...this.output],
    };
  }

  /** Exécute un cycle Planck complet pour une instruction */
  private executePlanckCycle(instruction: CosmoInstruction): void {
    // Phase 1: ABSORB — Lecture de l'instruction
    this.clock.tick();

    // Phase 2: DECODE — Décodage cosmique
    this.clock.tick();
    const family = getOpcodeFamily(instruction.opcode);

    // Phase 3: RESONATE — Vérification harmonique
    this.clock.tick();
    const layerEnergy = FRACTAL_LAYERS[instruction.layer].energy;
    const resonance = computeResonance(this.currentLayer, instruction.layer);
    this.energy += layerEnergy * (1 + resonance);

    // Phase 4: EXECUTE — Exécution quantique
    this.clock.tick();
    this.executeInstruction(instruction);

    // Phase 5: PROPAGATE — Propagation des effets
    this.clock.tick();
    this.propagateEffects(instruction);

    // Phase 6: HARMONIZE — Harmonisation état
    this.clock.tick();
    this.harmonize();

    // Phase 7: TRANSCEND — Transcendance cycle
    const transcendEvent = this.clock.tick();

    // Trace
    if (this.config.traceExecution) {
      this.trace.push({
        cycle: transcendEvent.cycle,
        phase: PlanckPhase.TRANSCEND,
        instruction,
        registers: this.registers.snapshot(),
        energy: this.energy,
        layer: this.currentLayer,
      });
    }
  }

  /** Exécute une instruction individuelle */
  private executeInstruction(inst: CosmoInstruction): void {
    const opcode = inst.opcode;

    // ═══ FLUX (0x00 - 0x07) ═══
    if (opcode >= 0x00 && opcode <= 0x07) {
      this.executeFlux(opcode as FluxOp, inst);
      return;
    }

    // ═══ CONSCIENCE (0x08 - 0x0F) ═══
    if (opcode >= 0x08 && opcode <= 0x0F) {
      this.executeConscience(opcode as ConscienceOp, inst);
      return;
    }

    // ═══ CRYPTO (0x10 - 0x17) ═══
    if (opcode >= 0x10 && opcode <= 0x17) {
      this.executeCrypto(opcode as CryptoOp, inst);
      return;
    }

    // ═══ RÉSEAU (0x18 - 0x1F) ═══
    if (opcode >= 0x18 && opcode <= 0x1F) {
      this.executeReseau(opcode as ReseauOp, inst);
      return;
    }

    throw new CosmoVMError(`Opcode inconnu: 0x${opcode.toString(16)}`);
  }

  // ─── Exécution FLUX ──────────────────────────────────

  private executeFlux(op: FluxOp, inst: CosmoInstruction): void {
    switch (op) {
      case FluxOp.WARP_INIT: {
        // Initialise le warp : reset énergie, set layer
        this.currentLayer = inst.layer;
        this.registers.set(RegisterId.OMEGA, 0);
        this.state = VMState.RUNNING;
        this.pc++;
        break;
      }
      case FluxOp.ENERGY_LOAD: {
        // Charge de l'énergie dans un registre
        const value = inst.immediate ?? FRACTAL_LAYERS[inst.layer].energy;
        this.registers.set(inst.reg1, value);
        this.energy += Math.abs(value);
        this.pc++;
        break;
      }
      case FluxOp.FLUX_GATE: {
        // Porte conditionnelle : saute si registre != 0
        const val = this.registers.get(inst.reg1);
        if (val !== 0) {
          const target = inst.immediate ?? (this.pc + 1);
          if (target < 0 || target >= this.program!.instructions.length) {
            this.state = VMState.ERROR;
            break;
          }
          this.pc = target;
        } else {
          this.pc++;
        }
        break;
      }
      case FluxOp.QUANTUM_JUMP: {
        // Saut inconditionnel
        if (inst.label && this.program) {
          const target = this.program.labels.get(inst.label);
          if (target !== undefined) {
            this.pc = target;
          } else {
            this.pc = inst.immediate ?? (this.pc + 1);
          }
        } else {
          this.pc = inst.immediate ?? (this.pc + 1);
        }
        break;
      }
      case FluxOp.FOLD_SPACE: {
        // Pliage spatial : déplace la valeur d'un registre dans la mémoire de la couche
        const addr = this.registers.get(inst.reg2);
        const val = this.registers.get(inst.reg1);
        this.memory.write(inst.layer, addr, val);
        this.pc++;
        break;
      }
      case FluxOp.SYNC_PULSE: {
        // Impulsion de sync : copie registre src -> dst
        const val = this.registers.get(inst.reg2);
        this.registers.set(inst.reg1, val);
        this.pc++;
        break;
      }
      case FluxOp.DRIFT_ALIGN: {
        // Alignement : ajoute immédiat au registre
        const current = this.registers.get(inst.reg1);
        this.registers.set(inst.reg1, current + (inst.immediate ?? 0));
        this.pc++;
        break;
      }
      case FluxOp.VOID_BRIDGE: {
        // Pont du vide : lit mémoire -> registre
        const addr = this.registers.get(inst.reg2);
        const val = this.memory.read(inst.layer, addr);
        this.registers.set(inst.reg1, val);
        this.pc++;
        break;
      }
    }
  }

  // ─── Exécution CONSCIENCE ─────────────────────────────

  private executeConscience(op: ConscienceOp, inst: CosmoInstruction): void {
    switch (op) {
      case ConscienceOp.MIND_LINK: {
        // Lien mental : connecte deux registres (multiplie)
        const a = this.registers.get(inst.reg1);
        const b = this.registers.get(inst.reg2);
        this.registers.set(RegisterId.OMEGA, a * b);
        this.pc++;
        break;
      }
      case ConscienceOp.DREAM_WEAVE: {
        // Tissage de rêve : interpolation entre registres
        const a = this.registers.get(inst.reg1);
        const b = this.registers.get(inst.reg2);
        const phi = this.registers.get(RegisterId.PHI);
        this.registers.set(RegisterId.OMEGA, a * (1 - 1/phi) + b * (1/phi));
        this.pc++;
        break;
      }
      case ConscienceOp.SOUL_SYNC: {
        // Sync d'âme : harmonique entre couches
        const resonance = computeResonance(this.currentLayer, inst.layer);
        this.registers.set(RegisterId.PSI, resonance);
        this.currentLayer = inst.layer;
        this.pc++;
        break;
      }
      case ConscienceOp.ECHO_THOUGHT: {
        // Écho de pensée : push registre sur la pile
        this.stack.push(this.registers.get(inst.reg1));
        this.pc++;
        break;
      }
      case ConscienceOp.PSI_BURST: {
        // Rafale psi : pop pile -> registre
        const val = this.stack.pop();
        this.registers.set(inst.reg1, val);
        this.pc++;
        break;
      }
      case ConscienceOp.NEURAL_MAP: {
        // Carte neurale : applique une transformation non-linéaire (tanh)
        const val = this.registers.get(inst.reg1);
        this.registers.set(inst.reg1, Math.tanh(val));
        this.pc++;
        break;
      }
      case ConscienceOp.KARMA_CHECK: {
        // Vérification karmique : compare reg1 et reg2, stocke -1/0/1 dans OMEGA
        const a = this.registers.get(inst.reg1);
        const b = this.registers.get(inst.reg2);
        this.registers.set(RegisterId.OMEGA, Math.sign(a - b));
        this.pc++;
        break;
      }
      case ConscienceOp.COSMO_SENSE: {
        // Sens cosmique : évalue l'énergie totale, stocke dans OMEGA
        this.registers.set(RegisterId.OMEGA, this.energy);
        this.pc++;
        break;
      }
    }
  }

  // ─── Exécution CRYPTO ──────────────────────────────────

  private executeCrypto(op: CryptoOp, inst: CosmoInstruction): void {
    switch (op) {
      case CryptoOp.HASH_STAR: {
        // Hash stellaire : hash simple du registre (FNV-1a inspiré)
        let val = this.registers.get(inst.reg1);
        let hash = 2166136261;
        const bytes = new Float64Array([val]);
        const view = new Uint8Array(bytes.buffer);
        for (const byte of view) {
          hash ^= byte;
          hash = Math.imul(hash, 16777619);
        }
        this.registers.set(RegisterId.OMEGA, (hash >>> 0) / 4294967295);
        this.pc++;
        break;
      }
      case CryptoOp.SIGN_NEBULA: {
        // Signature nébuleuse : signe = hash(valeur + clé phi)
        const val = this.registers.get(inst.reg1);
        const phi = this.registers.get(RegisterId.PHI);
        const sig = Math.sin(val * phi) * 2147483647;
        this.registers.set(RegisterId.OMEGA, sig);
        this.pc++;
        break;
      }
      case CryptoOp.ENCRYPT_VOID: {
        // Chiffrement du vide : XOR flottant avec clé
        const val = this.registers.get(inst.reg1);
        const key = this.registers.get(inst.reg2);
        // XOR sur les bits IEEE754
        const valBuf = new Float64Array([val]);
        const keyBuf = new Float64Array([key]);
        const valView = new Uint32Array(valBuf.buffer);
        const keyView = new Uint32Array(keyBuf.buffer);
        valView[0] ^= keyView[0];
        valView[1] ^= keyView[1];
        this.registers.set(inst.reg1, valBuf[0]);
        this.pc++;
        break;
      }
      case CryptoOp.DECRYPT_LIGHT: {
        // Déchiffrement lumière : même opération que ENCRYPT (XOR symétrique)
        const val = this.registers.get(inst.reg1);
        const key = this.registers.get(inst.reg2);
        const valBuf = new Float64Array([val]);
        const keyBuf = new Float64Array([key]);
        const valView = new Uint32Array(valBuf.buffer);
        const keyView = new Uint32Array(keyBuf.buffer);
        valView[0] ^= keyView[0];
        valView[1] ^= keyView[1];
        this.registers.set(inst.reg1, valBuf[0]);
        this.pc++;
        break;
      }
      case CryptoOp.KEY_FORGE: {
        // Forge de clé : génère une clé pseudo-aléatoire basée sur l'entropie
        const xi = this.registers.get(RegisterId.XI);
        const pi = this.registers.get(RegisterId.PI);
        const key = Math.sin(xi * 12.9898 + pi * 78.233) * 43758.5453;
        this.registers.set(inst.reg1, key - Math.floor(key));
        this.registers.set(RegisterId.XI, xi + 1); // Avance l'entropie
        this.pc++;
        break;
      }
      case CryptoOp.PROOF_COSMIC: {
        // Preuve cosmique : vérifie que hash(reg1) < seuil epsilon
        const val = this.registers.get(inst.reg1);
        const epsilon = this.registers.get(RegisterId.EPSILON);
        let hash = 2166136261;
        const bytes = new Float64Array([val]);
        const view = new Uint8Array(bytes.buffer);
        for (const byte of view) {
          hash ^= byte;
          hash = Math.imul(hash, 16777619);
        }
        const normalized = (hash >>> 0) / 4294967295;
        this.registers.set(RegisterId.OMEGA, normalized < epsilon ? 1 : 0);
        this.pc++;
        break;
      }
      case CryptoOp.VERIFY_GLYPH: {
        // Vérification de glyphe : compare signature
        const val = this.registers.get(inst.reg1);
        const expected = this.registers.get(inst.reg2);
        const phi = this.registers.get(RegisterId.PHI);
        const sig = Math.sin(val * phi) * 2147483647;
        const epsilon = this.registers.get(RegisterId.EPSILON);
        this.registers.set(RegisterId.OMEGA, Math.abs(sig - expected) < epsilon ? 1 : 0);
        this.pc++;
        break;
      }
      case CryptoOp.SEAL_QUANTUM: {
        // Sceau quantique : scelle la valeur en mémoire avec hash
        const val = this.registers.get(inst.reg1);
        const addr = this.registers.get(inst.reg2);
        let hash = 2166136261;
        const bytes = new Float64Array([val]);
        const view = new Uint8Array(bytes.buffer);
        for (const byte of view) {
          hash ^= byte;
          hash = Math.imul(hash, 16777619);
        }
        this.memory.write(inst.layer, addr, val);
        this.memory.write(inst.layer, addr + 1, hash >>> 0);
        this.pc++;
        break;
      }
    }
  }

  // ─── Exécution RÉSEAU ─────────────────────────────────

  private executeReseau(op: ReseauOp, inst: CosmoInstruction): void {
    switch (op) {
      case ReseauOp.NODE_CONNECT: {
        // Connexion de noeud : stocke l'ID de noeud
        this.registers.set(RegisterId.MU, inst.immediate ?? 0);
        this.pc++;
        break;
      }
      case ReseauOp.MESH_WEAVE: {
        // Tissage de maillage : accumule les connexions
        const mu = this.registers.get(RegisterId.MU);
        const sigma = this.registers.get(RegisterId.SIGMA);
        this.registers.set(RegisterId.SIGMA, sigma + mu);
        this.pc++;
        break;
      }
      case ReseauOp.SIGNAL_BURST: {
        // Rafale de signal : émet la valeur du registre en sortie
        const val = this.registers.get(inst.reg1);
        this.output.push(val);
        this.pc++;
        break;
      }
      case ReseauOp.RELAY_CHAIN: {
        // Chaîne de relais : propage la valeur à travers les couches
        const val = this.registers.get(inst.reg1);
        for (let layer = 0; layer <= LayerId.LUMINA; layer++) {
          const addr = this.registers.get(RegisterId.SIGMA);
          this.memory.write(layer as LayerId, addr, val * FRACTAL_LAYERS[layer].energy);
        }
        this.pc++;
        break;
      }
      case ReseauOp.ORBIT_SYNC: {
        // Sync orbitale : synchronise le registre PI avec la couche
        const layerFreq = FRACTAL_LAYERS[inst.layer].frequency;
        const theta = this.registers.get(RegisterId.THETA);
        this.registers.set(RegisterId.PI, Math.sin(theta * layerFreq));
        this.pc++;
        break;
      }
      case ReseauOp.PEER_DISCOVER: {
        // Découverte de pair : incrémente le compteur infini
        const inf = this.registers.get(RegisterId.INFINITY);
        this.registers.set(RegisterId.INFINITY, inf + 1);
        this.pc++;
        break;
      }
      case ReseauOp.CHANNEL_OPEN: {
        // Ouverture de canal : prépare un canal de communication
        const channelId = inst.immediate ?? 0;
        this.registers.set(RegisterId.LAMBDA, channelId);
        this.pc++;
        break;
      }
      case ReseauOp.BROADCAST_WAVE: {
        // Onde de diffusion : broadcast la valeur à tous les canaux
        const val = this.registers.get(inst.reg1);
        this.output.push(val);
        // Propage dans toutes les couches à l'adresse courante
        const addr = this.registers.get(RegisterId.LAMBDA);
        for (let layer = 0; layer <= LayerId.LUMINA; layer++) {
          this.memory.write(layer as LayerId, addr, val);
        }
        this.pc++;
        break;
      }
    }
  }

  // ─── Propagation & Harmonisation ──────────────────────

  private propagateEffects(inst: CosmoInstruction): void {
    // Propage les changements d'énergie aux couches adjacentes
    const layerIdx = inst.layer;
    if (layerIdx > 0) {
      const prevLayer = (layerIdx - 1) as LayerId;
      const res = computeResonance(layerIdx, prevLayer);
      if (res > 0.5) {
        const delta = this.registers.get(RegisterId.DELTA);
        this.registers.set(RegisterId.DELTA, delta + res * 0.1);
      }
    }
    if (layerIdx < LayerId.LUMINA) {
      const nextLayer = (layerIdx + 1) as LayerId;
      const res = computeResonance(layerIdx, nextLayer);
      if (res > 0.5) {
        const delta = this.registers.get(RegisterId.DELTA);
        this.registers.set(RegisterId.DELTA, delta + res * 0.1);
      }
    }
  }

  private harmonize(): void {
    // Harmonise l'état : atténue le delta, normalise theta
    const delta = this.registers.get(RegisterId.DELTA);
    this.registers.set(RegisterId.DELTA, delta * 0.99); // Atténuation

    const theta = this.registers.get(RegisterId.THETA);
    this.registers.set(RegisterId.THETA, theta % (2 * Math.PI)); // Normalise angle
  }

  // ─── Accesseurs ───────────────────────────────────────

  getState(): VMState { return this.state; }
  getEnergy(): number { return this.energy; }
  getCurrentLayer(): LayerId { return this.currentLayer; }
  getRegisters(): CosmicRegisters { return this.registers.clone(); }
  getOutput(): number[] { return [...this.output]; }
  getClock(): { cycle: number; phase: PlanckPhase; totalPlanck: number } {
    return {
      cycle: this.clock.cycle,
      phase: this.clock.phase,
      totalPlanck: this.clock.totalPlanck,
    };
  }

  /** Enregistre un handler réseau */
  onNetwork(event: string, handler: (data: any) => void): void {
    this.networkHandlers.set(event, handler);
  }
}
