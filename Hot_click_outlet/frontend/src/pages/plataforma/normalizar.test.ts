import { describe, expect, it } from 'vitest'
import {
  contarAtrasadas,
  destinoPlataformaDesdeAdmin,
  filtrarNegocios,
  idSeguro,
  ipValida,
} from './normalizar'

const NEGOCIOS = [
  { id: 1, nombreComercial: 'Taller Sol', slug: 'taller-sol', estadoEmpresa: 'ACTIVO' },
  { id: 2, nombreComercial: 'Moda Urbana', slug: 'moda', estadoEmpresa: 'PENDIENTE_APROBACION' },
  { id: 3, nombreComercial: 'Cerrado', slug: 'cerrado', estadoEmpresa: 'SUSPENDIDO' },
]

describe('consola de plataforma', () => {
  it('filtra negocios por estado y por nombre', () => {
    expect(filtrarNegocios(NEGOCIOS, 'pendientes', '').map((f) => f.id)).toEqual([2])
    expect(filtrarNegocios(NEGOCIOS, 'suspendidos', '').map((f) => f.id)).toEqual([3])
    expect(filtrarNegocios(NEGOCIOS, 'todos', 'taller').map((f) => f.id)).toEqual([1])
  })

  it('solo acepta ids numéricos', () => {
    expect(idSeguro({ id: 4 })).toBe('4')
    expect(idSeguro({ id: '../admin' })).toBeNull()
    expect(idSeguro({ id: 0 })).toBeNull()
  })

  it('manda los marcadores viejos al dominio nuevo', () => {
    expect(destinoPlataformaDesdeAdmin('/admin')).toBe('/plataforma')
    expect(destinoPlataformaDesdeAdmin('/admin/empresas/12')).toBe('/plataforma/negocios/12')
    expect(destinoPlataformaDesdeAdmin('/admin/empresas/no')).toBe('/plataforma/negocios')
    expect(destinoPlataformaDesdeAdmin('/admin/pagos')).toBe('/plataforma/dinero/cobros')
    expect(destinoPlataformaDesdeAdmin('/admin/pos')).toBe('/plataforma')
  })

  it('cuenta suscripciones atrasadas y valida una IP', () => {
    expect(contarAtrasadas([{ estado: 'PAST_DUE' }, { estado: 'ACTIVA' }])).toBe(1)
    expect(ipValida('18.119.201.126')).toBe(true)
    expect(ipValida('::1')).toBe(true)
    expect(ipValida('abc')).toBe(false)
    expect(ipValida('999.1.1.1')).toBe(false)
    expect(ipValida('no es ip')).toBe(false)
  })
})
