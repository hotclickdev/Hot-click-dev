import { execFileSync } from 'node:child_process'
import { test, expect, type APIRequestContext, type Page } from '@playwright/test'

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
  let res = await api.post('/api/auth/login', { data: { correo, contrasena } })
  // /api/auth/login tiene rate limit 10/60s por IP y la suite entera corre desde una sola IP:
  // si se agotó el cupo, se espera la ventana una vez (no se reintenta a ciegas).
  if (res.status() === 429) {
    test.setTimeout(180_000)
    await new Promise((r) => setTimeout(r, 61_000))
    res = await api.post('/api/auth/login', { data: { correo, contrasena } })
  }
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
    data: { nombreBodega: `Bodega E2E ${sufijo()}`, direccionExacta: 'Calle prueba 1', telefono: '00000004', provincia: 'San José', canton: 'San José' },
  })
  let bodegaId: number
  if (!bod.ok() && (await bod.text()).includes('LIMIT_REACHED')) {
    // El plan limita bodegas y las corridas repetidas las agotan: se reutiliza una existente del mismo negocio.
    const lista = (await (await api.get('/api/bodegas', { headers: h })).json()).data
    bodegaId = (Array.isArray(lista) ? lista : lista?.content)?.[0]?.id
    expect(bodegaId, 'bodega existente').toBeTruthy()
  } else {
    expect(bod.ok(), await bod.text()).toBeTruthy()
    bodegaId = (await bod.json()).data.id
  }
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

/**
 * Miembro de equipo (EDITOR/LECTOR/CAJERO) en el negocio del token.
 * La API de invitación NO acepta contraseña (el invitado recibe un secreto aleatorio). Para poder
 * iniciar sesión en E2E, tras crearlo se copia a esa fila el hash de una cuenta QA (clave = E2E_QA_PASSWORD)
 * con UPDATE directo sobre la BD efímera de E2E (E2E_DATABASE_URL). Ese camino solo existe en este helper
 * de test: no hay endpoint ni perfil nuevo en el backend, así que producción no cambia.
 */
