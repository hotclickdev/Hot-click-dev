import { describe, expect, it } from 'vitest'
import {
  ALTO_BARRA_INFERIOR,
  ESPACIO_BAJO_BARRA,
  ESPACIO_BAJO_PIE_MOVIL,
  ESPACIO_SIN_BARRA,
  SEPARACION_FLOTANTE,
  TAMANO_WHATSAPP,
  bottomWhatsappPx,
  esFichaProducto,
  espacioReservadoMovil,
  whatsappOculto,
} from './flotantesHelpers'
import { leerPantallaSinConexion, retenerPantallaSinConexion } from './pantallaSinConexionStore'

describe('esFichaProducto', () => {
  it('detecta la ficha y no el catálogo', () => {
    expect(esFichaProducto('/productos/12')).toBe(true)
    expect(esFichaProducto('/productos/12/opiniones')).toBe(true)
    expect(esFichaProducto('/productos')).toBe(false)
    expect(esFichaProducto('/')).toBe(false)
  })
})

describe('whatsappOculto', () => {
  it('se oculta en auth, carrito, pago y paneles', () => {
    for (const ruta of ['/login', '/registro', '/carrito', '/checkout', '/checkout/pago', '/pago/exito', '/admin/pedidos', '/pos/caja', '/sin-conexion']) {
      expect(whatsappOculto(ruta, false, false)).toBe(true)
    }
  })
  it('se oculta en la tienda del vendedor y en el prototipo', () => {
    expect(whatsappOculto('/tienda/casa-luna', true, false)).toBe(true)
    expect(whatsappOculto('/prototipo/x', false, true)).toBe(true)
  })
  it('se muestra en Home, catálogo y ficha', () => {
    for (const ruta of ['/', '/productos', '/productos/3', '/mis-pedidos', '/categorias', '/servicios', '/perfil']) {
      expect(whatsappOculto(ruta, false, false)).toBe(false)
    }
  })
  it('oculta el Home solo cuando la pantalla sin conexión está montada', () => {
    expect(whatsappOculto('/', false, false, true)).toBe(true)
    expect(whatsappOculto('/', false, false, false)).toBe(false)
  })
})

describe('pantalla sin conexión', () => {
  it('se retiene al montar y se suelta al desmontar', () => {
    expect(leerPantallaSinConexion()).toBe(false)
    const soltar = retenerPantallaSinConexion()
    expect(leerPantallaSinConexion()).toBe(true)
    soltar()
    expect(leerPantallaSinConexion()).toBe(false)
  })
})

describe('medidas de Figma 52:2418', () => {
  it('el botón queda a 16 px sobre la barra de 67 px', () => {
    expect(ALTO_BARRA_INFERIOR + SEPARACION_FLOTANTE).toBe(83)
    expect(TAMANO_WHATSAPP).toBe(56)
    expect(bottomWhatsappPx(true)).toBe(83)
  })

  it('sin barra usa el margen de 16 px, no el offset de la barra', () => {
    expect(bottomWhatsappPx(false)).toBe(SEPARACION_FLOTANTE)
    expect(ESPACIO_SIN_BARRA).toBe(88)
  })

  it('el pie móvil reserva sitio para el botón y la barra', () => {
    expect(ESPACIO_BAJO_PIE_MOVIL).toBe(155)
    expect(ESPACIO_BAJO_BARRA).toBe(72)
  })
})

describe('espacioReservadoMovil', () => {
  it('en la raíz con pie y barra deja 155 px', () => {
    expect(espacioReservadoMovil({ hayBarra: true, hayPieMovil: true, fabVisible: true })).toBe(155)
  })

  it('con barra y sin pie móvil conserva 72 px', () => {
    expect(espacioReservadoMovil({ hayBarra: true, hayPieMovil: false, fabVisible: true })).toBe(72)
  })

  it('sin barra y con el botón visible deja 88 px', () => {
    expect(espacioReservadoMovil({ hayBarra: false, hayPieMovil: false, fabVisible: true })).toBe(88)
  })

  it('sin barra y sin botón no agrega hueco', () => {
    expect(espacioReservadoMovil({ hayBarra: false, hayPieMovil: false, fabVisible: false })).toBeNull()
  })

  it('con barra y sin botón conserva solo el hueco de la barra', () => {
    expect(espacioReservadoMovil({ hayBarra: true, hayPieMovil: true, fabVisible: false })).toBe(72)
  })
})
