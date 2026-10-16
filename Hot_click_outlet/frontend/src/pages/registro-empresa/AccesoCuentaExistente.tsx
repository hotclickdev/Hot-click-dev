import { Link } from 'react-router-dom'

/** Texto exacto que el backend devuelve cuando el correo ya tiene cuenta (RegistroDuplicadoException). */
export const MENSAJE_CORREO_REGISTRADO = 'Ese correo ya está registrado.'

export function muestraAccesoCuentaExistente(error: string | null | undefined): boolean {
  return !!error && error.includes(MENSAJE_CORREO_REGISTRADO)
}

/** Único enlace permitido bajo «Ese correo ya está registrado.»: recuperar la cuenta (el código va a ese correo). */
export default function AccesoCuentaExistente({ error }: { error: string | null | undefined }) {
  if (!muestraAccesoCuentaExistente(error)) return null
  return (
    <p className="text-sm" style={{ marginTop: 4 }}>
      <Link to="/recuperar-contrasena" style={{ color: 'var(--hc-primary)', fontWeight: 600 }}>Recuperar cuenta</Link>
    </p>
  )
}
