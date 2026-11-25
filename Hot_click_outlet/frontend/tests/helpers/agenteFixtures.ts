import type { Page, Route } from '@playwright/test'

/**
 * Utilidades compartidas por las pruebas E2E de los bots de venta con IA (AG-33).
 * Todo se mockea por red (page.route): nunca se llama a Claude, Meta ni ONVO, y no se usa ninguna clave.
 */

function jwtSinFirmar(claims: Record<string, unknown>) {
  const enc = (obj: unknown) => Buffer.from(JSON.stringify(obj)).toString('base64')
  return `${enc({ alg: 'none', typ: 'JWT' })}.${enc(claims)}.x`
}

/** Sesión ficticia de operador de plataforma (ADMIN): la bandeja vive hoy en /plataforma/bandeja. */
export function sesionAdmin() {
  const s = sesionVendedor()
  return {
    ...s,
    state: {
      ...s.state,
      token: jwtSinFirmar({ exp: Math.floor(Date.now() / 1000) + 3600, rol: 'ADMIN' }),
      userEmail: 'admin@hotclick.test',
      userRole: 'ADMIN',
      userName: 'ADMIN',
      empresaId: null,
      roles: ['ADMIN'],
    },
  }
}

/** Sesión ficticia de vendedor (plan PYME). */
export function sesionVendedor() {
  return {
    state: {
      token: jwtSinFirmar({ exp: Math.floor(Date.now() / 1000) + 3600, rol: 'EMPRENDEDOR' }),
      refreshToken: null,
      userId: 1,
      userEmail: 'vendedor@hotclick.test',
      userRole: 'EMPRENDEDOR',
      userName: 'Vendedor',
      empresaId: 1,
      empresaSlug: 'demo',
      empresaNombre: 'Demo',
      permissions: [],
      roles: ['EMPRENDEDOR'],
    },
    version: 0,
  }
}

/** Evita tours, bienvenida y banner de cookies que taparían la pantalla bajo prueba. */
export async function prepararNavegador(page: Page, sesion?: unknown) {
  await page.addInitScript((auth) => {
    if (auth) localStorage.setItem('hotclick-auth', JSON.stringify(auth))
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({
      analytics: false,
      advertising: false,
      functional: true,
      timestamp: Date.now(),
    }))
    localStorage.setItem('hc-admin-tour-v4-done', '1')
    localStorage.setItem('hc-mm-v1-off', '1')
    localStorage.setItem('hc-mm-v1-welcome-done', '1')
  }, sesion ?? null)
}

export function json(route: Route, cuerpo: unknown, status = 200) {
  return route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(cuerpo) })
}

export const SIN_DATOS = { success: true, data: [] }

/** Respuesta de /tenant/info que deja entrar al panel del vendedor con plan PYME. */
export const TENANT_PYME = { success: true, data: { planNombre: 'PYME', features: {} } }
