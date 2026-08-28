import { useState } from 'react'
import type { CatalogMarca } from './catalogoTipos'

// ── Logo de marca con fallback a iniciales ────────────────────────────────────
export default function CatalogBrandLogo({ marca, size = 56 }: { marca: CatalogMarca; size?: number }) {
  const [imgError, setImgError] = useState(false)
  const initials = (marca.nombreMarca ?? '')
    .split(' ').slice(0, 2).map(w => w[0] ?? '').join('').toUpperCase()
  return (
    <div
      className="rounded-xl flex items-center justify-center overflow-hidden shrink-0"
      style={{ width: size, height: size, background: 'var(--hc-bg)', border: '1px solid var(--hc-border)' }}
    >
      {marca.logoUrl && !imgError ? (
        <img
          src={marca.logoUrl}
          alt={marca.nombreMarca}
          className="object-contain"
          style={{ width: size - 8, height: size - 8 }}
          onError={() => setImgError(true)}
        />
      ) : (
        <span className="font-black text-lg leading-none" style={{ color: 'var(--hc-accent)' }}>
          {initials || '?'}
        </span>
      )}
    </div>
  )
}
