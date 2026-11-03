import { useSyncExternalStore } from 'react'

/**
 * M4: el comprador marca «Quiero factura electrónica» en el pago y el pedido viaja con
 * `facturaElectronica: true`. En régimen simplificado el backend suma el IVA (13 %) al cobro;
 * sin la marca es tiquete y se cobra el precio tal cual.
 */
let facturaElectronica = false
const oyentes = new Set<() => void>()

export function leerFacturaElectronica(): boolean {
  return facturaElectronica
}

export function cambiarFacturaElectronica(valor: boolean): void {
  if (facturaElectronica === valor) return
  facturaElectronica = valor
  oyentes.forEach((o) => o())
}

function suscribir(oyente: () => void) {
  oyentes.add(oyente)
  return () => { oyentes.delete(oyente) }
}

export function useFacturaElectronica(): [boolean, (valor: boolean) => void] {
  const valor = useSyncExternalStore(suscribir, leerFacturaElectronica, leerFacturaElectronica)
  return [valor, cambiarFacturaElectronica]
}

/** Campo que viaja al backend (checkout y POS): solo se manda cuando se pidió factura. */
export function campoFactura(valor: boolean): { facturaElectronica?: true } {
  return valor ? { facturaElectronica: true } : {}
}
