import { describe, expect, it } from 'vitest'
import { resumenVentas, textoTasa } from './resumenVentas'
import type { WalletTx } from './billeteraHelpers'

const tx = (p: Partial<WalletTx>): WalletTx => ({ id: 1, tipo: 'CREDITO_VENTA', monto: 0, fechaCreacion: '2026-10-01', ...p })

describe('resumenVentas', () => {
  it('suma solo ventas y calcula las tasas reales', () => {
    const r = resumenVentas([
      tx({ totalBruto: 10000, comisionSaas: 600, comisionGw: 300, monto: 9100 }),
      tx({ totalBruto: 5000, comisionSaas: 300, comisionGw: 150, monto: 4550 }),
      tx({ tipo: 'DEBITO_PAYOUT', monto: -5000 }),
    ])
    expect(r.ventas).toBe(2)
    expect(r.bruto).toBe(15000)
    expect(r.neto).toBe(13650)
    expect(r.tasaPlataforma).toBe(6)
    expect(r.tasaPasarela).toBe(3)
  })
  it('sin ventas no inventa porcentajes', () => {
    const r = resumenVentas([])
    expect(r.tasaPlataforma).toBeNull()
    expect(textoTasa(r.tasaPlataforma)).toBe('—')
  })
})