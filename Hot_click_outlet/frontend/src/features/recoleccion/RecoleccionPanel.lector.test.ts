import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import RecoleccionPanel from './RecoleccionPanel'

// SSR (renderToStaticMarkup) lee el snapshot inicial de zustand: se simula el selector del store.
let rolActual: string | null = null
vi.mock('@/store/authStore', () => ({
  default: (sel: (s: { userRole: string | null }) => unknown) => sel({ userRole: rolActual }),
}))
vi.mock('@/components/ui/Toast', () => ({ useToast: () => vi.fn() }))
vi.mock('@tanstack/react-query', () => ({ useQueryClient: () => ({ invalidateQueries: vi.fn() }) }))
vi.mock('./useRecolecciones', () => ({
  useRecolecciones: () => ({
    isLoading: false,
    data: [{ id: 1, estado: 'PENDIENTE', direccionRecoleccion: 'San José centro', direccionEntrega: 'Heredia', zona: 'GAM' }],
  }),
}))

function htmlComo(rol: string): string {
  rolActual = rol
  return renderToStaticMarkup(createElement(RecoleccionPanel))
}

describe('RecoleccionPanel según rol', () => {
  beforeEach(() => { rolActual = null })

  it('LECTOR no ve crear (formulario de nueva solicitud) ni cancelar recolección', () => {
    const html = htmlComo('LECTOR')
    expect(html).not.toContain('Nueva solicitud')
    expect(html).not.toContain('Cancelar solicitud')
    expect(html).toContain('Tus solicitudes')
  })

  it.each(['EMPRENDEDOR', 'PROPIETARIO', 'EDITOR'])('%s ve crear y cancelar', (rol) => {
    const html = htmlComo(rol)
    expect(html).toContain('Nueva solicitud')
    expect(html).toContain('Cancelar solicitud')
  })
})
