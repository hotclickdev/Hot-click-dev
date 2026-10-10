import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { whatsappOculto } from '@/components/ui/flotantes/flotantesHelpers'

const fuente = (f: string) => readFileSync(path.join(__dirname, f), 'utf8')

describe('tienda Pyme: una sola CTA roja (boceto 13)', () => {
  it('WhatsApp ya no tiene relleno de acento: usa la clase secundaria', () => {
    const src = fuente('TiendaEncabezadoNegocio.tsx')
    expect(src).not.toContain("backgroundColor: 'var(--t-accent)'")
    expect(src.match(/className=\{CLASE_ACCION_SECUNDARIA\}/g)).toHaveLength(3)
    expect(src).toContain('min-h-11')
  })

  it('el «+» de la tarjeta es secundario de 44 × 44, sin rojo', () => {
    const src = fuente('TiendaProductoCard.tsx')
    expect(src).toContain('size-11')
    expect(src).not.toMatch(/bg-hc-red-500|var\(--t-primary\)/)
  })

  it('«Ver pedido» es la CTA con color primario y publica el alto del dock', () => {
    const src = fuente('TiendaBarraPedido.tsx')
    expect(src).toContain('bg-[var(--t-primary)]')
    expect(src).toContain('useDockInferior')
    expect(src).toContain('safe-area-inset-bottom')
  })

  it('no hay botón flotante de WhatsApp en /tienda/*', () => {
    expect(whatsappOculto('/tienda/qa-pyme', true, false)).toBe(true)
    expect(whatsappOculto('/tienda/qa-pyme/producto/1', true, false)).toBe(true)
  })
})
