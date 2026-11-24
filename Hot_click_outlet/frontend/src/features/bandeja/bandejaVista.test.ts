import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import '@/i18n'
import ListaConversaciones from './ListaConversaciones'
import HiloConversacion from './HiloConversacion'
import type { ConversacionBandeja, DetalleBandeja } from './bandejaTypes'

const base: ConversacionBandeja = {
  id: '11111111-1111-1111-1111-111111111111',
  canal: 'WHATSAPP',
  contacto: '***1234',
  modo: 'BOT',
  estado: 'ABIERTA',
  asignadoAId: null,
  asignadaAMi: false,
  ultimoMensaje: 'Hola, ¿tienen talla M?',
  ultimoMensajeEn: '2026-11-24T20:05:00Z',
  ventanaAbierta: true,
  ventanaVenceEn: '2026-11-25T20:05:00Z',
}

const noop = () => {}
const lista = (items: ConversacionBandeja[], extra: Partial<Parameters<typeof ListaConversaciones>[0]> = {}) =>
  renderToStaticMarkup(createElement(ListaConversaciones, {
    items, seleccionId: null, equipo: [{ id: 5, nombre: 'Ana Mora' }], cargando: false,
    hayMas: false, hayAnterior: false, onSeleccionar: noop, onPagina: noop, ...extra,
  }))

function hilo(c: Partial<ConversacionBandeja> = {}) {
  const detalle: DetalleBandeja = {
    conversacion: { ...base, ...c },
    mensajes: [
      { id: 1, rol: 'user', texto: 'Hola, ¿tienen talla M?', fecha: '2026-11-24T20:05:00Z' },
      { id: 2, rol: 'assistant', texto: 'Sí, quedan 3.', fecha: '2026-11-24T20:05:10Z' },
      { id: 3, rol: 'persona', texto: 'Yo la atiendo.', fecha: '2026-11-24T20:06:00Z' },
    ],
  }
  return renderToStaticMarkup(createElement(HiloConversacion, {
    detalle, equipo: [{ id: 5, nombre: 'Ana Mora' }], ocupado: false,
    onVolver: noop, onPausar: noop, onReanudar: noop, onTomar: noop, onAsignar: noop, onCerrar: noop,
    onEnviar: () => Promise.resolve(true),
  }))
}

describe('bandeja: lista', () => {
  it('muestra canal, contacto enmascarado, modo y quién atiende', () => {
    const html = lista([base, { ...base, id: '2', canal: 'INSTAGRAM', modo: 'PERSONA', asignadoAId: 5 }])
    expect(html).toContain('WhatsApp')
    expect(html).toContain('Instagram')
    expect(html).toContain('***1234')
    expect(html).toContain('Atiende el bot')
    expect(html).toContain('Atiende una persona')
    expect(html).toContain('Atiende: Ana Mora')
    expect(html).toContain('Sin asignar')
    expect(html).toContain('aria-label="Conversaciones"')
  })

  it('cada fila es un botón y la seleccionada se marca con aria-current', () => {
    const html = lista([base], { seleccionId: base.id })
    expect(html).toContain('<button type="button"')
    expect(html).toContain('aria-current="true"')
  })

  it('sin conversaciones muestra el estado vacío; cargando muestra el aviso', () => {
    expect(lista([])).toContain('No hay conversaciones')
    expect(lista([], { cargando: true })).toContain('Cargando')
  })

  it('la paginación solo aparece si hay más o hay anterior', () => {
    expect(lista([base])).not.toContain('Paginación')
    expect(lista([base], { hayMas: true })).toContain('Siguiente')
  })
})

describe('bandeja: detalle', () => {
  it('en modo bot ofrece Pausar bot y Tomar; sin asignar ofrece Asignar con el equipo', () => {
    const html = hilo()
    expect(html).toContain('Pausar bot')
    expect(html).toContain('Tomar')
    expect(html).toContain('Asignar a')
    expect(html).toContain('Ana Mora')
    expect(html).toContain('Cerrar')
    expect(html).not.toContain('Devolver al bot')
  })

  it('en modo persona ofrece Devolver al bot; si ya es mía no ofrece Tomar', () => {
    const html = hilo({ modo: 'PERSONA', asignadaAMi: true, asignadoAId: 1 })
    expect(html).toContain('Devolver al bot')
    expect(html).not.toContain('>Tomar<')
  })

  it('pinta el hilo como un registro accesible con el rol de cada turno', () => {
    const html = hilo()
    expect(html).toContain('role="log"')
    expect(html).toContain('Cliente')
    expect(html).toContain('Bot')
    expect(html).toContain('Equipo')
    expect(html).toContain('Yo la atiendo.')
  })

  it('la caja de respuesta tiene etiqueta y está habilitada dentro de la ventana', () => {
    const html = hilo()
    expect(html).toContain('>Responder<')
    expect(html).toMatch(/<textarea[^>]*aria-describedby/)
    expect(html).not.toMatch(/<textarea[^>]*\sdisabled=""/)
  })

  it('fuera de la ventana de 24 h la caja se bloquea y explica por qué', () => {
    const html = hilo({ ventanaAbierta: false })
    expect(html).toMatch(/<textarea[^>]*\sdisabled=""/)
    expect(html).toContain('Pasaron más de 24 horas')
  })

  it('una conversación cerrada no ofrece acciones ni deja responder', () => {
    const html = hilo({ estado: 'CERRADA' })
    expect(html).not.toContain('Pausar bot')
    expect(html).not.toContain('Asignar a')
    expect(html).toMatch(/<textarea[^>]*\sdisabled=""/)
    expect(html).toContain('La conversación está cerrada.')
  })
})
