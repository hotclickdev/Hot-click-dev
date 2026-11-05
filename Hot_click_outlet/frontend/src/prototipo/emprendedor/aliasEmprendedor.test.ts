import { describe, expect, it } from 'vitest'
import { resolvePath } from 'react-router-dom'
import { ALIAS_EMPRENDEDOR } from './aliasEmprendedor'

const ESPERADO: Record<string, string> = {
  bodegas: '/emprendedor/opciones/bodegas',
  'bodegas/nueva': '/emprendedor/opciones/bodegas/nueva',
  negocio: '/emprendedor/opciones/negocio',
  plan: '/emprendedor/opciones/plan',
  'plan/actualizado': '/emprendedor/opciones/plan/actualizado',
  ayuda: '/emprendedor/opciones/ayuda',
  consultas: '/emprendedor/opciones/consultas',
  perfil: '/emprendedor/opciones/perfil',
  cobro: '/emprendedor/opciones/cobro',
  'cobro/nuevo': '/emprendedor/opciones/cobro/nuevo',
  telegram: '/emprendedor/opciones/telegram',
}

describe('ALTO-02 alias Emprendedor', () => {
  it('cubre todos los alias esperados', () => {
    expect(Object.fromEntries(ALIAS_EMPRENDEDOR.map((a) => [a.path, a.destino]))).toEqual(ESPERADO)
  })

  it.each(ALIAS_EMPRENDEDOR.map((a) => [a.path, a.destino]))(
    '/emprendedor/%s redirige a %s sin anidarse',
    (path, destino) => {
      // Desde la URL del alias (p. ej. /emprendedor/plan) el destino resuelve igual: es absoluto.
      expect(resolvePath(destino, `/emprendedor/${path}`).pathname).toBe(ESPERADO[path])
      expect(resolvePath(destino, `/emprendedor/${path}`).pathname).not.toContain(`/${path}/opciones/`)
    },
  )
})
