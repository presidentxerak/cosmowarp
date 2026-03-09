import { useState, useRef, useCallback, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';

/* ─── Generative Art Algorithms ──────────────────────── */

interface GenParams {
  seed: number;
  palette: string[];
  complexity: number;
  style: GenStyle;
  width: number;
  height: number;
}

type GenStyle = 'flow-field' | 'geometric' | 'cellular' | 'particles' | 'fractal' | 'waves';

const PALETTES: { name: string; colors: string[] }[] = [
  { name: 'Cosmos', colors: ['#0a0a2e', '#1a1a4e', '#6366f1', '#a78bfa', '#e0e7ff'] },
  { name: 'Sunset', colors: ['#1a0a0a', '#4a1a1a', '#ef4444', '#f97316', '#fbbf24'] },
  { name: 'Ocean', colors: ['#0a1a2e', '#0e4d6b', '#0ea5e9', '#22d3ee', '#ecfeff'] },
  { name: 'Forest', colors: ['#0a1a0a', '#1a4a1a', '#22c55e', '#86efac', '#f0fdf4'] },
  { name: 'Monochrome', colors: ['#000000', '#1a1a1a', '#555555', '#aaaaaa', '#ffffff'] },
  { name: 'Neon', colors: ['#0a0a0a', '#ff00ff', '#00ffff', '#ff0088', '#ffff00'] },
  { name: 'Pastel', colors: ['#fef3c7', '#fce7f3', '#ddd6fe', '#cffafe', '#d1fae5'] },
  { name: 'Ember', colors: ['#1c1917', '#44403c', '#dc2626', '#ea580c', '#fbbf24'] },
];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function drawFlowField(ctx: CanvasRenderingContext2D, p: GenParams) {
  const rand = seededRandom(p.seed);
  const { width: w, height: h, palette, complexity } = p;
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, w, h);

  const scale = 30 - complexity * 2;
  const cols = Math.ceil(w / scale);
  const rows = Math.ceil(h / scale);

  // Generate flow field
  const field: number[][] = [];
  for (let y = 0; y < rows; y++) {
    field[y] = [];
    for (let x = 0; x < cols; x++) {
      field[y][x] = (Math.sin(x * 0.1 * rand() + p.seed) + Math.cos(y * 0.1 * rand() + p.seed)) * Math.PI * 2;
    }
  }

  // Draw particles following the field
  const numParticles = 800 + complexity * 200;
  for (let i = 0; i < numParticles; i++) {
    let x = rand() * w;
    let y = rand() * h;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = palette[1 + Math.floor(rand() * (palette.length - 1))];
    ctx.globalAlpha = 0.3 + rand() * 0.5;
    ctx.lineWidth = 0.5 + rand() * 2;

    for (let s = 0; s < 50 + complexity * 10; s++) {
      const col = Math.floor(x / scale);
      const row = Math.floor(y / scale);
      if (col < 0 || col >= cols || row < 0 || row >= rows) break;
      const angle = field[row][col];
      x += Math.cos(angle) * 2;
      y += Math.sin(angle) * 2;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function drawGeometric(ctx: CanvasRenderingContext2D, p: GenParams) {
  const rand = seededRandom(p.seed);
  const { width: w, height: h, palette, complexity } = p;
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, w, h);

  const numShapes = 20 + complexity * 15;
  for (let i = 0; i < numShapes; i++) {
    const x = rand() * w;
    const y = rand() * h;
    const size = 20 + rand() * (100 + complexity * 20);
    const sides = 3 + Math.floor(rand() * 6);
    const rotation = rand() * Math.PI * 2;

    ctx.beginPath();
    for (let s = 0; s <= sides; s++) {
      const angle = rotation + (s / sides) * Math.PI * 2;
      const px = x + Math.cos(angle) * size;
      const py = y + Math.sin(angle) * size;
      if (s === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    if (rand() > 0.5) {
      ctx.fillStyle = palette[1 + Math.floor(rand() * (palette.length - 1))];
      ctx.globalAlpha = 0.1 + rand() * 0.4;
      ctx.fill();
    } else {
      ctx.strokeStyle = palette[1 + Math.floor(rand() * (palette.length - 1))];
      ctx.globalAlpha = 0.3 + rand() * 0.6;
      ctx.lineWidth = 1 + rand() * 3;
      ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

function drawCellular(ctx: CanvasRenderingContext2D, p: GenParams) {
  const rand = seededRandom(p.seed);
  const { width: w, height: h, palette, complexity } = p;
  const cellSize = Math.max(4, 16 - complexity);
  const cols = Math.ceil(w / cellSize);
  const rows = Math.ceil(h / cellSize);

  // Initialize grid
  let grid: boolean[][] = [];
  for (let y = 0; y < rows; y++) {
    grid[y] = [];
    for (let x = 0; x < cols; x++) {
      grid[y][x] = rand() > 0.55;
    }
  }

  // Run cellular automata
  const generations = 5 + complexity;
  for (let g = 0; g < generations; g++) {
    const next: boolean[][] = [];
    for (let y = 0; y < rows; y++) {
      next[y] = [];
      for (let x = 0; x < cols; x++) {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            const ny = (y + dy + rows) % rows;
            const nx = (x + dx + cols) % cols;
            if (grid[ny][nx]) neighbors++;
          }
        }
        next[y][x] = grid[y][x] ? (neighbors === 2 || neighbors === 3) : (neighbors === 3);
      }
    }
    grid = next;
  }

  // Draw
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, w, h);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (grid[y][x]) {
        const ci = 1 + Math.floor((x + y) / (cols + rows) * (palette.length - 1));
        ctx.fillStyle = palette[Math.min(ci, palette.length - 1)];
        ctx.globalAlpha = 0.6 + rand() * 0.4;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }
  ctx.globalAlpha = 1;
}

function drawParticles(ctx: CanvasRenderingContext2D, p: GenParams) {
  const rand = seededRandom(p.seed);
  const { width: w, height: h, palette, complexity } = p;
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, w, h);

  const numParticles = 100 + complexity * 50;
  const particles = Array.from({ length: numParticles }, () => ({
    x: rand() * w,
    y: rand() * h,
    vx: (rand() - 0.5) * 4,
    vy: (rand() - 0.5) * 4,
    size: 2 + rand() * 6,
    color: palette[1 + Math.floor(rand() * (palette.length - 1))],
  }));

  // Draw connections
  ctx.globalAlpha = 0.1;
  for (let i = 0; i < particles.length; i++) {
    for (let j = i + 1; j < particles.length; j++) {
      const dx = particles[i].x - particles[j].x;
      const dy = particles[i].y - particles[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 80 + complexity * 10) {
        ctx.beginPath();
        ctx.moveTo(particles[i].x, particles[i].y);
        ctx.lineTo(particles[j].x, particles[j].y);
        ctx.strokeStyle = particles[i].color;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  // Draw particles
  for (const pt of particles) {
    ctx.globalAlpha = 0.5 + rand() * 0.5;
    ctx.beginPath();
    ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
    ctx.fillStyle = pt.color;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawFractal(ctx: CanvasRenderingContext2D, p: GenParams) {
  const rand = seededRandom(p.seed);
  const { width: w, height: h, palette, complexity } = p;
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, w, h);

  const maxIter = 50 + complexity * 20;
  const zoom = 2.5 + rand() * 1.5;
  const cx = -0.7 + (rand() - 0.5) * 0.5;
  const cy = (rand() - 0.5) * 0.5;

  const imageData = ctx.createImageData(w, h);
  for (let px = 0; px < w; px++) {
    for (let py = 0; py < h; py++) {
      let x = (px - w / 2) / (w / zoom) + cx;
      let y = (py - h / 2) / (h / zoom) + cy;
      let iter = 0;
      const x0 = x, y0 = y;

      while (x * x + y * y < 4 && iter < maxIter) {
        const xTemp = x * x - y * y + x0;
        y = 2 * x * y + y0;
        x = xTemp;
        iter++;
      }

      const idx = (py * w + px) * 4;
      if (iter === maxIter) {
        const c = hexToRgb(palette[0]);
        imageData.data[idx] = c.r;
        imageData.data[idx + 1] = c.g;
        imageData.data[idx + 2] = c.b;
      } else {
        const t = iter / maxIter;
        const ci = Math.floor(t * (palette.length - 1));
        const c = hexToRgb(palette[Math.min(ci + 1, palette.length - 1)]);
        imageData.data[idx] = c.r;
        imageData.data[idx + 1] = c.g;
        imageData.data[idx + 2] = c.b;
      }
      imageData.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(imageData, 0, 0);
}

function drawWaves(ctx: CanvasRenderingContext2D, p: GenParams) {
  const rand = seededRandom(p.seed);
  const { width: w, height: h, palette, complexity } = p;
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, w, h);

  const numWaves = 8 + complexity * 3;
  for (let i = 0; i < numWaves; i++) {
    const amp = 20 + rand() * 60;
    const freq = 0.005 + rand() * 0.02;
    const phase = rand() * Math.PI * 2;
    const yOff = (i / numWaves) * h;

    ctx.beginPath();
    ctx.moveTo(0, yOff);
    for (let x = 0; x <= w; x += 2) {
      const y = yOff + Math.sin(x * freq + phase + p.seed * 0.01) * amp
        + Math.sin(x * freq * 2.3 + phase * 1.5) * amp * 0.3;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();

    ctx.fillStyle = palette[1 + (i % (palette.length - 1))];
    ctx.globalAlpha = 0.15 + rand() * 0.25;
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  } : { r: 0, g: 0, b: 0 };
}

const STYLE_RENDERERS: Record<GenStyle, (ctx: CanvasRenderingContext2D, p: GenParams) => void> = {
  'flow-field': drawFlowField,
  'geometric': drawGeometric,
  'cellular': drawCellular,
  'particles': drawParticles,
  'fractal': drawFractal,
  'waves': drawWaves,
};

/* ─── Generative Art View ────────────────────────────── */

export default function GenerativeArtView() {
  const { wallet, unlocked, mintWart } = useWallet();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 999999));
  const [paletteIdx, setPaletteIdx] = useState(0);
  const [complexity, setComplexity] = useState(5);
  const [style, setStyle] = useState<GenStyle>('flow-field');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [minting, setMinting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [canvasSize] = useState(800);

  const params: GenParams = {
    seed,
    palette: PALETTES[paletteIdx].colors,
    complexity,
    style,
    width: canvasSize,
    height: canvasSize,
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = params.width;
    canvas.height = params.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    STYLE_RENDERERS[params.style](ctx, params);
  }, [params.seed, params.style, params.complexity, paletteIdx, params.width, params.height]);

  useEffect(() => {
    render();
  }, [render]);

  const randomize = () => {
    setSeed(Math.floor(Math.random() * 999999));
  };

  const handleMint = async () => {
    if (!wallet || !unlocked) return;
    if (!title.trim()) { setResult({ ok: false, msg: 'Title required' }); return; }

    const canvas = canvasRef.current;
    if (!canvas) return;

    setMinting(true);
    setResult(null);
    try {
      const dataUrl = canvas.toDataURL('image/png');
      const priceVal = price ? parseFloat(price) : null;
      if (priceVal !== null && (isNaN(priceVal) || priceVal <= 0)) {
        setResult({ ok: false, msg: 'Invalid price' }); setMinting(false); return;
      }

      const descFull = `${description}\n\n[Generative Art]\nStyle: ${style}\nSeed: ${seed}\nPalette: ${PALETTES[paletteIdx].name}\nComplexity: ${complexity}`;
      const wart = await mintWart(title, descFull, dataUrl, priceVal, 10, 'unique', null, null, 'image');
      setResult({ ok: true, msg: `Minted "${wart.title}" (Edition #${wart.editionNumber})` });
      setTitle('');
      setDescription('');
      setPrice('');
      setTimeout(() => setResult(null), 4000);
    } catch (err) {
      setResult({ ok: false, msg: err instanceof Error ? err.message : 'Mint failed' });
    } finally {
      setMinting(false);
    }
  };

  if (!wallet || !unlocked) {
    return (
      <div className="glass-panel p-8 text-center max-w-md mx-auto">
        <p className="text-base opacity-50">Unlock your wallet to create generative art.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="glass-panel p-4">
        <h2 className="text-title-sm font-bold opacity-100 font-title mb-1">Generative Art Studio</h2>
        <p className="text-body-sm opacity-40 mb-4">
          Create unique algorithmic artworks inspired by Art Blocks. Each piece is deterministic — the same seed always produces the same art.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Canvas preview */}
          <div className="space-y-3">
            <div className="aspect-square bg-black overflow-hidden">
              <canvas
                ref={canvasRef}
                className="w-full h-full"
                style={{ imageRendering: 'auto' }}
              />
            </div>
            <div className="flex gap-2">
              <button
                className="warp-button flex-1 text-body-sm"
                onClick={randomize}
              >
                Randomize
              </button>
              <div className="flex items-center gap-1 px-3 opacity-40 text-body-sm">
                Seed: <span className="font-mono">{seed}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-4">
            {/* Style */}
            <div>
              <label className="text-[10px] opacity-50 block mb-1">ALGORITHM</label>
              <div className="grid grid-cols-3 gap-1">
                {(['flow-field', 'geometric', 'cellular', 'particles', 'fractal', 'waves'] as GenStyle[]).map(s => (
                  <button
                    key={s}
                    onClick={() => setStyle(s)}
                    className={`py-2 px-2 text-[11px] font-medium transition-all cursor-pointer ${
                      style === s
                        ? 'bg-current/10 opacity-80 border border-current/20'
                        : 'opacity-40 border border-white/10 hover:opacity-60'
                    }`}
                  >
                    {s.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Palette */}
            <div>
              <label className="text-[10px] opacity-50 block mb-1">PALETTE</label>
              <div className="grid grid-cols-4 gap-1">
                {PALETTES.map((pal, i) => (
                  <button
                    key={pal.name}
                    onClick={() => setPaletteIdx(i)}
                    className={`py-2 px-2 text-[11px] transition-all cursor-pointer ${
                      paletteIdx === i
                        ? 'opacity-90 border border-current/20'
                        : 'opacity-40 border border-white/10 hover:opacity-60'
                    }`}
                  >
                    <div className="flex gap-0.5 mb-1 justify-center">
                      {pal.colors.slice(1).map((c, j) => (
                        <div key={j} className="w-3 h-3" style={{ background: c }} />
                      ))}
                    </div>
                    <span className="text-[9px]">{pal.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Complexity */}
            <div>
              <label className="text-[10px] opacity-50 block mb-1">COMPLEXITY: {complexity}</label>
              <input
                type="range"
                min="1"
                max="10"
                value={complexity}
                onChange={e => setComplexity(parseInt(e.target.value))}
                className="w-full accent-white/50"
              />
            </div>

            {/* Seed */}
            <div>
              <label className="text-[10px] opacity-50 block mb-1">SEED</label>
              <input
                className="warp-input"
                type="number"
                value={seed}
                onChange={e => setSeed(parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="h-[1px] bg-white/5" />

            {/* Mint form */}
            <div>
              <label className="text-[10px] opacity-50 block mb-1">TITLE</label>
              <input
                className="warp-input"
                placeholder="Name your generative art"
                value={title}
                onChange={e => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>

            <div>
              <label className="text-[10px] opacity-50 block mb-1">DESCRIPTION (optional)</label>
              <textarea
                className="warp-input min-h-[60px] resize-y"
                placeholder="Describe your algorithmic vision..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={500}
              />
            </div>

            <div>
              <label className="text-[10px] opacity-50 block mb-1">PRICE IN WARPS (optional)</label>
              <input
                className="warp-input"
                type="number"
                placeholder="0"
                min="0"
                step="0.1"
                value={price}
                onChange={e => setPrice(e.target.value)}
              />
            </div>

            <button
              className="warp-button w-full py-3 font-bold"
              onClick={handleMint}
              disabled={minting || !title.trim()}
            >
              {minting ? 'Minting...' : 'Mint Generative Art'}
            </button>

            {result && (
              <p className={`text-body-sm text-center ${result.ok ? 'opacity-80' : 'opacity-60'}`} style={{ color: result.ok ? '#22c55e' : '#ef4444' }}>
                {result.msg}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
