import { describe, expect, it } from 'vitest'
import {
  FASES, TEXTO_BANNER, TEXTO_BOTON_ONVO, estadoDeFase, etiquetaCuenta, leerEstado, mensajeDeFase,
  mostrarBotonOnvo, mostrarPanelAlta, urlDeRespuesta, urlOnvoSegura, type EstadoAlta,
} from './altaFases'

function estado(parcial: Partial<EstadoAlta> = {}): EstadoAlta {
  return {
    altaPorFases: true, estadoEmpresa: 'PENDIENTE_APROBACION', fase: 'PRODUCTOS', faseNumero: 2, publicada: false,
    rechazada: false, productosActivos: 0, cuentaOnvo: 'PENDIENTE_ONBOARDING', cuentaActiva: false, cuentaPerdida: false, ...parcial,
  }
}

describe('alta por fases: lectura del estado', () => {
  it('lee la respuesta del backend y descarta lo raro', () => {
    expect(leerEstado({ altaPorFases: true, fase: 'ONVO', faseNumero: 3, cuentaOnvo: 'EN_APROBACION', productosActivos: 4 }))
      .toMatchObject({ altaPorFases: true, fase: 'ONVO', faseNumero: 3, cuentaOnvo: 'EN_APROBACION', productosActivos: 4, publicada: false })
    expect(leerEstado({ altaPorFases: true, fase: 'INVENTADA' })?.fase).toBeNull()
    expect(leerEstado(null)).toBeNull()
    expect(leerEstado({ fase: 'ONVO' })).toBeNull()
    expect(leerEstado('x')).toBeNull()
  })

  it('el panel solo aparece para negocios por fases sin publicar o con la cuenta perdida', () => {
    expect(mostrarPanelAlta(null)).toBe(false)
    expect(mostrarPanelAlta(estado({ altaPorFases: false }))).toBe(false)
    expect(mostrarPanelAlta(estado())).toBe(true)
    expect(mostrarPanelAlta(estado({ publicada: true, fase: 'PUBLICADA', faseNumero: 5 }))).toBe(false)
    expect(mostrarPanelAlta(estado({ publicada: false, cuentaPerdida: true, estadoEmpresa: 'ACTIVO' }))).toBe(true)
    expect(mostrarPanelAlta(estado({ rechazada: true }))).toBe(false)
  })
})

describe('alta por fases: stepper', () => {
  it('son 5 fases en orden: registro, productos, ONVO, revisión HotClick, publicada', () => {
    expect(FASES.map((f) => f.titulo)).toEqual(['Registro', 'Productos y configuración', 'ONVO', 'Revisión HotClick', 'Publicada'])
    expect(FASES.map((f) => f.numero)).toEqual([1, 2, 3, 4, 5])
  })

  it('marca hechas las anteriores, la actual y pendientes las siguientes', () => {
    const e = estado({ fase: 'ONVO', faseNumero: 3 })
    expect([1, 2, 3, 4, 5].map((n) => estadoDeFase(e, n))).toEqual(['hecha', 'hecha', 'actual', 'pendiente', 'pendiente'])
    const rev = estado({ fase: 'REVISION_HOTCLICK', faseNumero: 4, cuentaActiva: true, cuentaOnvo: 'ACTIVA' })
    expect([1, 2, 3, 4, 5].map((n) => estadoDeFase(rev, n))).toEqual(['hecha', 'hecha', 'hecha', 'actual', 'pendiente'])
  })

  it('con la cuenta perdida no se muestra como publicada: vuelve a la fase ONVO', () => {
    const e = estado({ estadoEmpresa: 'ACTIVO', fase: 'ONVO', faseNumero: 3, publicada: false, cuentaPerdida: true, cuentaOnvo: 'SUSPENDIDA' })
    expect(estadoDeFase(e, 3)).toBe('actual')
    expect(estadoDeFase(e, 5)).toBe('pendiente')
  })
})

