import { describe, expect, it } from 'vitest'
import { MSG_CORREO, MSG_NOMBRE, MSG_TELEFONO, mensajeErrorCheckout } from './tiendaCheckoutValidacion'

const base = { metodoEnvio: 'RETIRO', direccionEntrega: '', telefonoCliente: '8888-8888', nombreCliente: 'Ana', correoCliente: 'ana@ejemplo.com' }

describe('QA-COM-013 · checkout de la tienda con mensajes en español', () => {
  it('cada campo vacío da su mensaje propio, no el del navegador', () => {
    expect(mensajeErrorCheckout({ ...base, nombreCliente: ' ' })).toBe(MSG_NOMBRE)
    expect(mensajeErrorCheckout({ ...base, correoCliente: 'ana' })).toBe(MSG_CORREO)
    expect(mensajeErrorCheckout({ ...base, telefonoCliente: '' })).toBe(MSG_TELEFONO)
    expect(mensajeErrorCheckout(base)).toBeNull()
  })
})
