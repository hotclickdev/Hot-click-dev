import type { NombreIconoSrv } from './iconosServicios'
import type { VistaServicios } from './serviciosHelpers'

export type Opcion = {
  vista: Exclude<VistaServicios, 'inicio'>
  icono: NombreIconoSrv
  fondo: string
  /** Claves i18n (`serviciosPage.inicio.*`). */
  titulo: string
  detalle: string
}

/** Las cuatro opciones de Figma `28:1429`: fondo de ícono azul, verde, ámbar y rojo claro. */
export const OPCIONES: Opcion[] = [
  { vista: 'busqueda', icono: 'inicioBuscar', fondo: 'bg-hc-blue-50', titulo: 'serviciosPage.inicio.busquedaTitulo', detalle: 'serviciosPage.inicio.busquedaDetalle' },
  { vista: 'garantia', icono: 'inicioEscudo', fondo: 'bg-hc-success-bg', titulo: 'serviciosPage.inicio.garantiaTitulo', detalle: 'serviciosPage.inicio.garantiaDetalle' },
  { vista: 'inventario', icono: 'inicioCaja', fondo: 'bg-hc-warning-bg', titulo: 'serviciosPage.inicio.inventarioTitulo', detalle: 'serviciosPage.inicio.inventarioDetalle' },
  { vista: 'testimonio', icono: 'inicioEstrella', fondo: 'bg-hc-red-50', titulo: 'serviciosPage.inicio.testimonioTitulo', detalle: 'serviciosPage.inicio.testimonioDetalle' },
]

