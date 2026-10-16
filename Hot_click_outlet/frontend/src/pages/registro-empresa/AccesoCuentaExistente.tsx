import { Link } from 'react-router-dom'
import { muestraAccesoCuentaExistente } from './accesoCuentaExistente'

/** Único enlace permitido bajo «Ese correo ya está registrado.»: recuperar la cuenta (el código va a ese correo). */
export default function AccesoCuentaExistente({ error }: { error: string | null | undefined }) {
  if (!muestraAccesoCuentaExistente(error)) return null
  return (
    <p className="text-sm" style={{ marginTop: 4 }}>
      <Link to="/recuperar-contrasena" style={{ color: 'var(--hc-primary)', fontWeight: 600 }}>Recuperar cuenta</Link>
    </p>
  )
}
