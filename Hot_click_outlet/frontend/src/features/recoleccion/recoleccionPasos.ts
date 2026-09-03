import { MSG_SOLO_GAM, zonaPermitida } from './zonaLogistica'
import type { RecoleccionCreatePayload } from './recoleccionTipos'
import type { PasoFormulario } from '@/prototipo/compartido/formularioPorPasosHelpers'

export const PASOS_RECOLECCION: readonly PasoFormulario[] = [
  { id: 'zona', titulo: 'Zona de servicio' },
  { id: 'pickup', titulo: 'Dónde pasamos a buscar' },
  { id: 'entrega', titulo: 'Entrega a tu cliente' },
  { id: 'notas', titulo: 'Notas', opcional: true },
]

export function validarPasoRecoleccion(paso: number, form: RecoleccionCreatePayload): string | null {
  const id = PASOS_RECOLECCION[paso]?.id
  if (id === 'zona' && !zonaPermitida(form.zona)) return MSG_SOLO_GAM
  if (id === 'pickup') {
    if (!form.direccionRecoleccion.trim() || !form.contactoRecoleccion.trim() || !form.telefonoRecoleccion.trim()) {
      return 'Completá dirección, contacto y teléfono de recolección.'
    }
  }
  if (id === 'entrega') {
    if (!form.direccionEntrega.trim() || !form.contactoEntrega.trim() || !form.telefonoEntrega.trim()) {
      return 'Completá dirección, nombre y teléfono del cliente.'
    }
  }
  return null
}
