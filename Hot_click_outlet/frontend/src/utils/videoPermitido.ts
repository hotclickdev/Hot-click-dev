/** ESC-4: mismo criterio que VideoUrlPermitida en el backend (https y solo YouTube, Instagram o TikTok). */
const HOSTS = new Set([
  'youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtube-nocookie.com',
  'instagram.com', 'www.instagram.com',
  'tiktok.com', 'www.tiktok.com', 'm.tiktok.com', 'vm.tiktok.com', 'vt.tiktok.com',
])

export const MENSAJE_VIDEO_NO_PERMITIDO = 'El video tiene que ser un enlace de YouTube, Instagram o TikTok'

export function esVideoPermitido(url: string | null | undefined): boolean {
  if (!url || !url.trim()) return true
  try {
    const u = new URL(url.trim())
    return u.protocol === 'https:' && !u.username && !u.port && HOSTS.has(u.hostname.toLowerCase())
  } catch {
    return false
  }
}
