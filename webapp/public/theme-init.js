// Theme initialization — runs before React to prevent flash of wrong theme.
// Loaded as external script to comply with CSP script-src 'self'.
try {
  var t = localStorage.getItem('strangrz_theme');
  if (t) document.documentElement.setAttribute('data-theme', t);
} catch (e) {}
