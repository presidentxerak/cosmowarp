import { useState, useRef, useEffect } from 'react';
import { sha256 } from '../engine/crypto';
import { loadDifficultyState, hashMeetsDifficulty, countLeadingZeroBits, difficultyToTarget } from '../engine/miner';

interface ConsoleLine {
  text: string;
  type: 'input' | 'output' | 'error' | 'info';
}

const WELCOME = [
  { text: '\u2B21 Strangrz Console v2.0', type: 'info' as const },
  { text: 'SHA-256 crypto console. Type text to hash or /help for commands.', type: 'info' as const },
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

    // Hash any text input with SHA-256
    const allLines = [...buffer, trimmed];
    setBuffer([]);

    if (allLines.join('').trim().length === 0) return;

    const text = allLines.join('\n');
    sha256(text).then(hash => {
      const zeroBits = countLeadingZeroBits(hash);
      addLine(`SHA-256: ${hash}`, 'output');
      addLine(`Leading zero bits: ${zeroBits}`, 'output');
    }).catch(err => {
      addLine(`\u2717 Error: ${err instanceof Error ? err.message : 'Unknown error'}`, 'error');
    });
  };

  const handleCommand = (cmd: string) => {
    switch (cmd.toLowerCase()) {
      case '/help':
        addLine('Commands:', 'info');
        addLine('  /help       - Show this help', 'info');
        addLine('  /clear      - Clear console', 'info');
        addLine('  /run        - Execute buffered lines', 'info');
        addLine('  /difficulty - Show current mining difficulty', 'info');
        addLine('  /target     - Show current difficulty target', 'info');
        addLine('  /check <hash> - Check if hash meets difficulty', 'info');
        addLine('', 'info');
        addLine('Type any text to compute its SHA-256 hash.', 'info');
        addLine('End with \\ for multi-line input.', 'info');
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
        const text = buffer.join('\n');
        setBuffer([]);
        sha256(text).then(hash => {
          const zeroBits = countLeadingZeroBits(hash);
          addLine(`SHA-256: ${hash}`, 'output');
          addLine(`Leading zero bits: ${zeroBits}`, 'output');
        });
        break;
      }
      case '/difficulty': {
        const state = loadDifficultyState();
        addLine(`Current difficulty: ${state.currentDifficulty} bits`, 'output');
        addLine(`Blocks mined: ${state.blocksMined}`, 'output');
        addLine(`Last block hash: ${state.lastBlockHash.slice(0, 32)}...`, 'output');
        addLine(`Target block time: 15s`, 'info');
        break;
      }
      case '/target': {
        const st = loadDifficultyState();
        const target = difficultyToTarget(st.currentDifficulty);
        addLine(`Difficulty: ${st.currentDifficulty} bits`, 'output');
        addLine(`Target: ${target.slice(0, 32)}...`, 'output');
        addLine(`Hash must be <= target to be valid`, 'info');
        break;
      }
      default:
        if (cmd.toLowerCase().startsWith('/check ')) {
          const hash = cmd.slice(7).trim();
          if (hash.length !== 64 || !/^[0-9a-f]+$/.test(hash)) {
            addLine('Usage: /check <64-char hex hash>', 'error');
          } else {
            const st = loadDifficultyState();
            const meets = hashMeetsDifficulty(hash, st.currentDifficulty);
            const zeroBits = countLeadingZeroBits(hash);
            addLine(`Hash: ${hash}`, 'output');
            addLine(`Leading zero bits: ${zeroBits} / ${st.currentDifficulty} required`, 'output');
            addLine(meets ? '\u2713 Valid! Hash meets difficulty target.' : '\u2717 Invalid. Hash does not meet difficulty.', meets ? 'output' : 'error');
          }
        } else {
          addLine(`Unknown command: ${cmd}`, 'error');
        }
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
    <div className="glass-panel p-3 sm:p-4 flex flex-col" style={{ height: 'calc(100dvh - 140px)', minHeight: '250px', maxHeight: '85dvh' }}>
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-base font-bold opacity-80">{'\u25B7'} StrangrzCode Console</h2>
        <button className="warp-button text-label px-2 py-1" onClick={() => { setLines(WELCOME); setBuffer([]); }}>
          Clear
        </button>
      </div>

      <div
        ref={scrollRef}
        className="flex-1 bg-current/5 rounded-none p-3 overflow-y-auto text-body-sm font-mono mb-2 cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {lines.map((line, i) => (
          <div key={i} className={
            line.type === 'input' ? 'opacity-80' :
            line.type === 'output' ? 'opacity-80' :
            line.type === 'error' ? 'opacity-70' :
            'opacity-40'
          }>
            {line.text || '\u00A0'}
          </div>
        ))}
        {buffer.length > 0 && (
          <div className="opacity-40">... {buffer.length} lines buffered</div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="opacity-80 text-base">{'\u276F'}</span>
        <input
          ref={inputRef}
          className="flex-1 bg-transparent border-none outline-none text-base opacity-100 placeholder:opacity-30"
          placeholder="Text to hash, or /help"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>
    </div>
  );
}
