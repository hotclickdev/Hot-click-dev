import { describe, expect, it } from 'vitest'
import { normalizarCuenta } from './cobrosOnvoApi'
import { DETALLE_SUSPENDIDA, VISTAS_ESTADO, detallePausada } from './estadosCobro'

describe('S3-23 revisión, pausa y suspensión', () => {
  it('distingue «Pausada por HotClick» de «Suspendida por ONVO» y dice quién lo decidió', () => {
    expect(VISTAS_ESTADO.PAUSADA.etiqueta).toBe('Pausada por HotClick')
    expect(VISTAS_ESTADO.PAUSADA.quien).toBe('HotClick')
    expect(VISTAS_ESTADO.SUSPENDIDA.etiqueta).toBe('Suspendida por ONVO')
    expect(VISTAS_ESTADO.SUSPENDIDA.quien).toBe('ONVO')
    expect(VISTAS_ESTADO.EN_REVISION.quien).toBe('ONVO')
  })

  it('los tres estados llevan a soporte de HotClick, sin «Ir a ONVO» ni datos internos', () => {
    for (const e of ['EN_REVISION', 'PAUSADA', 'SUSPENDIDA'] as const) {
      expect(VISTAS_ESTADO[e].secundaria).toBe('soporte')
      expect(VISTAS_ESTADO[e].queHacer).toBeTruthy()
    }
    expect(DETALLE_SUSPENDIDA).toBeNull()
  })

  it('muestra el motivo del admin al pausar', () => {
    expect(detallePausada('15-oct-2026', 'Fotos con marcas de otro sitio')).toBe('Motivo: «Fotos con marcas de otro sitio». Desde el 15-oct-2026.')
    expect(detallePausada(null, null)).toBeNull()
    expect(normalizarCuenta({ estado: 'PAUSADA', motivoPausa: ' Fotos ' }).motivoPausa).toBe('Fotos')
  })
})
