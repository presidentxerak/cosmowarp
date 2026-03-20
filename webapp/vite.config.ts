import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

/**
 * Vite plugin: add rgba() fallbacks for every color-mix() declaration.
 *
 * Safari < 16.2 and older WebKit browsers do not support color-mix().
 * Tailwind CSS v4 generates color-mix(in oklab, …) for all "/X" opacity
 * modifiers (e.g. bg-current/10, border-white/20, text-white/80).
 *
 * This plugin injects a safe rgba() fallback BEFORE each color-mix()
 * value so unsupporting browsers silently use the fallback while modern
 * browsers override it with the color-mix() value.
 */
function safariColorMixFallback(): Plugin {
  function resolveBaseColor(raw: string): [number, number, number] | null {
    const t = raw.trim();
    if (t === 'currentcolor' || t === 'currentColor') return [255, 255, 255]; // dark-theme default
    if (t === 'var(--color-white)') return [255, 255, 255];
    if (t === 'var(--color-black)') return [0, 0, 0];
    if (t === 'var(--color-red-400)') return [248, 113, 113];
    if (t === 'var(--color-red-500)') return [239, 68, 68];
    if (t === 'var(--color-amber-400)') return [251, 191, 36];
    if (t === 'var(--color-pink-600)') return [219, 39, 119];
    if (t === 'var(--color-gray-700)') return [55, 65, 81];
    if (t === 'var(--color-gray-800)') return [31, 41, 55];
    return null;
  }

  function addFallbacks(css: string): string {
    // Match: property: color-mix(in oklab, <base> <pct>%, transparent)
    // <base> can be currentcolor or var(--name) (contains nested parens)
    // Note: Tailwind minifies to no-space between var()) and percentage
    return css.replace(
      /([a-z-]+)\s*:\s*color-mix\(in oklab\s*,\s*((?:var\([^)]+\)|[a-zA-Z]+))\s*(\d+(?:\.\d+)?)%\s*,\s*transparent\)/g,
      (match, prop, base, pct) => {
        const rgb = resolveBaseColor(base);
        if (!rgb) return match;
        const alpha = (parseFloat(pct) / 100).toFixed(2);
        const fallback = `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${alpha})`;
        return `${prop}:${fallback};${match}`;
      }
    );
  }

  return {
    name: 'safari-color-mix-fallback',
    enforce: 'post',
    generateBundle(_opts, bundle) {
      for (const key of Object.keys(bundle)) {
        const chunk = bundle[key];
        if (chunk.type === 'asset' && key.endsWith('.css') && typeof chunk.source === 'string') {
          chunk.source = addFallbacks(chunk.source);
        }
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), safariColorMixFallback()],
  base: '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: ['es2020', 'safari14'],
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
  server: {
    host: '0.0.0.0',
    allowedHosts: true,
  },
})
