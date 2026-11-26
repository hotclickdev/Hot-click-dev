import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import '@/i18n'
import PanelResumen from './PanelResumen'
import HiloConversacion from './HiloConversacion'
import { estadoDeResumen } from './bandejaHelpers'
import type { DetalleBandeja } from './bandejaTypes'

const noop = () => {}

describe('bandeja: panel Resumen (AG-17)', () => {
  it('estadoDeResumen cubre cada caso', () => {
    expect(estadoDeResumen(undefined, false, null)).toEqual({ tipo: 'inactivo' })
    expect(estadoDeResumen(undefined, true, null)).toEqual({ tipo: 'cargando' })
    expect(estadoDeResumen(undefined, false, 'x')).toEqual({ tipo: 'error', mensaje: 'x' })
    expect(estadoDeResumen({ disponible: false, resumen: '', sugerencia: '' }, false, null)).toEqual({ tipo: 'noDisponible' })
    expect(estadoDeResumen({ disponible: true, resumen: 'R', sugerencia: 'S' }, false, null))
      .toEqual({ tipo: 'listo', resumen: 'R', sugerencia: 'S' })
  })

  it('con resumen listo muestra la sugerencia, el botón Usar sugerencia y el aviso de que no se envía solo', () => {
    const html = renderToStaticMarkup(createElement(PanelResumen, {
      estado: { tipo: 'listo', resumen: 'Quiere talla M', sugerencia: 'Sí, tenemos talla M' }, onGenerar: noop, onUsar: noop,
    }))
    expect(html).toContain('Quiere talla M')
    expect(html).toContain('Sí, tenemos talla M')
    expect(html).toContain('Usar sugerencia')
    expect(html).toContain('no se envía solo')
  })

  it('sin generar solo ofrece el botón; si no hay IA avisa', () => {
    const inactivo = renderToStaticMarkup(createElement(PanelResumen, { estado: { tipo: 'inactivo' }, onGenerar: noop, onUsar: noop }))
    expect(inactivo).toContain('Generar resumen')
    expect(inactivo).not.toContain('Usar sugerencia')
    const no = renderToStaticMarkup(createElement(PanelResumen, { estado: { tipo: 'noDisponible' }, onGenerar: noop, onUsar: noop }))
    expect(no).toContain('role="alert"')
  })

  it('el hilo muestra el panel solo si se le pasa onGenerarResumen', () => {
    const detalle: DetalleBandeja = {
      conversacion: {
        id: '1', canal: 'WHATSAPP', contacto: '***1234', modo: 'BOT', estado: 'ABIERTA', asignadoAId: null,
        asignadaAMi: false, ultimoMensaje: null, ultimoMensajeEn: null, ventanaAbierta: true, ventanaVenceEn: null, cupoAgotado: false,
      },
      mensajes: [],
    }
    const base = {
      detalle, equipo: [], ocupado: false, onVolver: noop, onPausar: noop, onReanudar: noop, onTomar: noop,
      onAsignar: noop, onCerrar: noop, onEnviar: () => Promise.resolve(true),
    }
    expect(renderToStaticMarkup(createElement(HiloConversacion, base))).not.toContain('Generar resumen')
    expect(renderToStaticMarkup(createElement(HiloConversacion, { ...base, onGenerarResumen: noop })))
      .toContain('Generar resumen')
  })
})
