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

function InicialMarca({ nombre }: { nombre?: string }) {
  return (
    <div
      style={{
        width: 72, height: 72, borderRadius: 12, background: 'var(--hc-surface-3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 800, color: 'var(--hc-text)',
      }}
    >
      {(nombre ?? '?')[0].toUpperCase()}
    </div>
  )
}

/** Tarjeta de convenio: productos en HotClick primero; sitio externo si existe. */
export default function ConvenioCard({ convenio, indice }: { convenio: ConvenioPublico; indice: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: indice * 0.05 }}
      style={{
        background: 'var(--hc-surface)',
        border: '1px solid var(--hc-border)',
        borderRadius: 16, padding: 24,
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        textAlign: 'center', gap: 14,
        boxShadow: '0 2px 12px var(--hc-shadow)',
      }}
    >
      {convenio.logoUrl
        ? (
          <img
            src={convenio.logoUrl}
            alt={convenio.nombre}
            style={{
              width: 72, height: 72, objectFit: 'contain', borderRadius: 12,
              background: 'var(--hc-surface-2)', padding: 8, border: '1px solid var(--hc-border)',
            }}
          />
        )
        : <InicialMarca nombre={convenio.nombre} />}
      <div>
        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--hc-text)', margin: '0 0 6px' }}>
          {convenio.nombre}
        </h3>
        <SellerBadge verificado className="mb-1.5 justify-center" />
        {convenio.descripcion && (
          <p style={{ fontSize: 13, color: 'var(--hc-muted)', lineHeight: 1.55, margin: 0 }}>
            {convenio.descripcion}
          </p>
        )}
      </div>
      <Link
        to={RUTA_CATALOGO_EMPRENDIMIENTOS}
        className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold min-h-[44px]"
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
          className="inline-flex items-center justify-center px-4 py-2 rounded-lg text-xs font-semibold min-h-[44px]"
          style={{
            background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)',
            color: 'var(--hc-muted)', textDecoration: 'none',
          }}
        >
          Sitio externo
        </a>
      )}
    </motion.div>
  )
}
