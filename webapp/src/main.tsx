import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)

// ─── Service Worker Registration (offline + auto-update) ─────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(import.meta.env.BASE_URL + 'sw.js')
      .then(reg => {
        // Check for updates every hour
        setInterval(() => reg.update(), 60 * 60 * 1000);

        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
              // New version installed — notify user
              const banner = document.createElement('div');
              banner.setAttribute('style',
                'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:9999;' +
                'background:#1e1b4b;border:1px solid rgba(168,85,247,0.4);padding:12px 20px;' +
                'color:#c4b5fd;font-size:13px;font-family:monospace;display:flex;gap:12px;align-items:center;'
              );
              banner.innerHTML = '<span>\u2B21 CosmoWarp update available</span>' +
                '<button style="background:rgba(168,85,247,0.3);border:1px solid rgba(168,85,247,0.5);' +
                'color:#e9d5ff;padding:4px 12px;cursor:pointer;font-size:12px" ' +
                'onclick="window.location.reload()">Reload</button>' +
                '<button style="background:none;border:none;color:#6b7280;cursor:pointer;font-size:14px" ' +
                'onclick="this.parentElement.remove()">\u2715</button>';
              document.body.appendChild(banner);
            }
          });
        });
      })
      .catch(() => { /* SW registration failed — app still works */ });
  });
}
