import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'
import es from '@/i18n/locales/es.json'
import { saludoLogin } from './authHelpers'

/**
 * Re-QA #503 (QA5 área 2 fila 27): un dueño EMPRENDEDOR veía «¡Bienvenido, Admin!» al entrar por /login → /mode-select.
 * Guarda de regresión: todo saludo de login sale de saludoLogin(rol, nombre) y «welcomeAdmin» solo se usa ahí.
 */
const SRC = join(__dirname, '..', '..')

function archivos(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n)
    if (statSync(p).isDirectory()) return n === 'locales' ? [] : archivos(p)
    return /\.(ts|tsx)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : []
  })
}

const tEs = (clave: string, op?: Record<string, unknown>): string => {
  const v = clave.split('.').reduce<unknown>((o, k) => (o as Record<string, unknown>)?.[k], es) as string
  return v.replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(op?.[k] ?? ''))
}

describe('Saludo de login: un solo origen (re-QA #503)', () => {
  it('login por contraseña de un dueño EMPRENDEDOR → «¡Hola, Diego!», nunca «Admin»', () => {
    const msg = saludoLogin('EMPRENDEDOR', 'Diego Ficticio', tEs)
    expect(msg).toBe('¡Hola, Diego!')
    expect(msg).not.toMatch(/Admin/)
  })

  it('«login.welcomeAdmin» solo se resuelve dentro de authHelpers.saludoLogin', () => {
    const usos = archivos(SRC).filter((p) => readFileSync(p, 'utf8').includes('login.welcomeAdmin'))
    expect(usos.map((p) => relative(SRC, p).replaceAll('\\', '/'))).toEqual(['pages/auth/authHelpers.ts'])
  })

  it('los toasts de éxito de login (contraseña/2FA/WebAuthn y SSO) llaman a saludoLogin', () => {
    for (const f of ['pages/auth/useLoginFlow.ts', 'pages/SSOComplete.tsx']) {
      const src = readFileSync(join(SRC, f), 'utf8')
      expect(src, f).toMatch(/toast\(\{ message: saludoLogin\(data\.rol, data\.nombre, t\)/)
      expect(src, f).not.toMatch(/¡Bienvenido, \$\{/)
    }
  })
})
