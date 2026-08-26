import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'

const SALIDAS = [
  {
    to: '/productos',
    labelKey: 'notFound.comprar',
    hintKey: 'notFound.comprarHint',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    ),
  },
  {
    to: '/registro-empresa',
    labelKey: 'notFound.vender',
    hintKey: 'notFound.venderHint',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
    ),
  },
  {
    to: '/emprende',
    labelKey: 'notFound.emprender',
    hintKey: 'notFound.emprenderHint',
    icon: (
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    ),
  },
]

/** Página 404 con salidas Comprar / Vender / Emprender. */
export default function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <MainLayout>
      <div className="max-w-3xl mx-auto px-4 py-16 sm:py-24 text-center">
        <p className="text-sm font-semibold tracking-widest uppercase mb-3" style={{ color: 'var(--hc-muted)' }}>
          404
        </p>
        <h1 className="text-3xl sm:text-4xl font-bold mb-3" style={{ color: 'var(--hc-text)' }}>
          {t('notFound.title')}
        </h1>
        <p className="text-base mb-10 max-w-lg mx-auto" style={{ color: 'var(--hc-muted)' }}>
          {t('notFound.subtitle')}
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SALIDAS.map((salida) => (
            <Link
              key={salida.to}
              to={salida.to}
              className="flex flex-col items-center gap-2 rounded-2xl border px-4 py-5 min-h-[44px] transition-colors"
              style={{ borderColor: 'var(--hc-border)', backgroundColor: 'var(--hc-surface)' }}
            >
              <span
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: 'color-mix(in srgb, var(--hc-primary) 12%, transparent)', color: 'var(--hc-primary)' }}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                  {salida.icon}
                </svg>
              </span>
              <span className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
                {t(salida.labelKey)}
              </span>
              <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>{t(salida.hintKey)}</span>
            </Link>
          ))}
        </div>
      </div>
    </MainLayout>
  )
}