describe('alta por fases: estado de la cuenta y botón de ONVO', () => {
  it('etiquetas de la cuenta conectada', () => {
    expect(etiquetaCuenta('ACTIVA')).toEqual({ texto: 'Activa', tono: 'ok' })
    expect(etiquetaCuenta('EN_APROBACION').texto).toBe('En revisión')
    expect(etiquetaCuenta('PENDIENTE_ONBOARDING').texto).toBe('Pendiente de sus datos')
    expect(etiquetaCuenta('PENDIENTE_ONVO').texto).toBe('Pendiente')
    expect(etiquetaCuenta('SUSPENDIDA')).toEqual({ texto: 'Suspendida', tono: 'alerta' })
    expect(etiquetaCuenta('INACTIVA').tono).toBe('alerta')
    expect(etiquetaCuenta('SIN_CUENTA').texto).toBe('Sin cuenta todavía')
  })

  it('el botón de ONVO se ofrece mientras la cuenta no esté activa, o si se perdió', () => {
    expect(mostrarBotonOnvo(estado())).toBe(true)
    expect(mostrarBotonOnvo(estado({ cuentaActiva: true, cuentaOnvo: 'ACTIVA' }))).toBe(false)
    expect(mostrarBotonOnvo(estado({ cuentaActiva: false, cuentaPerdida: true, cuentaOnvo: 'SUSPENDIDA' }))).toBe(true)
  })

  it('textos exactos del banner y del botón; mensajes de fase en usted', () => {
    expect(TEXTO_BANNER).toBe('Tu tienda aún no está publicada (en espera)')
    expect(TEXTO_BOTON_ONVO).toBe('Ir a ONVO a llenar tus datos y verificar el depósito a tu cuenta')
    expect(mensajeDeFase(estado())).toContain('Cree sus productos')
    expect(mensajeDeFase(estado({ fase: 'ONVO' }))).toContain('Complete sus datos en ONVO')
    expect(mensajeDeFase(estado({ fase: 'REVISION_HOTCLICK' }))).toContain('HotClick está revisando')
    expect(mensajeDeFase(estado({ cuentaPerdida: true }))).toContain('pagos en línea están pausados')
  })
})

describe('alta por fases: enlace de ONVO (solo https de dominios ONVO)', () => {
  it('abre solo https de onvopay.com / onvo.cr y sus subdominios', () => {
    expect(urlOnvoSegura('https://onvopay.com/setup/abc')).toBe('https://onvopay.com/setup/abc')
    expect(urlOnvoSegura('https://app.onvopay.com/setup/abc')).toBe('https://app.onvopay.com/setup/abc')
    expect(urlOnvoSegura('https://pay.onvo.cr/x')).toBe('https://pay.onvo.cr/x')
  })

  it('rechaza http, otros dominios, parecidos, credenciales y esquemas peligrosos', () => {
    for (const malo of [
      'http://onvopay.com/setup', 'https://evil.com/onvopay.com', 'https://onvopay.com.evil.com/x', 'https://notonvopay.com/x',
      'https://user:pw@onvopay.com/x', 'javascript:alert(1)', 'data:text/html,hola', '//onvopay.com/x', '', 'no es url',
    ]) expect(urlOnvoSegura(malo)).toBeNull()
    expect(urlOnvoSegura(undefined)).toBeNull()
    expect(urlOnvoSegura(42)).toBeNull()
    expect(urlOnvoSegura('https://onvopay.com/' + 'a'.repeat(1100))).toBeNull()
  })

  it('urlDeRespuesta toma la url del cuerpo ya desenvuelto o devuelve null', () => {
    expect(urlDeRespuesta({ url: 'https://onvopay.com/setup/z', mensaje: 'Enlace listo.' })).toBe('https://onvopay.com/setup/z')
    expect(urlDeRespuesta({ url: null, mensaje: 'x' })).toBeNull()
    expect(urlDeRespuesta({ url: 'http://onvopay.com/x' })).toBeNull()
    expect(urlDeRespuesta(null)).toBeNull()
  })
})
