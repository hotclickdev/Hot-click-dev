import { describe, expect, it } from 'vitest'
import { urlSubida } from './vitrinaUrl'

describe('urlSubida', () => {
  it('lee la url del sobre de la API', () => {
    expect(urlSubida({ data: 'https://cdn/logo.png' })).toBe('https://cdn/logo.png')
    expect(urlSubida('https://cdn/logo.png')).toBe('https://cdn/logo.png')
    expect(urlSubida({})).toBe('')
  })
})
