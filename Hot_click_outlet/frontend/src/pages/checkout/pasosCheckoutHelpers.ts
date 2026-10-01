import { useNavigate } from 'react-router-dom'

const PREFIJO_CR = '+506'
const DIGITOS_TELEFONO = 8

/** Dígitos locales de un teléfono guardado como `+506XXXXXXXX`. */
export function digitosTelefono(valor: string): string {
  return valor.replace(/^\+506/, '').replace(/\D/g, '').slice(0, DIGITOS_TELEFONO)
}

/** `8888 1234` para mostrar; el valor guardado conserva el prefijo del país. */
export function formatoTelefonoCampo(valor: string): string {
  const d = digitosTelefono(valor)
  return d.length > 4 ? `${d.slice(0, 4)} ${d.slice(4)}` : d
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
