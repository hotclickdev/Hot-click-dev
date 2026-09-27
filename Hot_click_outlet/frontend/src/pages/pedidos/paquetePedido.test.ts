import { describe, expect, it } from 'vitest'
import {
  TONO_ESTADO_PAQUETE,
  accionesHabilitadas,
  esGuiaDeCorreos,
  estadoPaquete,
  nombreTienda,
  urlSeguimiento,
  urlWhatsApp,
} from './paquetePedido'

describe('estadoPaquete', () => {
  it('traduce el estado del backend', () => {
    expect(estadoPaquete({ estadoPedido: 'PAGADO' })).toBe('enPreparacion')
    expect(estadoPaquete({ estadoPedido: 'ENVIADO' })).toBe('enviado')
    expect(estadoPaquete({ estado: 'LISTO_RETIRO' })).toBe('listoRetiro')
    expect(estadoPaquete({})).toBe('pendiente')
  })

  it('un estado desconocido cae en preparación', () => {
    expect(estadoPaquete({ estadoPedido: 'OTRO' })).toBe('enPreparacion')
  })

  it('cada estado tiene tono de pill', () => {
    expect(TONO_ESTADO_PAQUETE.enviado).toBe('azul')
    expect(TONO_ESTADO_PAQUETE.enPreparacion).toBe('ambar')
    expect(TONO_ESTADO_PAQUETE.entregado).toBe('verde')
    expect(TONO_ESTADO_PAQUETE.cancelado).toBe('rojo')
  })
})

describe('accionesHabilitadas', () => {
  it('solo con el paquete entregado', () => {
    expect(accionesHabilitadas({ estadoPedido: 'ENTREGADO' })).toBe(true)
    expect(accionesHabilitadas({ estadoPedido: 'ENVIADO' })).toBe(false)
  })
})

describe('guía', () => {
  it('sin URL propia es de Correos y arma el rastreo', () => {
    const paquete = { numeroGuia: 'CR 123' }
    expect(esGuiaDeCorreos(paquete)).toBe(true)
    expect(urlSeguimiento(paquete)).toBe('https://rastreo.correos.go.cr/?codigo=CR%20123')
  })

  it('con URL externa es entrega directa y usa esa URL', () => {
    const paquete = { numeroGuia: 'HX-9', urlTracking: 'https://envios.example/HX-9' }
    expect(esGuiaDeCorreos(paquete)).toBe(false)
    expect(urlSeguimiento(paquete)).toBe('https://envios.example/HX-9')
  })

  it('sin número de guía no hay seguimiento', () => {
    expect(urlSeguimiento({ urlTracking: 'https://envios.example/x' })).toBeNull()
  })
})

describe('urlWhatsApp', () => {
  it('abre el WhatsApp de HotClick con el mensaje codificado', () => {
    expect(urlWhatsApp('Hola & chao')).toBe('https://wa.me/50686667888?text=Hola%20%26%20chao')
  })
})

describe('nombreTienda', () => {
  it('usa el negocio o cae en HotClick', () => {
    expect(nombreTienda({ nombreNegocio: 'Casa Luna' })).toBe('Casa Luna')
    expect(nombreTienda({ nombreNegocio: '  ' })).toBe('HotClick')
    expect(nombreTienda({})).toBe('HotClick')
  })
})
