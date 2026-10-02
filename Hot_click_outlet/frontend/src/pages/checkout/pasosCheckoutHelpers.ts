import { useNavigate } from 'react-router-dom'
import { PREFIJO_CR, digitosTelefonoCR, formatTelefonoCR } from '@/utils/telefono'

/** Dígitos locales de un teléfono guardado como `+506XXXXXXXX`. */
export function digitosTelefono(valor: string): string {
  return digitosTelefonoCR(valor)
}

/** `8888-1234` para mostrar (formato único, `utils/telefono`); el valor guardado conserva el prefijo del país. */
export function formatoTelefonoCampo(valor: string): string {
  return formatTelefonoCR(digitosTelefonoCR(valor))
}

export function telefonoDesdeCampo(texto: string): string {
  const d = digitosTelefono(texto)
  return d ? `${PREFIJO_CR}${d}` : ''
}

/** Atrás del checkout móvil: paso anterior o, desde el primero, el carrito. */
export function useVolver(rutaCarrito: string, paso: number, irAPaso: (paso: number) => void) {
  const navigate = useNavigate()
  return () => {
    if (paso > 1) irAPaso(paso - 1)
    else navigate(rutaCarrito)
  }
}
