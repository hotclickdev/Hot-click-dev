/**
 * True si el JWT existe y `exp` todavía no pasó.
 * Solo lectura de claims; la autorización real es del backend.
 * @param {string | null | undefined} token
 */
export function isTokenAlive(token) {
  if (!token) return false
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    return payload.exp * 1000 > Date.now()
  } catch {
    return false
  }
}
