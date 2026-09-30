import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import MainLayout from '@/layouts/MainLayout'

type PaginaInformativaProps = {
  titulo: string
  subtitulo?: string
  /** Ruta de "volver" arriba del título (ej. /ayuda). Se omite si no aplica. */
  volverA?: { to: string; texto: string }
  children: ReactNode
}

/**
 * Plantilla reusable para páginas informativas del comprador (ayuda, servicios,
 * garantía): header + contenido + footer de `MainLayout`, con los mismos
 * tokens claros (`hc-n-*`, `font-display`) que ya usan `ProfilePage`,
 * `NotFoundPage` y los estados vacíos de esta rama. Pensada para envolver
 * contenido simple (texto, tarjetas, `ListaAccesos`) sin reinventar layout.
 */
export default function PaginaInformativa({ titulo, subtitulo, volverA, children }: PaginaInformativaProps) {
  return (
    <MainLayout>
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        {volverA && (
          <Link to={volverA.to} className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-hc-n-500 hover:text-hc-n-900">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
              strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m15 18-6-6 6-6" />
            </svg>
            {volverA.texto}
          </Link>
        )}
        <h1 className="font-display text-[24px] font-bold text-hc-n-900 [text-wrap:balance]">{titulo}</h1>
        {subtitulo && <p className="mt-1.5 text-[15px] leading-6 text-hc-n-600">{subtitulo}</p>}
        <div className="mt-8 space-y-8">{children}</div>
      </div>
    </MainLayout>
  )
}
