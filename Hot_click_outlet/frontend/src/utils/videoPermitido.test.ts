import { describe, expect, it } from 'vitest'
import { esVideoPermitido } from './videoPermitido'

describe('esVideoPermitido (ESC-4)', () => {
  it('acepta YouTube, Instagram, TikTok y vacío', () => {
    expect(esVideoPermitido('https://www.youtube.com/watch?v=abc')).toBe(true)
    expect(esVideoPermitido('https://youtu.be/abc')).toBe(true)
    expect(esVideoPermitido('https://www.instagram.com/reel/xyz/')).toBe(true)
    expect(esVideoPermitido('https://www.tiktok.com/@a/video/1')).toBe(true)
    expect(esVideoPermitido('')).toBe(true)
  })
  it('rechaza otros dominios, http y trucos de host', () => {
    expect(esVideoPermitido('https://ejemplo-qa-test.com/video.mp4')).toBe(false)
    expect(esVideoPermitido('http://www.youtube.com/watch?v=abc')).toBe(false)
    expect(esVideoPermitido('https://youtube.com.evil.com/x')).toBe(false)
    expect(esVideoPermitido('https://evil.com@youtube.com/x')).toBe(false)
    expect(esVideoPermitido('no es url')).toBe(false)
  })
})
