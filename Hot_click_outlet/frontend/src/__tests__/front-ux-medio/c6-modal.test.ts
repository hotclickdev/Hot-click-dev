import { describe, expect, it } from 'vitest'
import { leer } from './helpers'

describe('C6: modal de proveedor accesible y con scroll a 360 px', () => {
  const s = leer('pages/admin/proveedores/ProveedorFormModal.tsx')
  it('role=dialog, aria-modal y título enlazado', () => {
    expect(s).toContain('role="dialog"')
    expect(s).toContain('aria-modal="true"')
    expect(s).toMatch(/aria-labelledby="proveedor-modal-titulo"[\s\S]*id="proveedor-modal-titulo"/)
  })
  it('alto máximo al viewport y scroll vertical', () => {
    expect(s).toMatch(/max-h-\[calc\(100dvh-2rem\)\]/)
    expect(s).toContain('overflow-y-auto')
  })
})
