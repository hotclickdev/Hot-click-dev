export function isValidEmail(email) {
  const trimmed = email.trim()
  const atIdx = trimmed.indexOf('@')
  if (atIdx <= 0) return false
  const domain = trimmed.slice(atIdx + 1)
  return domain.includes('.') && !domain.startsWith('.') && !domain.endsWith('.')
}
