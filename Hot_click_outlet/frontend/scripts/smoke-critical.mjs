/**
 * Smoke manual de pantallas críticas (refactor codigo limpio).
 * Usa Playwright Chromium si está disponible; si no, fallback HTTP.
 */
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'

const BASE = process.env.SMOKE_BASE || 'http://127.0.0.1:3000'

const ROUTES = [
  { path: '/', name: 'Home' },
  { path: '/productos', name: 'Catálogo' },
  { path: '/carrito', name: 'Carrito' },
  { path: '/checkout', name: 'Checkout' },
  { path: '/login', name: 'Login' },
  { path: '/registro', name: 'Registro' },
  { path: '/envios', name: 'Envíos' },
  { path: '/servicios', name: 'Servicios' },
  { path: '/perfil', name: 'Perfil' },
  { path: '/mis-pedidos', name: 'Mis pedidos' },
  { path: '/admin', name: 'Admin dashboard' },
  { path: '/admin/productos', name: 'Admin productos' },
  { path: '/admin/pedidos', name: 'Admin pedidos' },
  { path: '/admin/pos', name: 'Admin POS' },
  { path: '/admin/marcas', name: 'Admin marcas' },
]

const IGNORE_CONSOLE = [
  /Download the React DevTools/i,
  /\[vite\] connecting/i,
  /\[vite\] connected/i,
  /Failed to load resource: the server responded with a status of 401/i,
  /Failed to load resource: the server responded with a status of 403/i,
]

async function loadPlaywright() {
  try {
    const require = createRequire(import.meta.url)
    return require('playwright')
  } catch {
    try {
      const { execSync } = await import('node:child_process')
      execSync('npm install -D playwright@1.52.0 --no-save --no-package-lock', {
        cwd: new URL('.', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'),
        stdio: 'inherit',
      })
      const require = createRequire(import.meta.url)
      return require('playwright')
    } catch (err) {
      console.error('No se pudo cargar Playwright:', err.message)
      return null
    }
  }
}

function shouldIgnore(text) {
  return IGNORE_CONSOLE.some((re) => re.test(text))
}

async function smokeWithPlaywright(pw) {
  const { chromium } = pw
  const browser = await chromium.launch({ headless: true })
  const results = []

  for (const route of ROUTES) {
    const page = await browser.newPage()
    const errors = []
    const pageErrors = []

    page.on('console', (msg) => {
      if (msg.type() !== 'error') return
      const text = msg.text()
      if (shouldIgnore(text)) return
      errors.push(text)
    })
    page.on('pageerror', (err) => pageErrors.push(err.message))

    const url = `${BASE}${route.path}`
    let status = 'ok'
    let detail = ''
    try {
      const res = await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
      await page.waitForTimeout(1200)
      const http = res?.status() ?? 0
      const body = await page.locator('body').innerText().catch(() => '')
      const blank = !body || body.trim().length < 5
      if (http >= 400) {
        status = 'fail'
        detail = `HTTP ${http}`
      } else if (pageErrors.length || errors.length) {
        status = 'fail'
        detail = [...pageErrors, ...errors].slice(0, 3).join(' | ')
      } else if (blank) {
        status = 'warn'
        detail = 'body casi vacío'
      } else {
        detail = `HTTP ${http}, texto ok`
      }
    } catch (err) {
      status = 'fail'
      detail = err.message
    }

    results.push({ ...route, status, detail })
    await page.close()
  }

  await browser.close()
  return results
}

async function smokeHttpOnly() {
  const results = []
  for (const route of ROUTES) {
    const url = `${BASE}${route.path}`
    try {
      const res = await fetch(url)
      const text = await res.text()
      const hasRoot = text.includes('id="root"') || text.includes("id='root'")
      results.push({
        ...route,
        status: res.ok && hasRoot ? 'ok' : 'fail',
        detail: `HTTP ${res.status}${hasRoot ? ', #root' : ', sin #root'}`,
      })
    } catch (err) {
      results.push({ ...route, status: 'fail', detail: err.message })
    }
  }
  return results
}

function print(results) {
  console.log('\n=== SMOKE pantallas críticas ===\n')
  for (const r of results) {
    const mark = r.status === 'ok' ? 'PASS' : r.status === 'warn' ? 'WARN' : 'FAIL'
    console.log(`[${mark}] ${r.name.padEnd(18)} ${r.path.padEnd(22)} ${r.detail}`)
  }
  const fails = results.filter((r) => r.status === 'fail')
  console.log(`\nTotal: ${results.length} | FAIL: ${fails.length}`)
  if (fails.length) process.exitCode = 1
}

const pw = await loadPlaywright()
const results = pw ? await smokeWithPlaywright(pw) : await smokeHttpOnly()
print(results)
