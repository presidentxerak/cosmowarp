import { useState, useRef, useEffect } from 'react';
import { runMiningProgram } from '../engine/miner';

interface ConsoleLine {
  text: string;
  type: 'input' | 'output' | 'error' | 'info';
}

const WELCOME = [
  { text: '\u2726 CosmoWarp Console v0.1', type: 'info' as const },
  { text: 'Type CosmoASM instructions or use /help for commands.', type: 'info' as const },
  { text: '', type: 'info' as const },
];

export default function ConsoleView() {
  const [lines, setLines] = useState<ConsoleLine[]>(WELCOME);
  const [input, setInput] = useState('');
  const [buffer, setBuffer] = useState<string[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState(-1);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [lines]);

  const addLine = (text: string, type: ConsoleLine['type']) => {
    setLines(prev => [...prev, { text, type }]);
  };

  const execute = (cmd: string) => {
    addLine(`> ${cmd}`, 'input');
    setHistory(prev => [cmd, ...prev.slice(0, 50)]);
    setHistIdx(-1);

    const trimmed = cmd.trim();

    if (trimmed.startsWith('/')) {
      handleCommand(trimmed);
      return;
    }

    // Accumulate lines for multi-line program
    if (trimmed.endsWith('\\')) {
      setBuffer(prev => [...prev, trimmed.slice(0, -1)]);
      addLine('  ... (continue, or type /run)', 'info');
      return;
    }

    // Single instruction or end of buffer
    const allLines = [...buffer, trimmed];
    setBuffer([]);

    if (allLines.join('').trim().length === 0) return;

    const program = allLines.join('\n');
    try {
      const result = runMiningProgram(program);
      addLine(`\u2699 Cycles: ${result.cycles} | Energy: ${result.energy.toFixed(1)} | Hash: ${result.hash.toFixed(6)}`, 'output');
      if (result.output.length > 0) {
        addLine(`\u25B6 Output: [${result.output.map(v => typeof v === 'number' ? v.toFixed(4) : v).join(', ')}]`, 'output');
      }
      if (!result.success) {
        addLine('\u26A0 Warning: hit cycle limit', 'error');
      }
    } catch (err) {
      addLine(`\u2717 Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    }
  };

  const handleCommand = (cmd: string) => {
    switch (cmd.toLowerCase()) {
      case '/help':
        addLine('Commands:', 'info');
        addLine('  /help       - Show this help', 'info');
        addLine('  /clear      - Clear console', 'info');
        addLine('  /run        - Execute buffered lines', 'info');
        addLine('  /example    - Load example program', 'info');
        addLine('  /registers  - List all registers', 'info');
        addLine('  /opcodes    - List all opcodes', 'info');
        addLine('', 'info');
        addLine('Write CosmoASM directly. End with \\ for multi-line.', 'info');
        break;
      case '/clear':
        setLines([]);
        setBuffer([]);
        break;
      case '/run': {
        if (buffer.length === 0) {
          addLine('Nothing in buffer.', 'info');
          return;
        }
        const program = buffer.join('\n');
        setBuffer([]);
        try {
          const result = runMiningProgram(program);
          addLine(`\u2699 Cycles: ${result.cycles} | Energy: ${result.energy.toFixed(1)}`, 'output');
          if (result.output.length > 0) {
            addLine(`\u25B6 Output: [${result.output.map(v => typeof v === 'number' ? v.toFixed(4) : v).join(', ')}]`, 'output');
          }
        } catch (err) {
          addLine(`\u2717 Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
        }
        break;
      }
      case '/example':
        addLine('Loading example...', 'info');
        const example = `WARP_INIT GRID.R\u03A9, R\u03A9\\
ENERGY_LOAD GRID.R\u03A9, #42\\
HASH_STAR GRID.R\u03A9\\
SIGNAL_BURST GRID.R\u03A9`;
        setInput(example.split('\\')[0]);
        addLine('Paste or type: WARP_INIT GRID.R\u03A9, R\u03A9', 'info');
        break;
      case '/registers':
        addLine('Registers: R\u03A9(acc) R\u03C6(phi) R\u03C8(psi) R\u221E(loop) R\u03B4(diff) R\u03BB(code)', 'info');
        addLine('           R\u03BC(mem) R\u03C0(rot) R\u03C3(sum) R\u03B8(dir) R\u03B5(prec) R\u03BE(rand)', 'info');
        break;
      case '/opcodes':
        addLine('FLUX: WARP_INIT ENERGY_LOAD FLUX_GATE QUANTUM_JUMP FOLD_SPACE VOID_BRIDGE SYNC_PULSE DRIFT_ALIGN', 'info');
        addLine('MIND: MIND_LINK DREAM_WEAVE SOUL_SYNC ECHO_THOUGHT PSI_BURST NEURAL_MAP KARMA_CHECK COSMO_SENSE', 'info');
        addLine('CRYPTO: HASH_STAR SIGN_NEBULA ENCRYPT_VOID DECRYPT_LIGHT KEY_FORGE PROOF_COSMIC VERIFY_GLYPH SEAL_QUANTUM', 'info');
        addLine('NET: NODE_CONNECT MESH_WEAVE SIGNAL_BURST RELAY_CHAIN ORBIT_SYNC PEER_DISCOVER CHANNEL_OPEN BROADCAST_WAVE', 'info');
        break;
      default:
        addLine(`Unknown command: ${cmd}`, 'error');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      execute(input);
      setInput('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const idx = Math.min(histIdx + 1, history.length - 1);
        setHistIdx(idx);
        setInput(history[idx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (histIdx > 0) {
        const idx = histIdx - 1;
        setHistIdx(idx);
        setInput(history[idx]);
      } else {
        setHistIdx(-1);
        setInput('');
      }
    }
  };

  return (
    <div className="glass-panel p-4 flex flex-col" style={{ height: 'calc(100vh - 120px)', minHeight: '400px' }}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-bold text-warp-300">{'\u25B7'} CosmoCode Console</h2>
        <button className="warp-button text-[10px] px-2 py-1" onClick={() => { setLines(WELCOME); setBuffer([]); }}>
          Clear
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 bg-cosmic-900/80 rounded-lg p-3 overflow-y-auto text-xs font-mono mb-2 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line, i) => (
          <div key={i} className={
            line.type === 'input' ? 'text-warp-300' :
            line.type === 'output' ? 'text-energy-400' :
            line.type === 'error' ? 'text-red-400' :
            'text-gray-500'
          }>
            {line.text || '\u00A0'}
          </div>
        ))}
        {buffer.length > 0 && (
          <div className="text-yellow-500/60">... {buffer.length} lines buffered</div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-warp-400 text-sm">{'\u276F'}</span>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent border-none outline-none text-sm text-gray-100 placeholder:text-gray-600"
          placeholder="Enter CosmoASM or /help"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>
    </div>
  );
}
