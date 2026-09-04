import { describe, expect, it } from 'vitest'
import { esRutaTenantOpsParaAdmin } from './adminItJobs'

describe('esRutaTenantOpsParaAdmin', () => {
  it('bloquea el catálogo de tienda propia', () => {
    expect(esRutaTenantOpsParaAdmin('/admin/productos')).toBe(true)
    expect(esRutaTenantOpsParaAdmin('/admin/productos/nuevo')).toBe(true)
    expect(esRutaTenantOpsParaAdmin('/admin/pos')).toBe(true)
  })

  it('deja pasar carga masiva e importar para asignar a un negocio', () => {
    expect(esRutaTenantOpsParaAdmin('/admin/productos/carga-masiva')).toBe(false)
    expect(esRutaTenantOpsParaAdmin('/admin/productos/importar')).toBe(false)
  })

  it('no bloquea tiendas ni reportes de producto', () => {
    expect(esRutaTenantOpsParaAdmin('/admin/empresas')).toBe(false)
    expect(esRutaTenantOpsParaAdmin('/admin/empresas/22')).toBe(false)
    expect(esRutaTenantOpsParaAdmin('/admin/reportes-producto')).toBe(false)
  })
})
