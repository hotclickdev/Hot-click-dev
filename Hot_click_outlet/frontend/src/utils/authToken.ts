/**
 * True si el JWT existe y `exp` todavía no pasó.
 * Solo lectura de claims; la autorización real es del backend.
 */
export function isTokenAlive(token: string | null | undefined): boolean {
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as { exp?: number }
    return (payload.exp ?? 0) * 1000 > Date.now()
  } catch {
    return false
  }
}
