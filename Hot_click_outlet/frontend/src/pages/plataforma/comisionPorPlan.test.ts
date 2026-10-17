import { afterEach, describe, expect, it, vi } from 'vitest'
import api from '@/services/api'
import {
  RUTA_COMISION_POR_PLAN,
  cargarComisionPorPlan,
  errorRango,
  etiquetaSemana,
  fechaLegible,
  filasPorSemana,
  leerComisionPorPlan,
  mensajeErrorComision,
  nombrePlanComision,
  totalGeneral,
  totalesPorPlan,
} from './comisionPorPlan'

// Ejemplo 200 de docs/contratos/S6-18-comision-por-plan.md (#193), más una fila para sumar.
const respuesta = {
  success: true,
  message: 'Comisión por plan',
  data: {
    desde: '2026-08-21',
    hasta: '2026-10-16',
    moneda: 'CRC',
    filas: [
      { semana: '2026-10-05', plan: 'PYME', ventas: 2, totalBruto: 14000, comisionSaas: 700, comisionPasarela: 420 },
      { semana: '2026-10-05', plan: 'SIN_PLAN', ventas: 1, totalBruto: 5000, comisionSaas: 400, comisionPasarela: 150 },
      { semana: '2026-10-12', plan: 'PYME', ventas: 1, totalBruto: 3000, comisionSaas: 150, comisionPasarela: 90 },
    ],
  },
}

afterEach(() => { vi.restoreAllMocks() })

describe('S6-18 capa de API', () => {
  it('llama a la ruta del contrato y solo manda las fechas que hay', async () => {
    // El interceptor de api desenvuelve el ResponseDTO: el servicio recibe `data` directo.
    const get = vi.spyOn(api, 'get').mockResolvedValue({ data: respuesta.data })
    const datos = await cargarComisionPorPlan({ desde: '2026-08-21' })
    expect(RUTA_COMISION_POR_PLAN).toBe('/admin/finanzas/comision-por-plan')
    expect(get).toHaveBeenCalledWith('/admin/finanzas/comision-por-plan', { params: { desde: '2026-08-21' } })
    expect(datos.filas).toHaveLength(3)
    await cargarComisionPorPlan()
    expect(get).toHaveBeenLastCalledWith('/admin/finanzas/comision-por-plan', { params: {} })
  })

  it('lee el ResponseDTO sin inventar montos', () => {
    const d = leerComisionPorPlan(respuesta)
    expect(leerComisionPorPlan(respuesta.data)).toEqual(d)
    expect(d).toMatchObject({ desde: '2026-08-21', hasta: '2026-10-16', moneda: 'CRC' })
    expect(d.filas[0]).toEqual(respuesta.data.filas[0])
    const roto = leerComisionPorPlan({ data: { filas: [{ semana: '2026-10-05', plan: 'PYME' }, null] } })
    expect(roto.filas).toEqual([{ semana: '2026-10-05', plan: 'PYME', ventas: 0, totalBruto: 0, comisionSaas: 0, comisionPasarela: 0 }])
    expect(leerComisionPorPlan(null).filas).toEqual([])
  })

  it('las sumas salen solo de las filas del backend', () => {
    const { filas } = leerComisionPorPlan(respuesta)
    expect(totalGeneral(filas)).toEqual({ ventas: 4, totalBruto: 22000, comisionSaas: 1250, comisionPasarela: 660 })
    expect(totalesPorPlan(filas)).toEqual([
      { plan: 'PYME', ventas: 3, totalBruto: 17000, comisionSaas: 850, comisionPasarela: 510 },
      { plan: 'SIN_PLAN', ventas: 1, totalBruto: 5000, comisionSaas: 400, comisionPasarela: 150 },
    ])
    expect(filasPorSemana(filas).map((g) => [g.semana, g.filas.length])).toEqual([['2026-10-05', 2], ['2026-10-12', 1]])
    expect(totalGeneral([])).toEqual({ ventas: 0, totalBruto: 0, comisionSaas: 0, comisionPasarela: 0 })
  })

  it('valida el rango igual que el 400 del backend', () => {
    expect(errorRango({})).toBeNull()
    expect(errorRango({ desde: '2026-01-01', hasta: '2027-01-02' })).toBeNull()
    expect(errorRango({ desde: '2026-01-01', hasta: '2027-01-03' })).toContain('366')
    expect(errorRango({ desde: '2026-10-16', hasta: '2026-10-15' })).toContain('anterior')
    expect(errorRango({ desde: '2026-02-30' })).toContain('desde')
  })

  it('traduce 400, 401 y 403 del contrato', () => {
    expect(mensajeErrorComision({ response: { status: 400, data: { message: 'El rango máximo es de 366 días' } } })).toBe('El rango máximo es de 366 días')
    expect(mensajeErrorComision({ response: { status: 401 } })).toContain('sesión')
    expect(mensajeErrorComision({ response: { status: 403 } })).toContain('administradores')
    expect(mensajeErrorComision(new Error('red'))).toBe('No se pudo cargar la comisión por plan.')
  })

  it('nombres y semanas legibles', () => {
    expect(nombrePlanComision('NEGOCIO_PLUS')).toBe('Negocio Plus')
    expect(nombrePlanComision('SIN_PLAN')).toBe('Sin plan')
    expect(nombrePlanComision('PLAN_RARO')).toBe('PLAN_RARO')
    expect(etiquetaSemana('2026-10-05')).toMatch(/^Semana del 5 oct/)
    expect(fechaLegible('2026-10-16')).toMatch(/^16 oct/)
    expect(fechaLegible('no')).toBe('no')
  })
})
