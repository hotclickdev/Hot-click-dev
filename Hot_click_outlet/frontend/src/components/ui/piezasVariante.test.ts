import { describe, expect, it, vi } from 'vitest'
import { createElement, type ReactNode } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { MemoryRouter } from 'react-router-dom'
import '@/i18n'

// La hoja inferior usa un portal (no se pinta en SSR): se reemplaza por un contenedor marcado.
vi.mock('@/components/comprador/HojaInferior', () => ({
  default: ({ abierta, titulo, children }: { abierta: boolean; titulo: ReactNode; children: ReactNode }) =>
    abierta ? createElement('div', { 'data-hoja': 'figma' }, titulo, children) : null,
}))

const { default: Modal } = await import('./Modal')
const { ConfirmModal } = await import('./ConfirmModal')
const { default: Input } = await import('./Input')
const { default: Button } = await import('./Button')
const { colorBarra } = await import('./varianteVisitante')
const { varianteDeRuta } = await import('./varianteVisitante')
const { VarianteVisitanteProvider } = await import('./VarianteVisitanteProvider')

/** Pinta `nodo` sin proveedor (tests y paneles sueltos) o en una ruta con el proveedor de `App`. */
function pintar(nodo: ReactNode, ruta?: string) {
  if (!ruta) return renderToStaticMarkup(createElement(MemoryRouter, null, nodo))
  return renderToStaticMarkup(
    createElement(MemoryRouter, { initialEntries: [ruta] }, createElement(VarianteVisitanteProvider, null, nodo)),
  )
}

const PANELES = ['/admin/pedidos', '/pos/caja', '/emprendedor/inicio', '/pyme/inventario', '/negocio-plus/reportes', '/registro-empresa', '/registrar-negocio']
const VISITANTE = ['/', '/productos/12', '/tienda/casa-luna-506', '/carrito', '/checkout', '/encargo/tok', '/cotizacion/tok', '/mis-pedidos']

describe('varianteDeRuta: Figma solo en rutas del visitante', () => {
  it.each(VISITANTE)('%s → figma', (ruta) => expect(varianteDeRuta(ruta, null)).toBe('figma'))
  it.each(PANELES)('%s → clasica', (ruta) => expect(varianteDeRuta(ruta, 'EMPRENDEDOR')).toBe('clasica'))
  it('/perfil: Figma solo para el comprador; emprendedor, admin, Pyme y Negocio Plus siguen igual', () => {
    expect(varianteDeRuta('/perfil', 'USUARIO_FINAL')).toBe('figma')
    for (const rol of ['EMPRENDEDOR', 'ADMIN', 'SUPER_ADMIN', 'PYME', 'NEGOCIO_PLUS']) {
      expect(varianteDeRuta('/perfil', rol)).toBe('clasica')
    }
  })
  it('prototipo (/prototipo, /visitante) no cambia', () => {
    expect(varianteDeRuta('/prototipo/inicio', null)).toBe('clasica')
    expect(varianteDeRuta('/visitante/home', null)).toBe('clasica')
  })
})

describe('Variante por defecto (paneles): igual que antes', () => {
  for (const ruta of [undefined, ...PANELES]) {
    const donde = ruta ?? 'sin proveedor'
    it(`Button en ${donde}: clases hc-btn de siempre`, () => {
      const html = pintar(createElement(Button, null, 'Guardar'), ruta)
      expect(html).toMatch(/class="\s*hc-btn\s+hc-btn-primary\s+disabled:opacity-40 disabled:cursor-not-allowed\s*"/)
      expect(html).not.toContain('bg-hc-red-500')
    })
    it(`Input en ${donde}: hc-input, hc-input-label y hc-input-error`, () => {
      const html = pintar(createElement(Input, { label: 'Nombre', error: 'Falta' }), ruta)
      expect(html).toContain('class="hc-input-label"')
      expect(html).toMatch(/class="\s*hc-input\s+px-4\s+hc-input-error-state/)
      expect(html).toContain('class="hc-input-error"')
      expect(html).not.toContain('border-hc-n-200')
    })
    it(`Modal y ConfirmModal en ${donde}: tarjeta hc-modal-bg centrada, sin hoja`, () => {
      const modal = pintar(createElement(Modal, { open: true, onClose: () => undefined, title: 'Título' }, 'Hola'), ruta)
      expect(modal).toContain('hc-modal-bg rounded-2xl')
      expect(modal).toContain('hc-modal-close')
      expect(modal).not.toContain('data-hoja')
      const confirm = pintar(createElement(ConfirmModal, { open: true, title: '¿Seguro?', message: 'Se borra' }), ruta)
      expect(confirm).toContain('background-color:#ef4444')
      expect(confirm).toContain('hc-modal-bg')
      expect(confirm).not.toContain('data-hoja')
    })
  }
  it('PageProgressBar clásica: roja con brillo', () => {
    expect(colorBarra('clasica')).toEqual({ background: 'var(--hc-primary)', boxShadow: '0 0 10px color-mix(in srgb, var(--hc-primary) 45%, transparent)' })
  })
  it('Toast en un panel: la ruta da la variante clásica', () => {
    expect(varianteDeRuta('/admin/pedidos', 'ADMIN')).toBe('clasica')
  })
})

describe('Rutas del visitante: variante Figma', () => {
  for (const ruta of VISITANTE) {
    it(`${ruta}: Button rojo de 48 con radio 12`, () => {
      const html = pintar(createElement(Button, null, 'Continuar'), ruta)
      expect(html).toContain('rounded-[12px]')
      expect(html).toContain('bg-hc-red-500')
      expect(html).toContain('min-h-12')
      expect(html).not.toContain('hc-btn')
    })
    it(`${ruta}: Input del manual (borde n200, foco b600)`, () => {
      const html = pintar(createElement(Input, { label: 'Nombre', error: 'Falta' }), ruta)
      expect(html).toContain('border-hc-n-200')
      expect(html).toContain('focus:border-hc-blue-600')
      expect(html).toContain('text-hc-red-600')
      expect(html).not.toContain('hc-input-label')
    })
    it(`${ruta}: Modal y ConfirmModal como hoja inferior`, () => {
      const modal = pintar(createElement(Modal, { open: true, onClose: () => undefined, title: 'Título' }, 'Hola'), ruta)
      expect(modal).toContain('data-hoja="figma"')
      expect(modal).toContain('font-display text-[17px] font-bold')
      expect(modal).not.toContain('hc-modal-bg')
      const confirm = pintar(createElement(ConfirmModal, { open: true, title: '¿Seguro?', message: 'Se borra' }), ruta)
      expect(confirm).toContain('bg-hc-red-500')
      expect(confirm).toContain('border-hc-n-200')
      expect(confirm).not.toContain('#ef4444')
    })
  }
  it('PageProgressBar Figma: azul b600 sin brillo', () => {
    expect(colorBarra('figma')).toEqual({ background: 'var(--hc-blue-600)', boxShadow: 'none' })
  })
  // El toast de /encargo con la tarjeta de Figma lo prueba `visitante-sin-paleta-vieja.spec.ts` (necesita navegador).
  it('la prop explícita gana sobre la ruta (p. ej. el modal admin de /login)', () => {
    const html = pintar(createElement(Button, { variante: 'clasica' }, 'Admin'), '/login')
    expect(html).toContain('hc-btn-primary')
  })
})
