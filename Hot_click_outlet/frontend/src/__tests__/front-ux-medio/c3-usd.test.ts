import { describe, expect, it } from 'vitest'
import { formatMontoMoneda, formatPrice, formatUSD } from '@/utils/format'
import { formatoUsd } from '@/features/billing/trialTarjeta'
import { formatMonto } from '@/services/cotizacionService'
import { dolares } from '@/config/planesPrecios'
import { fmtMontoFactura } from '@/pages/admin/suscripcion/suscripcionHelpers'
import { archivosFuente, leer } from './helpers'

describe('C3: un solo formato de US$', () => {
  it('formatUSD: coma decimal, punto de miles, sin decimales si es entero', () => {
    expect(formatUSD(9)).toBe('US$9')
    expect(formatUSD(9.5)).toBe('US$9,50')
    expect(formatUSD(1234.5)).toBe('US$1.234,50')
    expect(formatUSD(-0)).toBe('US$0')
    expect(formatUSD(null)).toBe('US$0')
  })
  it('cotización, planes y facturas de suscripción usan el mismo formato', () => {
    expect(formatMonto(950, 'USD')).toBe('US$9,50')
    expect(dolares(9.5)).toBe('US$9,50')
    expect(fmtMontoFactura(950, 'USD')).toBe('US$9,50')
    expect(fmtMontoFactura(950, 'usd')).toBe('US$9,50')
  })
  it('no queda Intl currency USD ni «US$ » con espacio fuera de utils/format', () => {
    const malos = archivosFuente().filter((f) => {
      const s = leer(f)
      return /currency:\s*'USD'/.test(s) || /US\$ \$\{|'US\$' : moneda\} /.test(s)
    })
    expect(malos).toEqual([])
  })
})

describe('C3 (seguimiento): restos de US$ fuera del helper', () => {
  it('formatUSD con decimales para costos de IA y valores no finitos', () => {
    expect(formatUSD(0.0123, 4)).toBe('US$0,0123')
    expect(formatUSD(12.5, 4)).toBe('US$12,5000')
    expect(formatUSD(Number.NaN)).toBe('US$0')
  })
  it('trial, suspensión y emprende usan el mismo formato', () => {
    expect(formatoUsd(1234.5)).toBe('US$1.234,50')
    expect(formatMontoMoneda(9.5, 'usd', 'es')).toBe('US$9,50')
    expect(formatMontoMoneda(6200, null, 'es')).toBe(formatPrice(6200))
  })
  it('sin «US$» armado a mano, ni toLocaleString en-US, ni «USD ${…}» en el código', () => {
    const malos = archivosFuente().filter((f) => {
      if (f.endsWith('utils/format.ts')) return false
      const s = leer(f)
      return /US\$\$\{/.test(s) || /`USD \$\{/.test(s) || / · USD \$\{/.test(s) || /toLocaleString\('en-US', \{ minimumFractionDigits/.test(s)
    })
    expect(malos).toEqual([])
  })
  it('las traducciones no anteponen US$ a un número crudo', () => {
    for (const l of ['es', 'en', 'pt']) expect(leer(`i18n/locales/${l}.json`)).not.toMatch(/US\$\{\{/)
  })
})
