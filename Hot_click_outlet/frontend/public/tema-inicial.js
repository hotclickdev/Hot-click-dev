/* Evita FOUC: dark solo en panel; marketplace/auth arrancan claros. */
(function () {
  try {
    var path = location.pathname || '/'
    var panel =
      path === '/admin' || path.indexOf('/admin/') === 0 ||
      path === '/emprendedor' || path.indexOf('/emprendedor/') === 0 ||
      path === '/pyme' || path.indexOf('/pyme/') === 0 ||
      path === '/negocio-plus' || path.indexOf('/negocio-plus/') === 0
    var saved = JSON.parse(localStorage.getItem('hotclick-ui') || '{}')
    var theme = saved.state && saved.state.theme
    var dark = panel && theme === 'dark'
    document.documentElement.classList.add(dark ? 'dark' : 'light')
    var meta = document.querySelector('meta[name="theme-color"]')
    if (meta) meta.setAttribute('content', dark ? '#0E1116' : '#F8F9FB')
  } catch (_) { /* ignore */ }
})()
