import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import MainLayout from '@/layouts/MainLayout'
import api from '@/services/api'

export default function EmprendimientosPage() {
  const [lista, setLista] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/convenios/publicos')
      .then(r => setLista(r.data?.data ?? []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <MainLayout>
      <div style={{ minHeight: '60vh', background: 'var(--hc-bg)' }}>
        {/* Hero */}
        <div style={{
          background: 'linear-gradient(135deg, var(--hc-surface) 0%, var(--hc-surface-2) 100%)',
          borderBottom: '1px solid var(--hc-border)',
          padding: '56px 24px 48px',
          textAlign: 'center',
        }}>
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <span style={{
              display: 'inline-block', padding: '4px 14px', borderRadius: 100,
              background: 'var(--hc-surface-3)', border: '1px solid var(--hc-border)',
              fontSize: 12, fontWeight: 700, color: 'var(--hc-accent)',
              letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 16,
            }}>
              Convenios HOTCLICK
            </span>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: 'var(--hc-text)', margin: '0 0 12px' }}>
              Emprendimientos aliados
            </h1>
            <p style={{ fontSize: 16, color: 'var(--hc-muted)', maxWidth: 520, margin: '0 auto' }}>
              Conocé los negocios con los que tenemos convenio. Aquí piensas con la mente arriba.
            </p>
          </motion.div>
        </div>

        {/* Grid */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8" style={{ paddingTop: 48, paddingBottom: 64 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 80, color: 'var(--hc-muted)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--hc-border)', borderTopColor: 'var(--hc-accent)', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              Cargando...
            </div>
          ) : lista.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <p style={{ fontSize: 48, margin: '0 0 16px' }}>🤝</p>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--hc-text)', margin: 0 }}>Próximamente</p>
              <p style={{ fontSize: 14, color: 'var(--hc-muted)', marginTop: 8 }}>
                Estamos cerrando convenios con emprendimientos de Costa Rica.
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: 20,
            }}>
              {lista.map((c, i) => (
                <motion.div
                  key={c.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: i * 0.05 }}
                  style={{
                    background: 'var(--hc-surface)',
                    border: '1px solid var(--hc-border)',
                    borderRadius: 16, padding: 24,
                    display: 'flex', flexDirection: 'column', alignItems: 'center',
                    textAlign: 'center', gap: 14,
                    boxShadow: '0 2px 12px var(--hc-shadow)',
                    transition: 'box-shadow 0.2s, transform 0.2s',
                  }}
                  onMouseEnter={el => { el.currentTarget.style.boxShadow = '0 8px 32px var(--hc-shadow)'; el.currentTarget.style.transform = 'translateY(-3px)' }}
                  onMouseLeave={el => { el.currentTarget.style.boxShadow = '0 2px 12px var(--hc-shadow)'; el.currentTarget.style.transform = 'none' }}
                >
                  {c.logoUrl ? (
                    <img src={c.logoUrl} alt={c.nombre}
                      style={{ width: 72, height: 72, objectFit: 'contain', borderRadius: 12, background: 'var(--hc-surface-2)', padding: 8, border: '1px solid var(--hc-border)' }}
                    />
                  ) : (
                    <div style={{ width: 72, height: 72, borderRadius: 12, background: 'var(--hc-surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>
                      🤝
                    </div>
                  )}
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--hc-text)', margin: '0 0 6px' }}>{c.nombre}</h3>
                    {c.descripcion && (
                      <p style={{ fontSize: 13, color: 'var(--hc-muted)', lineHeight: 1.55, margin: 0 }}>
                        {c.descripcion}
                      </p>
                    )}
                  </div>
                  {c.urlWeb && (
                    <a href={c.urlWeb} target="_blank" rel="noopener noreferrer" style={{
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      padding: '7px 16px', borderRadius: 8,
                      background: 'var(--hc-surface-2)', border: '1px solid var(--hc-border)',
                      fontSize: 12, fontWeight: 600, color: 'var(--hc-accent)',
                      textDecoration: 'none', transition: 'background 0.15s',
                    }}>
                      Visitar sitio →
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
