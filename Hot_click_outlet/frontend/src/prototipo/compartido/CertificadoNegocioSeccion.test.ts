import { readFileSync } from 'node:fs'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { ToastProvider } from '@/components/ui/Toast'
import { CertificadoNegocioSeccion } from './CertificadoNegocioSeccion'

// zustand en SSR lee el estado inicial, así que se simula el store.
const auth = vi.hoisted(() => ({ userRole: null as string | null, rolEquipo: null as string | null }))
vi.mock('@/store/authStore', () => ({
  default: (sel: (s: typeof auth) => unknown) => sel(auth),
}))

function render(userRole: string, rolEquipo: string | null) {
  auth.userRole = userRole
  auth.rolEquipo = rolEquipo
  return renderToStaticMarkup(createElement(ToastProvider, null, createElement(CertificadoNegocioSeccion)))
}

describe('Datos de tu negocio: certificado de firma', () => {
  it('la página real monta la sección, también con soloFormulario', () => {
    const src = readFileSync(new URL('./DatosNegocioPage.tsx', import.meta.url), 'utf8')
    expect(src).toContain("import { CertificadoNegocioSeccion } from './CertificadoNegocioSeccion'")
    // Va dentro de `wizard`, que se devuelve con y sin soloFormulario.
    const iniciaWizard = src.indexOf('const wizard = (')
    expect(src.indexOf('<CertificadoNegocioSeccion />')).toBeGreaterThan(iniciaWizard)
    expect(src.indexOf('<CertificadoNegocioSeccion />')).toBeLessThan(src.indexOf('if (soloFormulario)'))
  })

  it('PROPIETARIO ve los inputs del certificado y del PIN', () => {
    const html = render('EMPRENDEDOR', 'PROPIETARIO')
    expect(html).toContain('Certificado de firma')
    expect(html).toContain('type="file"')
    expect(html).toContain('type="password"')
    expect(html).toContain('autoComplete="new-password"')
  })

  it('EDITOR y ADMIN de equipo no ven inputs', () => {
    for (const rol of ['EDITOR', 'ADMIN']) {
      const html = render('EMPRENDEDOR', rol)
      expect(html).toContain('Certificado de firma')
      expect(html).not.toContain('<input')
    }
  })
})
