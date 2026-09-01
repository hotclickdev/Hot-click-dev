import { Navigate } from 'react-router-dom'

/**
 * Login emprendedor → login real de la app.
 */
export default function LoginPage() {
  return <Navigate to="/login" replace />
}
