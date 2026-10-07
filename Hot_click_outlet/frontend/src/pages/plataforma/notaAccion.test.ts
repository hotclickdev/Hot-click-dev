import { describe, expect, it } from 'vitest'
import { notaDe } from './notaAccion'

describe('nota del negocio', () => {
  it('el botón arma la bandeja y no pide un id', () => {
    expect(notaDe('porContactar', '')).toEqual({
      bandeja: 'porContactar',
      proximaAccion: 'Esperar respuesta',
      nota: 'Esperar respuesta',
    })
  })

  it('el detalle escrito reemplaza el texto de la nota', () => {
    expect(notaDe('reclamo', '  Pidió el reembolso  ')?.nota).toBe('Pidió el reembolso')
  })

  it('un botón desconocido no guarda', () => {
    expect(notaDe('otro', 'algo')).toBeNull()
  })
})
