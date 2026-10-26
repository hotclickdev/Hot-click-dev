/* Evita FOUC: aplica la preferencia claro/oscuro guardada en toda la app desde el primer pintado
   (igual que temaEfectivoParaRuta en src/utils/temaPorRuta.ts).
   Archivo externo para cumplir la CSP (script-src sin unsafe-inline). */
(function () {
  try {
    var saved = JSON.parse(localStorage.getItem('hotclick-ui') || '{}')
    var theme = saved.state && saved.state.theme
    var dark = theme === 'dark'
    document.documentElement.classList.add(dark ? 'dark' : 'light')
    // Fondo oscuro antes de que cargue el CSS (CSSOM: permitido por la CSP sin unsafe-inline).
    if (dark) {
      document.documentElement.style.backgroundColor = '#050608'
      document.documentElement.style.colorScheme = 'dark'
    }
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', dark ? '#050608' : '#F8F9FB')
  } catch (_) { /* ignore */ }
})()
