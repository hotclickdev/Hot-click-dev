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

describe('filtrarLinksPorPermiso', () => {
  it('ADMIN ve todos los links', () => {
    expect(filtrarLinksPorPermiso(LINKS, [], 'ADMIN')).toHaveLength(LINKS.length)
  })

  it('SUPPORT solo inicio + global.companies (+ sección si aplica)', () => {
    const out = filtrarLinksPorPermiso(LINKS, ['global.companies'], 'SUPPORT')
    expect(out.map((l) => l.to ?? l.section)).toEqual([
      '/admin',
      '/admin/empresas',
    ])
  })

  it('FINANCE solo inicio + payouts', () => {
    const out = filtrarLinksPorPermiso(LINKS, ['global.metrics'], 'FINANCE')
    expect(out.map((l) => l.to ?? l.section)).toEqual([
      '/admin',
      'operarPlataforma',
      '/admin/payouts',
    ])
  })

  it('TRUST solo inicio + moderación', () => {
    const out = filtrarLinksPorPermiso(LINKS, ['global.approvals'], 'TRUST')
    expect(out.map((l) => l.to ?? l.section)).toEqual([
      '/admin',
      'operarPlataforma',
      '/admin/aprobaciones',
    ])
  })
})
