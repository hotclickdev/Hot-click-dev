import { useEffect, useState } from 'react'
import api from '@/services/api'

const GOOGLE_FONTS_SAFE = new Set(['Inter', 'Poppins', 'Roboto', 'Nunito', 'Montserrat', 'Raleway', 'Lato', 'Open Sans'])

let cached = null

/**
 * Fetches public branding for the tenant (by slug or default) and applies
 * CSS custom properties to :root so the entire app picks up tenant colors.
 * Returns the branding object so components can read individual values.
 */
export function useBranding(slug) {
  const [branding, setBranding] = useState(cached)

  useEffect(() => {
    if (cached) { applyBranding(cached); return }
    const url = slug ? `/public/branding?slug=${encodeURIComponent(slug)}` : '/public/branding'
    api.get(url).then(({ data }) => {
      cached = data
      setBranding(data)
      applyBranding(data)
    }).catch(() => {})
  }, [slug])

  return branding
}

export function applyBranding(b) {
  if (!b) return
  const root = document.documentElement

  if (b.colorPrimario)   root.style.setProperty('--hc-brand-primary',   b.colorPrimario)
  if (b.colorSecundario) root.style.setProperty('--hc-brand-secondary',  b.colorSecundario)
  if (b.colorAcento)     root.style.setProperty('--hc-accent',           b.colorAcento)
  if (b.colorPrimario)   root.style.setProperty('--hc-accent-store',     b.colorPrimario)

  // Font family — only allow safe list to prevent CSS injection
  const font = GOOGLE_FONTS_SAFE.has(b.fontFamilia) ? b.fontFamilia : 'Inter'
  loadGoogleFont(font)
  root.style.setProperty('--hc-font', `'${font}', system-ui, sans-serif`)

  // Favicon
  if (b.faviconUrl) {
    let link = document.querySelector("link[rel~='icon']")
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link) }
    link.href = b.faviconUrl
  }
}

function loadGoogleFont(family) {
  const id = `gf-${family.replace(/\s+/g, '-').toLowerCase()}`
  if (document.getElementById(id)) return
  const link = document.createElement('link')
  link.id   = id
  link.rel  = 'stylesheet'
  link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;500;600;700&display=swap`
  document.head.appendChild(link)
}

/** Call this to bust the cache (e.g. after saving branding in admin). */
export function invalidateBrandingCache() { cached = null }
