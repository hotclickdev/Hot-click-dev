import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from '@playwright/test'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const AUTH_DIR = path.join(__dirname, '.auth')
const AUTH_FILE = path.join(AUTH_DIR, 'admin.json')
const MARKER_FILE = path.join(AUTH_DIR, 'credentials.json')

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || 'http://127.0.0.1:3000'
const LOGIN_URLS = [
  `${BASE_URL}/api/auth/login`,
  'http://127.0.0.1:8080/api/auth/login',
]

/**
 * Login admin vía API y persiste storageState + hotclick-auth (Zustand).
 * Sin E2E_ADMIN_EMAIL/PASSWORD escribe marker para que smoke.spec salte admin.
 */
export default async function globalSetup() {
  fs.mkdirSync(AUTH_DIR, { recursive: true })

  const email = process.env.E2E_ADMIN_EMAIL
  const password = process.env.E2E_ADMIN_PASSWORD

  if (!email || !password) {
    fs.writeFileSync(MARKER_FILE, JSON.stringify({ hasCredentials: false }))
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
    console.warn('[global-setup] Sin E2E_ADMIN_EMAIL/PASSWORD — tests admin se saltarán')
    return
  }

  fs.writeFileSync(MARKER_FILE, JSON.stringify({ hasCredentials: true }))

  let data = null
  let lastError = null
  for (const url of LOGIN_URLS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo: email, contrasena: password }),
      })
      if (!res.ok) {
        lastError = `HTTP ${res.status} en ${url}`
        continue
      }
      data = await res.json()
      break
    } catch (err) {
      lastError = `${url}: ${err.message}`
    }
  }

  if (!data?.accessToken) {
    console.warn(`[global-setup] Login admin falló (${lastError}) — tests admin se saltarán`)
    fs.writeFileSync(MARKER_FILE, JSON.stringify({ hasCredentials: false, loginFailed: true }))
    fs.writeFileSync(AUTH_FILE, JSON.stringify({ cookies: [], origins: [] }))
    return
  }

  const browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' })

  const authState = {
    state: {
      token: data.accessToken,
      refreshToken: data.refreshToken ?? null,
      userId: data.id ?? null,
      userEmail: data.correo ?? email,
      userRole: data.rol ?? 'ADMIN',
      userName: data.nombre ?? email.split('@')[0],
      empresaId: data.empresaId ?? null,
      empresaSlug: data.empresaSlug ?? null,
      empresaNombre: data.empresaNombre ?? null,
      permissions: Array.isArray(data.permisos) ? data.permisos : [],
      roles: data.rol ? [data.rol] : ['ADMIN'],
    },
    version: 0,
  }

  await page.evaluate((payload) => {
    localStorage.setItem('hotclick-auth', JSON.stringify(payload))
  }, authState)

  await page.context().storageState({ path: AUTH_FILE })
  await browser.close()
  console.log('[global-setup] storageState admin guardado en tests/.auth/admin.json')
}
