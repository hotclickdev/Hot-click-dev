import { describe, expect, it } from 'vitest'
import { clasesZonaFotoDrag } from './zonaFotoProductoDrag'

describe('clasesZonaFotoDrag', () => {
  it('idle con borde discontinuo usa fondo neutro y scale-100', () => {
    const c = clasesZonaFotoDrag({
      arrastrando: false,
      reducedMotion: false,
      bordeDiscontinuo: true,
    })
    expect(c).toContain('bg-[var(--hc-n-50)]')
    expect(c).toContain('border-hc-border')
    expect(c).toContain('scale-100')
    expect(c).not.toContain('scale-[1.03]')
  })

  it('drag-over escala y tinte accent', () => {
    const c = clasesZonaFotoDrag({
      arrastrando: true,
      reducedMotion: false,
      bordeDiscontinuo: true,
    })
    expect(c).toContain('bg-hc-accent/10')
    expect(c).toContain('border-hc-accent')
    expect(c).toContain('scale-[1.03]')
  })

  it('reduced motion cambia fondo sin escala', () => {
    const c = clasesZonaFotoDrag({
      arrastrando: true,
      reducedMotion: true,
      bordeDiscontinuo: false,
    })
    expect(c).toContain('bg-hc-accent/10')
    expect(c).toContain('scale-100')
    expect(c).not.toContain('scale-[1.03]')
  })
})
