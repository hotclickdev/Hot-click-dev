import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/api', () => ({ default: { post: vi.fn(() => Promise.resolve({ data: { message: 'ok' } })) } }))

import api from '@/services/api'
import { mensajeReembolso, puedeReembolsarOnvo, REEMBOLSO_CONFIRMACION, REEMBOLSO_ERROR, reembolsoOnvoService } from './reembolsoOnvo'

describe('Reembolso por ONVO', () => {
  it('solo ADMIN ve el botón', () => {
    expect(puedeReembolsarOnvo('ADMIN')).toBe(true)
    expect(puedeReembolsarOnvo('EMPRESA')).toBe(false)
    expect(puedeReembolsarOnvo(null)).toBe(false)
  })

  it('pega al endpoint del pedido', async () => {
    await reembolsoOnvoService.reembolsar('7')
    expect(api.post).toHaveBeenCalledWith('/admin/pedidos/7/reembolso-onvo')
  })

  it('usa el mensaje del servidor o uno genérico', () => {
    expect(mensajeReembolso({ data: { message: 'Reembolso confirmado' } })).toBe('Reembolso confirmado')
    expect(mensajeReembolso({ response: { data: { message: 'ONVO rechazó' } } })).toBe('ONVO rechazó')
    expect(mensajeReembolso(new Error('x'))).toBe(REEMBOLSO_ERROR)
  })

  it('la confirmación usa voseo', () => {
    expect(REEMBOLSO_CONFIRMACION.titulo).toContain('Devolvés')
    expect(REEMBOLSO_ERROR).toContain('Revisá')
  })
})
