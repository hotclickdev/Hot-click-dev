import { describe, expect, it } from 'vitest'
import { formatUSD } from '@/utils/format'
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
