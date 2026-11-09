import { describe, expect, it, vi } from 'vitest'
import { sondearActivacion, trasPagoEmbed } from './activacionPago'

const ya = async () => {}

describe('tras el embed se reconcilia y no se asume activo', () => {
  it('llama reconciliar al volver del pago y solo sigue si ONVO activó', async () => {
    const reconciliar = vi.fn().mockResolvedValue({ data: { status: 'activado' } })
    const alActivar = vi.fn().mockResolvedValue(undefined)
    await expect(trasPagoEmbed(reconciliar, alActivar, { esperar: ya })).resolves.toBe('activo')
    expect(reconciliar).toHaveBeenCalledTimes(1)
    expect(alActivar).toHaveBeenCalledTimes(1)
  })

  it('ONVO todavía no pagó: sondea con tope y no activa', async () => {
    const reconciliar = vi.fn().mockResolvedValue({ data: { status: 'pendiente' } })
    const alActivar = vi.fn()
    await expect(trasPagoEmbed(reconciliar, alActivar, { intentos: 3, esperar: ya })).resolves.toBe('pendiente')
    expect(reconciliar).toHaveBeenCalledTimes(3)
    expect(alActivar).not.toHaveBeenCalled()
  })

  it('error de ONVO o red: queda pendiente, sin marcar activo', async () => {
    const reconciliar = vi.fn().mockRejectedValue(new Error('503'))
    const alActivar = vi.fn()
    await expect(sondearActivacion(reconciliar, { intentos: 2, esperar: ya })).resolves.toBe('pendiente')
    expect(alActivar).not.toHaveBeenCalled()
  })

  it('429 corta el sondeo', async () => {
    const err429 = Object.assign(new Error('429'), { response: { status: 429 } })
    const reconciliar = vi.fn().mockRejectedValue(err429)
    await expect(sondearActivacion(reconciliar, { intentos: 4, esperar: ya })).resolves.toBe('pendiente')
    expect(reconciliar).toHaveBeenCalledTimes(1)
  })

  it('si falla el refresco después de activar, no se da por activo', async () => {
    const reconciliar = vi.fn().mockResolvedValue({ data: { status: 'activado' } })
    const alActivar = vi.fn().mockRejectedValue(new Error('red'))
    await expect(trasPagoEmbed(reconciliar, alActivar, { esperar: ya })).resolves.toBe('pendiente')
  })
})
