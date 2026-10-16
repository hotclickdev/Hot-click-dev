import { Link } from 'react-router-dom'

/** Texto que el backend agrega a todo rechazo de alta (exista o no la cuenta). */
export const MARCA_CUENTA_EXISTENTE = '¿Ya tenés cuenta?'

export function muestraAccesoCuentaExistente(error: string | null | undefined): boolean {
  return !!error && error.includes(MARCA_CUENTA_EXISTENTE)
}

/** Enlaces a iniciar sesión y recuperar la contraseña debajo del error genérico del alta. */
export default function AccesoCuentaExistente({ error }: { error: string | null | undefined }) {
  if (!muestraAccesoCuentaExistente(error)) return null
  return (
    <p className="text-sm" style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 4 }}>
      <Link to="/login" style={{ color: 'var(--hc-primary)', fontWeight: 600 }}>Iniciar sesión</Link>
      <Link to="/recuperar-contrasena" style={{ color: 'var(--hc-primary)', fontWeight: 600 }}>Recuperar mi contraseña</Link>
    </p>
  )
}
