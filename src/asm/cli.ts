/**
 * CLI CosmoASM — Exécute des programmes CosmoASM
 *
 * Usage: npx ts-node src/asm/cli.ts <fichier.cosmo>
 */

import * as fs from 'fs';
import * as path from 'path';
import { parseCosmoASM } from './parser';
import { disassemble } from './disassembler';
import { CosmoVM, VMState } from '../vm/cosmovm';
import { FRACTAL_LAYERS } from '../core/layers';
import { REGISTER_META } from '../core/registers';

function main(): void {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('╔══════════════════════════════════════════╗');
    console.log('║       CosmoASM — Assembleur Cosmique     ║');
    console.log('║        Cosmorare Protocole v0.1           ║');
    console.log('╚══════════════════════════════════════════╝');
    console.log('');
    console.log('Usage: npx cosmoasm <fichier.cosmo> [options]');
    console.log('');
    console.log('Options:');
    console.log('  --trace     Active le traçage d\'exécution');
    console.log('  --disasm    Désassemble au lieu d\'exécuter');
    console.log('  --debug     Mode debug verbeux');
    console.log('  --max-cycles <n>  Limite de cycles (défaut: 10000)');
    process.exit(0);
  }

  const filePath = args[0];
  const trace = args.includes('--trace');
  const disasm = args.includes('--disasm');
  const debug = args.includes('--debug');
  const maxCyclesIdx = args.indexOf('--max-cycles');
  const maxCycles = maxCyclesIdx >= 0 ? parseInt(args[maxCyclesIdx + 1]) : 10000;

  // Lit le fichier source
  let source: string;
  try {
    source = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    console.error(`Erreur: impossible de lire '${filePath}'`);
    process.exit(1);
  }

  const programName = path.basename(filePath, path.extname(filePath));

  // Parse
  console.log(`⊞ Assemblage de '${programName}'...`);
  const program = parseCosmoASM(source, { name: programName });
  console.log(`  ${program.instructions.length} instructions, ${program.labels.size} labels`);

  // Désassemblage
  if (disasm) {
    console.log('');
    console.log(disassemble(program));
    return;
  }

  // Exécution
  console.log('');
  console.log('🌀 Lancement du Planck Loop...');
  console.log('');

  const vm = new CosmoVM({ maxCycles, debug, traceExecution: trace });
  vm.load(program);

  const startTime = Date.now();
  const result = vm.run();
  const elapsed = Date.now() - startTime;

  // Résultats
  console.log('═══════════════════════════════════════════');
  console.log(`État final: ${result.state}`);
  console.log(`Cycles: ${result.cycles} | Planck total: ${result.totalPlanck}`);
  console.log(`Énergie: ${result.energy.toFixed(4)}`);
  console.log(`Temps réel: ${elapsed}ms`);
  console.log('');

  // Registres
  console.log('── Registres Cosmiques ──');
  for (const meta of REGISTER_META) {
    const val = result.registers[meta.name];
    if (val !== meta.defaultValue) {
      console.log(`  ${meta.name}(${meta.symbol}) = ${val}`);
    }
  }

  // Sortie
  if (result.output.length > 0) {
    console.log('');
    console.log('── Sortie ──');
    for (const val of result.output) {
      console.log(`  ✦ ${val}`);
    }
  }

  // Trace
  if (trace && result.trace.length > 0) {
    console.log('');
    console.log('── Trace d\'exécution ──');
    for (const t of result.trace) {
      const opName = t.instruction.comment ?? `0x${t.instruction.opcode.toString(16)}`;
      const layer = FRACTAL_LAYERS[t.layer].symbol;
      console.log(`  [${t.cycle}] ${layer} E=${t.energy.toFixed(2)} | ${opName}`);
    }
  }

  console.log('');
  console.log(result.state === VMState.HALTED ? '☀ Programme terminé avec succès' : '⧖ Programme arrêté');
}

main();
