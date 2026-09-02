import { describe, expect, it } from 'vitest'
import { errorValidacionFoto, urlDesdeUpload } from './fotoProductoValidacion'

describe('errorValidacionFoto', () => {
  it('rechaza archivos que no son imagen', () => {
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' })
    expect(errorValidacionFoto(pdf)).toMatch(/JPG/)
  })

  it('acepta jpeg', () => {
    const jpg = new File(['x'], 'a.jpg', { type: 'image/jpeg' })
    expect(errorValidacionFoto(jpg)).toBeNull()
  })
})

describe('urlDesdeUpload', () => {
  it('lee url suelta o anidada en data', () => {
    expect(urlDesdeUpload({ url: 'https://cdn/a.jpg' })).toBe('https://cdn/a.jpg')
    expect(urlDesdeUpload({ data: { url: 'https://cdn/b.jpg' } })).toBe('https://cdn/b.jpg')
    expect(urlDesdeUpload(null)).toBe('')
  })
})
