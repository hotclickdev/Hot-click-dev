/** La subida responde `{ data: url }` o la url directa. */
export function urlSubida(data: unknown): string {
  if (typeof data === 'string') return data
  if (!data || typeof data !== 'object' || !('data' in data)) return ''
  const url = (data as { data?: unknown }).data
  return typeof url === 'string' ? url : ''
}
