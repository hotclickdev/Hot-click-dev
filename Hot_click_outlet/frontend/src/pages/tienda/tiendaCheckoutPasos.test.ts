import { describe, expect, it } from 'vitest'
import { METODO_ENVIO_DOMICILIO, METODO_ENVIO_RETIRO } from './tiendaCheckoutValidacion'
import {
  armarDireccionTienda,
  errorPasoDatosTienda,
  errorPasoEntregaTienda,
  metodosPagoVisibles,
  pagoTrasCambioEnvio,
} from './tiendaCheckoutPasos'

const METODOS = [
  { value: 'SINPE_MOVIL', label: 'SINPE' },
  { value: 'EFECTIVO', label: 'Efectivo' },
  { value: 'TRANSFERENCIA', label: 'Transferencia' },
]

describe('tiendaCheckoutPasos', () => {
  it('oculta efectivo cuando hay envío a domicilio', () => {
    expect(metodosPagoVisibles(METODO_ENVIO_DOMICILIO, METODOS).map((m) => m.value)).toEqual([
      'SINPE_MOVIL',
      'TRANSFERENCIA',
    ])
    expect(metodosPagoVisibles(METODO_ENVIO_RETIRO, METODOS)).toHaveLength(3)
  })

  it('cambia efectivo a SINPE si el envío pasa a domicilio', () => {
    expect(pagoTrasCambioEnvio(METODO_ENVIO_DOMICILIO, 'EFECTIVO')).toBe('SINPE_MOVIL')
    expect(pagoTrasCambioEnvio(METODO_ENVIO_RETIRO, 'EFECTIVO')).toBe('EFECTIVO')
  })

  it('arma la dirección y valida los pasos', () => {
    expect(armarDireccionTienda('San José', 'Escazú', 'casa 12')).toBe('San José, Escazú, casa 12')
    expect(errorPasoDatosTienda('', 'a@b.com', '88888888')).toBe('Escribí tu nombre.')
    expect(errorPasoEntregaTienda(METODO_ENVIO_DOMICILIO, 'San José', '', 'casa')).toMatch(/dirección/)
    expect(errorPasoEntregaTienda(METODO_ENVIO_RETIRO, '', '', '')).toBeNull()
  })
})
