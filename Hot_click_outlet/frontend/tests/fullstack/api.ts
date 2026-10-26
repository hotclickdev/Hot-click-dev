import { expect, type APIRequestContext } from '@playwright/test'

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

export async function login(api: APIRequestContext, correo: string, contrasena = claveQa()): Promise<Sesion> {
  const res = await api.post('/api/auth/login', { data: { correo, contrasena } })
  expect(res.status(), `login ${correo}`).toBe(200)
  const body = await res.json()
  const d = body.data ?? body
  expect(d.accessToken, 'accessToken').toBeTruthy()
  return d as Sesion
}

export const auth = (s: Sesion) => ({ Authorization: `Bearer ${s.accessToken}` })

/** Unívoco por corrida para no chocar con datos de otra spec. */
export const sufijo = () => `${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`
