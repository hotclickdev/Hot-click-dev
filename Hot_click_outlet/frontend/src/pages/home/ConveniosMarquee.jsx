import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { convenioService } from '@/services/convenioService'

// ─── Marquee de emprendimientos con convenio ──────────────────────────────────
export default function ConveniosMarquee() {
  const [items, setItems] = useState([])

  useEffect(() => {
    convenioService.getPublicos()
      .then(r => setItems(r.data?.data ?? []))
      .catch(() => { /* marquee decorativo */ })
  }, [])

  if (items.length === 0) return null

  const repeated = [...items, ...items, ...items]

  return (
    <section style={{ padding: '20px 0', overflow: 'hidden', borderTop: '1px solid var(--hc-border)', borderBottom: '1px solid var(--hc-border)', background: 'var(--hc-surface)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, paddingLeft: 24 }}>
        <span style={{ width: 4, height: 16, borderRadius: 2, background: 'var(--hc-accent)', display: 'inline-block' }} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--hc-muted)' }}>
          Emprendimientos con convenio
        </span>
      </div>
      <div style={{ display: 'flex', gap: 0, width: '100%', overflow: 'hidden' }}>
        <motion.div
          animate={{ x: ['0%', '-33.33%'] }}
          transition={{ duration: items.length * 4, repeat: Infinity, ease: 'linear' }}
          style={{ display: 'flex', gap: 32, paddingLeft: 24, whiteSpace: 'nowrap', flexShrink: 0 }}
        >
          {repeated.map((c, i) => (
            <div key={`${c.id}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
              {c.logoUrl && (
                <img src={c.logoUrl} alt={c.nombre} style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 4 }} />
              )}
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--hc-text-2)' }}>{c.nombre}</span>
              <span style={{ fontSize: 10, color: 'var(--hc-border-strong)', marginLeft: 8 }}>✦</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
