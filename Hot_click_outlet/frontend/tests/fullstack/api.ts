import { execFileSync } from 'node:child_process'
import { expect, type APIRequestContext, type Page } from '@playwright/test'

/** Cuentas que crea QaCuentasSeeder (perfil dev, nunca prod) con QA_DEFAULT_PASSWORD. */
export const QA = {
  EMPRENDEDOR: 'qa.emprendedor.demo@hotclick.test',
  PYME: 'qa.pyme.demo@hotclick.test',
  NEGOCIO_PLUS: 'qa.negocioplus.demo@hotclick.test',
} as const

export const claveQa = (): string => {
  const c = process.env.E2E_QA_PASSWORD
  if (!c) throw new Error('Falta E2E_QA_PASSWORD (la genera el workflow; igual a QA_DEFAULT_PASSWORD del backend)')
  return c
}

export type Sesion = { accessToken: string; empresaId: number; rol: string; correo: string }

// /api/auth/login tiene 10/60s por IP: se reutiliza el token por correo dentro del worker.
const sesiones = new Map<string, Sesion>()

export async function login(api: APIRequestContext, correo: string, contrasena = claveQa()): Promise<Sesion> {
  const cacheada = sesiones.get(correo)
  if (cacheada) return cacheada
  const res = await api.post('/api/auth/login', { data: { correo, contrasena } })
  expect(res.status(), `login ${correo}`).toBe(200)
  const body = await res.json()
  const d = body.data ?? body
  expect(d.accessToken, 'accessToken').toBeTruthy()
  sesiones.set(correo, d as Sesion)
  return d as Sesion
}

export const auth = (s: Sesion) => ({ Authorization: `Bearer ${s.accessToken}` })

/** Unívoco por corrida para no chocar con datos de otra spec. */
export const sufijo = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`

type Headers = Record<string, string>

/** Bodega + producto propios del negocio del token (datos semilla por corrida). */
export async function bodegaYProducto(api: APIRequestContext, h: Headers,
  o: { visible?: boolean; retiro?: boolean; precio?: number; stock?: number } = {}) {
  const bod = await api.post('/api/bodegas', {
    headers: h,
    data: { nombreBodega: `Bodega E2E ${sufijo()}`, direccionExacta: 'Calle prueba 1', telefono: '88887777', provincia: 'San José', canton: 'San José' },
  })
  expect(bod.ok(), await bod.text()).toBeTruthy()
  const bodegaId: number = (await bod.json()).data.id
  if (o.retiro) {
    const r = await api.put(`/api/bodegas/${bodegaId}`, { headers: h, data: { permiteRetiroCliente: 'true' } })
    expect(r.ok(), await r.text()).toBeTruthy()
  }
  const cats = await (await api.get('/api/categorias')).json()
  const categoriaId = (cats.data?.content ?? cats.data ?? cats)[0].id
  const precio = o.precio ?? 2500
  const prod = await api.post('/api/productos', {
    headers: h,
    data: { nombreProducto: `Producto E2E ${sufijo()}`, precioCompra: 1000, precioVenta: precio, stockActual: o.stock ?? 20, stockMinimo: 0, bodegaId, categoriaId, visibleCatalogo: !!o.visible },
  })
  expect(prod.ok(), await prod.text()).toBeTruthy()
  const productoId: number = (await prod.json()).data.id
  return { bodegaId, productoId, precio }
}

/** Miembro de equipo (EDITOR/LECTOR) en el negocio del token. Clave efímera derivada de la QA. */
export async function miembro(api: APIRequestContext, h: Headers, rol: 'EDITOR' | 'LECTOR') {
  const correo = `e2e.${rol.toLowerCase()}.${sufijo()}@hotclick.test`
  const contrasena = `${claveQa()}-${rol}`
  const r = await api.post('/api/empresa/equipo', { headers: h, data: { nombre: `E2E ${rol}`, correo, password: contrasena, rolEnEmpresa: rol } })
  expect(r.ok(), await r.text()).toBeTruthy()
  return { correo, contrasena }
}

/** SQL contra la BD efímera de E2E (solo si E2E_DATABASE_URL está; en CI apunta al service postgres). */
export const conSql = !!process.env.E2E_DATABASE_URL
/**
 * Ejecuta SQL contra la BD de E2E. Los valores van como variables de psql
 * (`:'nombre'` en la consulta) y psql los cita como literales: nunca se
 * interpolan en el string. La consulta va por stdin porque `-c` no expande variables.
 */
export function sql(q: string, vars: Record<string, string> = {}): string {
  const args = [process.env.E2E_DATABASE_URL!, '-X', '-q', '-v', 'ON_ERROR_STOP=1', '-tA']
  for (const [k, v] of Object.entries(vars)) {
    if (!/^[a-z_][a-z0-9_]*$/i.test(k)) throw new Error(`variable psql inválida: ${k}`)
    args.push('-v', `${k}=${v}`)
  }
  return execFileSync('psql', [...args, '-f', '-'], { input: q, encoding: 'utf8' }).trim()
}

/** Login por la UI (dos pasos: correo → Continuar → contraseña). Devuelve la respuesta del POST. */
export async function loginUi(page: Page, correo: string, contrasena = claveQa()) {
  await page.addInitScript(() => {
    localStorage.setItem('hotclick-cookie-consent', JSON.stringify({ analytics: false, functional: true, timestamp: Date.now() }))
    localStorage.setItem('hc-mm-v1-off', '1')
  })
  await page.goto('/login')
  await page.locator('input[type="email"]').first().fill(correo)
  const pass = page.locator('input[type="password"]').first()
  if (!(await pass.isVisible())) await page.getByRole('button', { name: /^continuar$/i }).click()
  await pass.fill(contrasena)
  const resp = page.waitForResponse((r) => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST')
  await page.locator('button[type="submit"]').first().click()
  const r = await resp
  expect(r.status()).toBe(200)
  await expect(page).not.toHaveURL(/\/login(\?|$)/)
  return r
}
