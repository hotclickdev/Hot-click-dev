import { isValidEmail } from '@/utils/validators'
import type { PasoFormulario } from '@/prototipo/compartido/formularioPorPasosHelpers'
import {
  ROLES_ASIGNABLES,
  type FormularioEquipo,
} from '@/pages/admin/equipo/equipoHelpers'

export const PASOS_INVITAR_EQUIPO: readonly PasoFormulario[] = [
  { id: 'persona', titulo: '¿Cómo se llama?' },
  { id: 'contacto', titulo: 'Datos de contacto' },
  { id: 'rol', titulo: '¿Qué puede hacer?' },
  { id: 'confirmar', titulo: 'Confirmá la invitación' },
]

export function validarPasoInvitarEquipo(paso: number, form: FormularioEquipo): string | null {
  const id = PASOS_INVITAR_EQUIPO[paso]?.id
  if (id === 'persona' && !form.nombre.trim()) return 'Ingresá el nombre.'
  if (id === 'contacto') {
    if (!isValidEmail(form.correo)) return 'Correo inválido.'
    if (form.password.length < 6) return 'La contraseña temporal debe tener al menos 6 caracteres.'
  }
  if (id === 'rol' && !ROLES_ASIGNABLES.includes(form.rolEnEmpresa)) return 'Elegí un rol.'
  return null
}
