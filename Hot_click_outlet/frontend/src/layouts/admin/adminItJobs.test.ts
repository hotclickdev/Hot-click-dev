import { describe, expect, it } from 'vitest'
import { buildAdminItLinks, esRutaTenantOpsParaAdmin } from './adminItJobs'
import type { TFunction } from 'i18next'

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

  it('no bloquea tiendas, reportes de producto ni agentes', () => {
    expect(esRutaTenantOpsParaAdmin('/admin/empresas')).toBe(false)
    expect(esRutaTenantOpsParaAdmin('/admin/empresas/22')).toBe(false)
    expect(esRutaTenantOpsParaAdmin('/admin/reportes-producto')).toBe(false)
    expect(esRutaTenantOpsParaAdmin('/admin/agentes')).toBe(false)
    expect(esRutaTenantOpsParaAdmin('/admin/agentes/inspecciones')).toBe(false)
  })
})

describe('buildAdminItLinks', () => {
  it('incluye Agentes en el menú Sistema', () => {
    const t = ((k: string) => k) as TFunction
    expect(buildAdminItLinks(t).some((l) => l.to === '/admin/agentes')).toBe(true)
  })
})
