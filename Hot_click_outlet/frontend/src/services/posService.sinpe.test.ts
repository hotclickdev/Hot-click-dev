import { describe, expect, it } from 'vitest'
import { posService } from './posService'

describe('posService: SINPE solo dentro de la pasarela', () => {
  it('ya no expone la confirmación manual de SINPE del cajero', () => {
    expect('confirmarSinpeQr' in posService).toBe(false)
  })

  it('conserva el flujo de sesión QR y su estado de pasarela', () => {
    expect(typeof posService.crearQrSesion).toBe('function')
    expect(typeof posService.estadoQrSesion).toBe('function')
    expect(typeof posService.cancelarQrSesion).toBe('function')
  })
})
