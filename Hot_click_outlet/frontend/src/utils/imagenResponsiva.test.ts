import { describe, expect, it } from 'vitest'
import { srcSetResponsivo } from './imagenResponsiva'

describe('srcSetResponsivo', () => {
  it('arma 3 anchos con formato automático para Unsplash', () => {
    const s = srcSetResponsivo('https://images.unsplash.com/photo-1?w=800&q=80')
    expect(s).toContain('w=200')
    expect(s).toContain('auto=format')
    expect(s?.split(', ')).toHaveLength(3)
    expect(s).toContain(' 800w')
  })
  it('no toca otras fuentes ni URLs inválidas', () => {
    expect(srcSetResponsivo('https://hotclick-media.s3.us-east-2.amazonaws.com/a.jpg')).toBeUndefined()
    expect(srcSetResponsivo('no-es-url')).toBeUndefined()
    expect(srcSetResponsivo(null)).toBeUndefined()
  })
})