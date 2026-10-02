import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { estiloMarcaTienda } from './tiendaTheme'

/** Slug sin tienda pública: no existe o no está publicada. Mismo mensaje: el API responde 404 en ambos. */
export default function TiendaNoDisponible() {
  const { t } = useTranslation()
  return (
    <div className="hc-tenant-theme flex flex-col min-h-screen" style={estiloMarcaTienda(null)}>
      <header className="sticky top-0 z-40 shadow-sm" style={{ backgroundColor: 'var(--t-secondary)' }}>
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <span className="text-white font-bold text-lg">HotClick</span>
          <Link to="/" className="text-[11px] text-white/80 hover:text-white underline-offset-2 hover:underline">
            Marketplace
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="text-center max-w-md">
          <h1 className="text-xl font-bold text-[var(--t-text)]">{t('tienda.noDisponibleTitulo')}</h1>
          <p className="text-sm mt-2 text-[var(--t-muted)] leading-relaxed">
            {t('tienda.noDisponibleTexto')}
          </p>
          <Link
            to="/productos"
            className="inline-flex items-center justify-center mt-6 px-5 min-h-11 rounded-lg text-white text-sm font-semibold"
            style={{ backgroundColor: 'var(--t-primary)' }}
          >
            {t('tienda.verProductosHotclick')}
          </Link>
        </div>
      </main>
    </div>
  )
}
