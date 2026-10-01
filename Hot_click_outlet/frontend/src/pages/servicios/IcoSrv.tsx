import { ICONOS_SRV, type NombreIconoSrv } from './iconosServicios'

/** Ícono del Figma a su tamaño de origen. Decorativo: el texto contiguo ya nombra la acción. */
export function IcoSrv({ nombre, size, className = '' }: { nombre: NombreIconoSrv; size: number; className?: string }) {
  return <img src={ICONOS_SRV[nombre]} alt="" width={size} height={size} className={`shrink-0 ${className}`} aria-hidden="true" />
}
