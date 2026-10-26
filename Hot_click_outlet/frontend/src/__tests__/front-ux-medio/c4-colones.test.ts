import { describe, expect, it } from 'vitest'
import { formatPrice, formatMiles } from '@/utils/format'
import { fmt as fmtCompras } from '@/pages/admin/compras/comprasHelpers'
import { archivosFuente, leer } from './helpers'

describe('C4: ₡ siempre con punto de miles (sin NBSP)', () => {
  it('helpers de montos usan punto', () => {
    expect(formatMiles(1234567)).toBe('1.234.567')
    expect(formatPrice(6200)).toBe('₡6.200')
    expect(fmtCompras(6200)).toBe('6.200')
    expect(fmtCompras(6200)).not.toMatch(/\u00a0|\u202f/)
  })
  it('ningún archivo crea Intl.NumberFormat("es-CR") fuera de utils/format.ts', () => {
    const malos = archivosFuente().filter((f) => f !== 'utils/format.ts' && /Intl\.NumberFormat\('es-CR'/.test(leer(f)))
    expect(malos).toEqual([])
  })
})
