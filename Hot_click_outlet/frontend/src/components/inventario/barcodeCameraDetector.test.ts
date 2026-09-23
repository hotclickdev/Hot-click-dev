import { describe, expect, it } from 'vitest'
import { preferNativeDetector, type NativeBarcodeDetector } from './barcodeCameraDetector'

type FakeGlobal = { BarcodeDetector?: new () => NativeBarcodeDetector }

describe('preferNativeDetector', () => {
  it('devuelve true si BarcodeDetector existe', () => {
    const fakeWindow: FakeGlobal = {
      BarcodeDetector: class {
        detect = async () => [{ rawValue: '1234' }]
      },
    }
    expect(preferNativeDetector(fakeWindow)).toBe(true)
  })

  it('devuelve false si BarcodeDetector no existe', () => {
    expect(preferNativeDetector({})).toBe(false)
  })

  it('devuelve false si BarcodeDetector no es función', () => {
    const fakeWindow = { BarcodeDetector: 'no-func' } as unknown as FakeGlobal
    expect(preferNativeDetector(fakeWindow)).toBe(false)
  })
})
