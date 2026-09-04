import { describe, expect, it } from 'vitest'
import { filtrarLinksPorPermiso, type SidebarLink } from './adminItJobs'

const LINKS: SidebarLink[] = [
  { to: '/admin', label: 'Inicio', exact: true },
  { to: '/admin/empresas', label: 'Tiendas', permiso: 'global.companies' },
  { section: 'operarPlataforma' },
  { to: '/admin/payouts', label: 'Payouts', permiso: 'global.metrics' },
  { to: '/admin/aprobaciones', label: 'Moderación', permiso: 'global.approvals' },
  { to: '/admin/usuarios', label: 'Usuarios' },
]

function clavesVisibles(permisos: string[], rol: string): Array<string | undefined> {
  return filtrarLinksPorPermiso(LINKS, permisos, rol).map((l) => l.to ?? l.section)
}

describe('filtrarLinksPorPermiso', () => {
  it('ADMIN ve todos los links', () => {
    expect(filtrarLinksPorPermiso(LINKS, [], 'ADMIN')).toHaveLength(LINKS.length)
  })

  it('SUPPORT solo inicio + global.companies', () => {
    expect(clavesVisibles(['global.companies'], 'SUPPORT')).toEqual([
      '/admin',
      '/admin/empresas',
    ])
  })

  it('FINANCE solo inicio + payouts', () => {
    expect(clavesVisibles(['global.metrics'], 'FINANCE')).toEqual([
      '/admin',
      'operarPlataforma',
      '/admin/payouts',
    ])
  })

  it('TRUST solo inicio + moderación', () => {
    expect(clavesVisibles(['global.approvals'], 'TRUST')).toEqual([
      '/admin',
      'operarPlataforma',
      '/admin/aprobaciones',
    ])
  })
})
