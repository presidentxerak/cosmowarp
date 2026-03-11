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
                'background:#111111;border:1px solid rgba(255,255,255,0.15);padding:12px 20px;' +
                'color:#cccccc;font-size:13px;font-family:Inter,sans-serif;display:flex;gap:12px;align-items:center;'
              );
              banner.innerHTML = '<span>\u2B21 Strangrz update available</span>' +
                '<button style="background:rgba(255,255,255,0.1);border:1px solid rgba(255,255,255,0.2);' +
                'color:#ffffff;padding:4px 12px;cursor:pointer;font-size:12px" ' +
                'onclick="window.location.reload()">Reload</button>' +
                '<button style="background:none;border:none;color:#666666;cursor:pointer;font-size:14px" ' +
                'onclick="this.parentElement.remove()">\u2715</button>';
              document.body.appendChild(banner);
            }
          });
        });
      })
      .catch(() => { /* SW registration failed — app still works */ });
  });
}