export async function miembro(api: APIRequestContext, h: Headers, rol: 'EDITOR' | 'LECTOR' | 'CAJERO') {
  if (!conSql) throw new Error('miembro() requiere E2E_DATABASE_URL para fijar la clave del invitado en la BD de E2E')
  const correo = `e2e.${rol.toLowerCase()}.${sufijo()}@hotclick.test`
  const r = await api.post('/api/empresa/equipo', { headers: h, data: { nombre: `E2E ${rol}`, correo, rolEnEmpresa: rol } })
  expect(r.ok(), await r.text()).toBeTruthy()
  const filas = sql(
    `UPDATE hot_click_usuario_tb SET contrasena_hash = (SELECT contrasena_hash FROM hot_click_usuario_tb WHERE correo = :'qa') WHERE correo = :'correo' RETURNING 1`,
    { qa: QA.PYME, correo })
  expect(filas, 'se fijó la clave del invitado en la BD de E2E').toBe('1')
  return { correo, contrasena: claveQa() }
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

// ───────────────────────── Suite «simulación final en sandbox» (08–11) ─────────────────────────

/**
 * Guarda anti-live: aborta si CUALQUIER variable del entorno del test trae una llave ONVO live.
 * (La llave nunca llega a la spec: solo se comprueba el prefijo, sin imprimir el valor.)
 */
export function abortarSiOnvoLive(): void {
  for (const [k, v] of Object.entries(process.env)) {
    if (/^onvo_live_/i.test(v ?? '')) throw new Error(`ABORTADO: ${k} contiene una llave ONVO live. Solo onvo_test_ / sandbox.`)
  }
}

/** true si el backend del sandbox corre con llave ONVO de prueba (lo marca scripts/e2e-sandbox.sh o el workflow). */
export const conOnvoPrueba = process.env.E2E_ONVO_MODO === 'prueba'
/** true si además hay ONVO_PRICE_ID_PYME / ONVO_PRICE_ID_NEGOCIO_PLUS de prueba en el backend (cobros reales de sandbox). */
export const conPreciosOnvo = conOnvoPrueba && process.env.E2E_ONVO_PRECIOS === 'listo'

export type Negocio = { correo: string; contrasena: string; empresaId: number; sesion: Sesion }

/** Flujo 1 — alta de negocio por /api/auth/registro-empresa (público). El negocio nace EMPRENDEDOR. */
export async function registrarNegocio(api: APIRequestContext, etiqueta = 'Negocio'): Promise<Negocio> {
  const s = sufijo()
  const correo = `e2e.${etiqueta.toLowerCase()}.${s}@example.test`
  const contrasena = `E2e-${s}-Aa1!`
  const reg = await api.post('/api/auth/registro-empresa', {
    data: {
      nombreEmpresa: `${etiqueta} E2E ${s}`, nombreAdmin: 'Admin E2E', correoAdmin: correo, passwordAdmin: contrasena,
      declaraMayoriaEdad: true, provincia: 'San José', canton: 'San José', direccionExacta: 'Calle prueba 1',
    },
  })
  expect(reg.status(), await reg.text()).toBe(200)
  const body = await reg.json()
  const empresaId: number = body.data.empresaId
  expect(empresaId, 'empresaId').toBeGreaterThan(0)
  const sesion = await login(api, correo, contrasena)
  return { correo, contrasena, empresaId, sesion }
}

/** Marca el correo del admin como verificado en la BD efímera (el plan de pago lo exige). Solo con E2E_DATABASE_URL. */
export function verificarCorreo(correo: string): void {
  sql(`UPDATE hot_click_usuario_tb SET correo_verificado = true WHERE correo = :'correo'`, { correo })
}

/** Emula la aprobación del admin (PENDIENTE_APROBACION → ACTIVO) en la BD efímera: un negocio sin aprobar no elige plan. */
export function aprobarNegocio(empresaId: number): void {
  sql(`UPDATE hot_click_empresa_tb SET estado_empresa = 'ACTIVO' WHERE id_empresa = :'id'::bigint`, { id: String(empresaId) })
}

/**
 * Emula el resultado de APROBAR un negocio CON cupo (trial Emprendedor de 90 días), en la BD efímera de E2E, sin login admin:
 * lo mismo que dejan CupoEmprendedorAprobacionService + CupoEmprendedorService.aplicarTrial (estado ACTIVO, estado_plan TRIAL,
 * plan EMPRENDEDOR, fechas hoy CR + 90, puesto libre y titular).
 * El contador `usados` se incrementa si `usados < limite`; si ya está lleno por el backfill de V127 (cuenta empresas,
 * no puestos asignados), se sigue igual con el primer puesto libre y no se reutiliza el de otro negocio.
 * Además inserta la suscripción local TRIAL del plan EMPRENDEDOR (sin ids ONVO/Stripe) que aplicarTrial no crea y que
 * `cancelar` exige. No es una vía de producción ni afloja el guard de POST /api/billing/trial.
 * Exige el correo verificado (como el cupo real): llamar a verificarCorreo(correo) antes.
 */
export function aprobarNegocioConTrialCupo(empresaId: number, correo: string): void {
  const id = String(empresaId)
  if (!/^[0-9]+$/.test(id)) throw new Error(`empresaId inválido`)
  // Sentencias sueltas, mismo estilo que aprobarNegocio/verificarCorreo (evita rarezas de psql con un script largo).
  const existe = sql(`SELECT id_empresa FROM hot_click_empresa_tb WHERE id_empresa = :'id'::bigint`, { id })
  if (!existe) throw new Error(`aprobarNegocioConTrialCupo: no existe la empresa ${id} en la BD de E2E`)
  sql(`UPDATE hot_click_usuario_tb SET correo_verificado = true WHERE lower(correo) = lower(:'correo')`, { correo })
  sql(`UPDATE hot_click_cupo_emprendedor_tb SET usados = usados + 1 WHERE id = 1 AND usados < limite`)
  const puesto = sql(
    `SELECT COALESCE(
        (SELECT MIN(c.n) FROM (
            SELECT 1 AS n
            UNION ALL
            SELECT trial_emprendedor_pos + 1 FROM hot_click_empresa_tb WHERE trial_emprendedor_pos IS NOT NULL
          ) c
          WHERE NOT EXISTS (SELECT 1 FROM hot_click_empresa_tb e WHERE e.trial_emprendedor_pos = c.n)),
        (SELECT COALESCE(MAX(trial_emprendedor_pos), 0) + 1 FROM hot_click_empresa_tb)
      )`,
  )
  if (!puesto) throw new Error('aprobarNegocioConTrialCupo: no hay puesto libre')
  const plan = sql(`SELECT id_plan FROM hot_click_plan_tb WHERE nombre = 'EMPRENDEDOR'`)
  if (!plan) throw new Error('aprobarNegocioConTrialCupo: no está el plan EMPRENDEDOR')
  const titular = sql(
    `SELECT COALESCE(
        (SELECT u.id_usuario FROM hot_click_usuario_tb u WHERE lower(u.correo) = lower(:'correo') LIMIT 1),
        (SELECT m.fk_id_usuario FROM hot_click_miembro_empresa_tb m
          WHERE m.fk_id_empresa = :'id'::bigint AND m.rol_en_empresa = 'PROPIETARIO'
          ORDER BY m.fk_id_usuario LIMIT 1)
      )`,
    { id, correo },
  )
  if (!titular) throw new Error('aprobarNegocioConTrialCupo: no se encontró el usuario titular')
  const filas = sql(
    `UPDATE hot_click_empresa_tb SET
        estado_empresa = 'ACTIVO', estado_plan = 'TRIAL', plan_saas = 'EMPRENDEDOR',
        fk_id_plan = :'plan'::bigint,
        trial_hasta = CAST(now() AT TIME ZONE 'America/Costa_Rica' AS date) + 90,
        fecha_venc_plan = CAST(now() AT TIME ZONE 'America/Costa_Rica' AS date) + 90,
        trial_emprendedor_hasta = CAST(now() AT TIME ZONE 'America/Costa_Rica' AS date) + 90,
        trial_emprendedor_pos = :'puesto'::integer,
        trial_emprendedor_titular_usuario = :'titular'::bigint,
        trial_emprendedor_titular_correo = lower(:'correo')
      WHERE id_empresa = :'id'::bigint
      RETURNING id_empresa`,
    { id, correo, plan, puesto, titular },
  )
  if (!filas) throw new Error('aprobarNegocioConTrialCupo: el UPDATE no aplicó a la empresa')
  const sub = sql(
    `INSERT INTO hot_click_suscripcion_tb (fk_id_empresa, fk_id_plan, estado, fecha_inicio, trial_end)
      SELECT :'id'::bigint, :'plan'::bigint, 'TRIAL',
        CAST(now() AT TIME ZONE 'America/Costa_Rica' AS date),
        CAST(now() AT TIME ZONE 'America/Costa_Rica' AS date) + 90
      RETURNING id_suscripcion`,
    { id, plan },
  )
  if (!sub) throw new Error('aprobarNegocioConTrialCupo: no se insertó la suscripción local TRIAL')
}
