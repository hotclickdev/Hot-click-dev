import { describe, expect, it } from 'vitest'
import { esCapturaReintentable, type CapturaQueueItem } from './capturaOffline'

function item(partial: Partial<CapturaQueueItem> = {}): CapturaQueueItem {
  return {
    id: 'test-id',
    tipo: 'FOTO',
    paqueteId: 1,
    payload: {},
    fotoBlob: null,
    creadoAt: '2026-01-01T00:00:00.000Z',
    intentos: 0,
    estado: 'PENDIENTE',
    errorDetalle: null,
    ...partial,
  }
}

describe('esCapturaReintentable', () => {
  it('incluye PENDIENTE y ERROR con intentos bajo el máximo', () => {
    expect(esCapturaReintentable(item({ estado: 'PENDIENTE', intentos: 0 }))).toBe(true)
    expect(esCapturaReintentable(item({ estado: 'ERROR', intentos: 4 }))).toBe(true)
  })

  it('excluye cuando se agotaron los reintentos', () => {
    expect(esCapturaReintentable(item({ estado: 'PENDIENTE', intentos: 5 }))).toBe(false)
    expect(esCapturaReintentable(item({ estado: 'ERROR', intentos: 99 }))).toBe(false)
  })

  it('incluye SINCRONIZANDO colgado para reanudar tras crash', () => {
    expect(esCapturaReintentable(item({ estado: 'SINCRONIZANDO', intentos: 0 }))).toBe(true)
  })

  it('excluye estados que no están en cola activa', () => {
    expect(esCapturaReintentable(item({ estado: 'COMPLETADO', intentos: 0 }))).toBe(false)
    expect(esCapturaReintentable(item({ estado: 'OK', intentos: 0 }))).toBe(false)
  })
})
