// Applies the saved theme before Angular starts (no white flash). Keep in sync with ThemeService.
// A separate file (not an inline script) so the Content-Security-Policy can stay at script-src 'self'.
(function () {
  var theme;
  try {
    theme = localStorage.getItem('finances-theme');
  } catch (e) {}
  if (theme !== 'light' && theme !== 'dark') {
    theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  document.documentElement.setAttribute('data-bs-theme', theme);
})();
