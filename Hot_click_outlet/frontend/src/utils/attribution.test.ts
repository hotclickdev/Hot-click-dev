import { describe, it, expect, beforeEach, vi } from 'vitest'

const store = new Map<string, string>()

vi.stubGlobal('localStorage', {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => { store.set(k, v) },
  removeItem: (k: string) => { store.delete(k) },
  clear: () => { store.clear() },
  key: () => null,
  length: 0,
})

vi.stubGlobal('document', {
  cookie: '',
})

const { captureAttributionFromLocation, loadAttribution, attributionForCheckout } = await import('@/utils/attribution')

describe('attribution', () => {
  beforeEach(() => {
    store.clear()
    ;(document as { cookie: string }).cookie = ''
  })

  it('guarda first y last touch desde UTM', () => {
    const first = captureAttributionFromLocation('?utm_source=meta&utm_campaign=camp1', '/productos')
    expect(first.first?.utmCampaign).toBe('camp1')
    expect(first.last?.utmCampaign).toBe('camp1')

    const second = captureAttributionFromLocation('?utm_source=meta&utm_campaign=camp2&fbclid=abc', '/checkout')
    expect(second.first?.utmCampaign).toBe('camp1')
    expect(second.last?.utmCampaign).toBe('camp2')
    expect(second.last?.fbclid).toBe('abc')
  })

  it('no pisa last con trafico directo', () => {
    captureAttributionFromLocation('?utm_campaign=paid', '/')
    const after = captureAttributionFromLocation('', '/productos')
    expect(after.last?.utmCampaign).toBe('paid')
    expect(loadAttribution().last?.utmCampaign).toBe('paid')
  })

  it('attributionForCheckout expone snapshot', () => {
    captureAttributionFromLocation('?utm_source=google&gclid=g1', '/')
    const snap = attributionForCheckout()
    expect(snap?.last?.gclid).toBe('g1')
  })
})
