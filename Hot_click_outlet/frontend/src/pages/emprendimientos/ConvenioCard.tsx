import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import SellerBadge from '@/components/ui/SellerBadge'
import { RUTA_CATALOGO_EMPRENDIMIENTOS } from '@/utils/emprendimientoRutas'

export type ConvenioPublico = {
  id?: number | string
  nombre?: string
  logoUrl?: string | null
  descripcion?: string | null
  urlWeb?: string | null
}

function LogoNegocio({ nombre, logoUrl }: { nombre?: string; logoUrl?: string | null }) {
  if (logoUrl) {
    return (
      <img
        src={logoUrl}
        alt={nombre}
        className="w-12 h-12 rounded-xl object-contain shrink-0"
        style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', padding: 4 }}
      />
    )
  }
  return (
    <div
      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 text-base font-extrabold"
      style={{ background: 'var(--hc-surface-3)', color: 'var(--hc-text)' }}
    >
      {(nombre ?? '?')[0].toUpperCase()}
    </div>
  )
}

/** Tarjeta de negocio en el directorio de emprendimientos, fiel al Figma (lista, no grilla). */
export default function ConvenioCard({ convenio, indice }: { convenio: ConvenioPublico; indice: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.35, delay: Math.min(indice * 0.04, 0.3) }}
      className="rounded-2xl p-4"
      style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', boxShadow: '0 2px 12px var(--hc-shadow)' }}
    >
      <div className="flex items-start gap-3">
        <LogoNegocio nombre={convenio.nombre} logoUrl={convenio.logoUrl} />
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-bold truncate" style={{ color: 'var(--hc-text)' }}>
            {convenio.nombre}
          </h3>
          <SellerBadge verificado className="mt-1" />
          {convenio.descripcion && (
            <p className="text-[13px] mt-1.5 leading-snug line-clamp-2" style={{ color: 'var(--hc-muted)' }}>
              {convenio.descripcion}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 mt-3.5 pt-3.5" style={{ borderTop: '1px solid var(--hc-border)' }}>
        <Link
          to={RUTA_CATALOGO_EMPRENDIMIENTOS}
          className="flex-1 inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold min-h-[40px]"
          style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
        >
          Ver productos en HotClick
        </Link>
        {convenio.urlWeb && (
          <a
            href={convenio.urlWeb}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${convenio.nombre}: sitio externo, se abre en otra pestaña`}
            className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold min-h-[40px]"
            style={{ background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)', textDecoration: 'none' }}
          >
            Sitio externo
          </a>
        )}
      </div>
    </motion.div>
  )
}
