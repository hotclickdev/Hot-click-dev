import { describe, expect, it } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import '@/i18n'
import { ToastProvider } from '@/components/ui/Toast'
import ConectarCuentasMeta from './ConectarCuentasMeta'
import { mensajeDeConexion } from './conexionHelpers'
import { debeRecargarPorCsp, interpretarMensajeSignup } from './fbSdk'

describe('interpretarMensajeSignup', () => {
  const fin = JSON.stringify({
    type: 'WA_EMBEDDED_SIGNUP',
    event: 'FINISH',
    data: { phone_number_id: '111', waba_id: '222' },
  })

  it('entrega los ids cuando termina el flujo desde facebook.com', () => {
    expect(interpretarMensajeSignup('https://www.facebook.com', fin)).toEqual({ phoneNumberId: '111', wabaId: '222' })
  })

  it('ignora mensajes de otros orígenes (incluye dominios que solo terminan parecido)', () => {
    expect(interpretarMensajeSignup('https://evil.com', fin)).toBeNull()
    expect(interpretarMensajeSignup('https://notfacebook.com', fin)).toBeNull()
    expect(interpretarMensajeSignup('no-es-url', fin)).toBeNull()
  })

  it('reconoce cancelación y descarta basura', () => {
    expect(
      interpretarMensajeSignup('https://web.facebook.com', { type: 'WA_EMBEDDED_SIGNUP', event: 'CANCEL' }),
    ).toBe('cancelado')
    expect(interpretarMensajeSignup('https://www.facebook.com', '{no json')).toBeNull()
    expect(interpretarMensajeSignup('https://www.facebook.com', { type: 'otro' })).toBeNull()
  })
})

describe('mensajeDeConexion', () => {
  it('503 muestra el aviso de pendiente de configurar', () => {
    expect(mensajeDeConexion({ response: { status: 503 } }, 'x', 'Pendiente')).toBe('Pendiente')
  })
  it('usa el mensaje del servidor en 403 y 502, y el genérico en 500', () => {
    expect(mensajeDeConexion({ response: { status: 403, data: { message: 'Solo el propietario' } } }, 'x', 'p')).toBe(
      'Solo el propietario',
    )
    expect(mensajeDeConexion({ response: { status: 500, data: { message: 'interno' } } }, 'x', 'p')).toBe('x')
  })
})

describe('ConectarCuentasMeta', () => {
  it('muestra ambos botones, deshabilitados mientras carga la configuración', () => {
    const html = renderToStaticMarkup(createElement(ToastProvider, null, createElement(ConectarCuentasMeta)))
    expect(html).toContain('Conectar WhatsApp')
    expect(html).toContain('Conectar Instagram y Facebook')
    expect(html).toContain('disabled')
  })
})

describe('debeRecargarPorCsp (AG-14 H-08)', () => {
  function almacenEnMemoria() {
    const datos = new Map<string, string>()
    return {
      getItem: (k: string) => datos.get(k) ?? null,
      setItem: (k: string, v: string) => void datos.set(k, v),
      removeItem: (k: string) => void datos.delete(k),
    }
  }

  it('recarga una sola vez cuando el SDK se bloquea', () => {
    const almacen = almacenEnMemoria()
    expect(debeRecargarPorCsp(almacen)).toBe(true)
    expect(debeRecargarPorCsp(almacen)).toBe(false)
  })

  it('sin almacenamiento o con error no recarga (evita bucles)', () => {
    expect(debeRecargarPorCsp(null)).toBe(false)
    const roto = {
      getItem: () => {
        throw new Error('bloqueado')
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    }
    expect(debeRecargarPorCsp(roto)).toBe(false)
  })
})
