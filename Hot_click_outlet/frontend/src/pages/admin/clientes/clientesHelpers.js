const MS_30_DIAS = 30 * 86_400_000

/** @param {object} cliente */
export function esInactivo30d(cliente) {
  const fecha = cliente.fechaUltimoAcceso ?? cliente.ultimaCompra
  if (!fecha) return cliente.segmento === 'INACTIVO'
  return Date.now() - new Date(fecha).getTime() > MS_30_DIAS
}
