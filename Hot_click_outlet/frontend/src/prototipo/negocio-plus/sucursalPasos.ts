import type { PasoFormulario } from '@/prototipo/compartido/formularioPorPasosHelpers'

export const PASOS_SUCURSAL: readonly PasoFormulario[] = [
  { id: 'nombre', titulo: 'Nombre de la sucursal' },
  { id: 'ubicacion', titulo: 'Ubicación' },
  { id: 'confirmar', titulo: 'Confirmar sucursal' },
]

export type DatosPasoSucursal = {
  nombre: string
  ubicacion: string
}

export function validarPasoSucursal(paso: number, datos: DatosPasoSucursal): string | null {
  const id = PASOS_SUCURSAL[paso]?.id
  if (id === 'nombre' && !datos.nombre.trim()) return 'Escribí el nombre de la sucursal'
  if (id === 'ubicacion' && !datos.ubicacion.trim()) return 'Escribí la ubicación o dirección'
  return null
}
