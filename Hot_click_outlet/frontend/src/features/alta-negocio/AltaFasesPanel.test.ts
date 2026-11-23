import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import AltaFasesPanel, { StepperFases } from './AltaFasesPanel'
import { TEXTO_BANNER, TEXTO_BOTON_ONVO, type EstadoAlta } from './altaFases'

function estado(parcial: Partial<EstadoAlta> = {}): EstadoAlta {
  return {
    altaPorFases: true, estadoEmpresa: 'PENDIENTE_APROBACION', fase: 'ONVO', faseNumero: 3, publicada: false,
    rechazada: false, productosActivos: 2, cuentaOnvo: 'PENDIENTE_ONBOARDING', cuentaActiva: false, cuentaPerdida: false, ...parcial,
  }
}

const html = (e: EstadoAlta, extra: { ocupado?: boolean; error?: string } = {}) =>
  renderToStaticMarkup(createElement(AltaFasesPanel, { estado: e, ...extra }))

describe('AltaFasesPanel (banner + stepper + botón ONVO)', () => {
  it('muestra el aviso de tienda en espera, la fase actual y el botón de ONVO', () => {
    const out = html(estado())
    expect(out).toContain(TEXTO_BANNER)
    expect(out).toContain(TEXTO_BOTON_ONVO)
    expect(out).toContain('Cuenta ONVO: Pendiente de sus datos')
    expect(out).toContain('role="status"')
    expect(out).toContain('data-perdida="no"')
  })

  it('el stepper tiene las 5 fases y marca la actual con aria-current', () => {
    const out = renderToStaticMarkup(createElement(StepperFases, { estado: estado() }))
    for (const titulo of ['Registro', 'Productos y configuración', 'ONVO', 'Revisión HotClick', 'Publicada']) expect(out).toContain(titulo)
    expect((out.match(/data-fase=/g) ?? []).length).toBe(5)
    expect(out).toMatch(/data-fase="ONVO" data-estado="actual" aria-current="step"/)
    expect(out).toMatch(/data-fase="REGISTRO" data-estado="hecha"/)
    expect(out).toMatch(/data-fase="PUBLICADA" data-estado="pendiente"/)
  })

  it('en revisión HotClick no ofrece el botón de ONVO y muestra la cuenta activa', () => {
    const out = html(estado({ fase: 'REVISION_HOTCLICK', faseNumero: 4, cuentaActiva: true, cuentaOnvo: 'ACTIVA' }))
    expect(out).not.toContain(TEXTO_BOTON_ONVO)
    expect(out).toContain('Cuenta ONVO: Activa')
    expect(out).toContain('HotClick está revisando')
  })

  it('cuenta perdida: aviso rojo (role alert), pagos pausados y botón para corregir en ONVO', () => {
    const out = html(estado({ estadoEmpresa: 'ACTIVO', cuentaPerdida: true, cuentaOnvo: 'SUSPENDIDA' }))
    expect(out).toContain('role="alert"')
    expect(out).toContain('data-perdida="si"')
    expect(out).toContain('Sus pagos en línea están pausados')
    expect(out).toContain('Cuenta ONVO: Suspendida')
    expect(out).toContain(TEXTO_BOTON_ONVO)
    expect(out).toContain('border-hc-danger')
    expect(out).not.toContain(TEXTO_BANNER)
  })

  it('mientras abre ONVO el botón queda deshabilitado; los errores se anuncian', () => {
    expect(html(estado(), { ocupado: true })).toMatch(/<button[^>]*disabled/)
    expect(html(estado(), { error: 'No se pudo abrir ONVO. Intente de nuevo.' })).toContain('No se pudo abrir ONVO. Intente de nuevo.')
  })
})
