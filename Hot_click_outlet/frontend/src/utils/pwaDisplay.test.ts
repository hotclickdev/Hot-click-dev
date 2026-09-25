import { afterEach, describe, expect, it, vi } from 'vitest'
import { esPwaStandalone } from './pwaDisplay'

function mockWindow(options: { standalone?: boolean; displayStandalone?: boolean }) {
  const { standalone = false, displayStandalone = false } = options
  const navigator = { standalone } as Navigator & { standalone?: boolean }
  const windowMock = {
    navigator,
    matchMedia: (query: string) => ({
      matches: query === '(display-mode: standalone)' ? displayStandalone : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }),
  }
  vi.stubGlobal('window', windowMock)
  Object.defineProperty(globalThis, 'window', { value: windowMock, configurable: true })
  return windowMock
}

describe('esPwaStandalone', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('devuelve true cuando matchMedia reporta display-mode standalone', () => {
    mockWindow({ displayStandalone: true, standalone: undefined })
    expect(esPwaStandalone()).toBe(true)
  })

  it('devuelve true cuando navigator.standalone es true (iOS)', () => {
    mockWindow({ displayStandalone: false, standalone: true })
    expect(esPwaStandalone()).toBe(true)
  })

  it('devuelve false en navegador normal', () => {
    mockWindow({ displayStandalone: false, standalone: false })
    expect(esPwaStandalone()).toBe(false)
  })

  it('devuelve false si matchMedia lanza y no hay standalone iOS', () => {
    const win = {
      navigator: { standalone: false },
      matchMedia: () => {
        throw new Error('no soportado')
      },
    }
    vi.stubGlobal('window', win)
    Object.defineProperty(globalThis, 'window', { value: win, configurable: true })
    expect(esPwaStandalone()).toBe(false)
  })

  it('devuelve false sin window', () => {
    vi.stubGlobal('window', undefined)
    Object.defineProperty(globalThis, 'window', { value: undefined, configurable: true })
    expect(esPwaStandalone()).toBe(false)
  })
})
