import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import FormularioPorPasos from './FormularioPorPasos'
import { PASOS_CAMBIAR_PLAN, TOTAL_PASOS_PLAN } from './planesPageHelpers'

const ULTIMO_PASO = PASOS_CAMBIAR_PLAN.length - 1

function renderizar(props: { deshabilitado?: boolean; motivoDeshabilitado?: string; colorCtaFinal?: 'exito' | 'rojo' }): string {
  return renderToStaticMarkup(createElement(FormularioPorPasos, {
    pasos: PASOS_CAMBIAR_PLAN,
    pasoActual: ULTIMO_PASO,
    onPasoChange: () => undefined,
    validarPaso: () => null,
    onFinalizar: () => undefined,
    etiquetaFinal: 'Confirmar cambio',
    totalProgreso: TOTAL_PASOS_PLAN,
    children: null,
    ...props,
  }))
}

function botonConfirmar(html: string): string {
  const coincidencia = /<button[^>]*>(?:(?!<\/button>).)*Confirmar cambio.*?<\/button>/s.exec(html)
  return coincidencia?.[0] ?? ''
}

describe('FormularioPorPasos · botón principal deshabilitado (A3)', () => {
  it('deshabilitado: botón disabled, aria-disabled, gris y con el motivo visible', () => {
    const html = renderizar({ deshabilitado: true, motivoDeshabilitado: 'Te falta ajustar 13 productos', colorCtaFinal: 'rojo' })
    const boton = botonConfirmar(html)
    expect(boton).toContain('disabled=""')
    expect(boton).toContain('aria-disabled="true"')
    expect(boton).toContain('--hc-n-100')
    expect(boton).not.toContain('--hc-success')
    expect(html).toContain('Te falta ajustar 13 productos')
  })

  it('habilitado con color rojo: usa el rojo de marca y no el verde de éxito', () => {
    const boton = botonConfirmar(renderizar({ colorCtaFinal: 'rojo' }))
    expect(boton).toContain('bg-hc-primary')
    expect(boton).not.toContain('--hc-success')
    expect(boton).not.toContain('disabled=""')
  })

  it('sin opciones nuevas conserva el comportamiento de siempre (último paso en color de éxito)', () => {
    const boton = botonConfirmar(renderizar({}))
    expect(boton).toContain('--hc-success')
  })
})
