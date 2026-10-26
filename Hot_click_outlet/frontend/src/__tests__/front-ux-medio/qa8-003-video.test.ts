import { describe, expect, it } from 'vitest'
import { leer } from './helpers'

describe('QA8-003: el video no lista 4 redes fijas', () => {
  const s = leer('pages/producto/ProductVideo.tsx')
  it('sin lista fija SEGMENTOS ni control de 4 plataformas', () => {
    expect(s).not.toMatch(/SEGMENTOS/)
    expect(s).not.toMatch(/ControlPlataforma/)
    expect(s).not.toMatch(/grid-cols-4/)
  })
  it('sigue mostrando la insignia de la red real del video', () => {
    expect(s).toContain('<InsigniaRed video={video} />')
  })
})
