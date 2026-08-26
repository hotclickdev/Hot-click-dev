import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import { blogService } from '@/services/blogService'
import TrustGlyph from '@/components/ui/TrustGlyph'
import TextoFlecha from '@/components/ui/TextoFlecha'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function CardArticulo({ e, i }) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.45, delay: i * 0.06 }}
      style={{
        background: 'var(--hc-surface)',
        border: '1px solid var(--hc-border)',
        borderRadius: 16,
        overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
        boxShadow: '0 2px 12px var(--hc-shadow)',
        transition: 'box-shadow 0.2s, transform 0.2s',
      }}
      onMouseEnter={el => { el.currentTarget.style.boxShadow = '0 8px 32px var(--hc-shadow)'; el.currentTarget.style.transform = 'translateY(-2px)' }}
      onMouseLeave={el => { el.currentTarget.style.boxShadow = '0 2px 12px var(--hc-shadow)'; el.currentTarget.style.transform = 'none' }}
    >
      {e.imagenUrl && (
        <div style={{ height: 180, overflow: 'hidden' }}>
          <img src={e.imagenUrl} alt={e.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
      )}
      <div style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column' }}>
        <p style={{ fontSize: 11, color: 'var(--hc-muted)', marginBottom: 8, margin: '0 0 8px' }}>
          {fmtDate(e.fechaPublicacion)}
        </p>
        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--hc-text)', margin: '0 0 10px', lineHeight: 1.35 }}>
          {e.titulo}
        </h2>
        {e.resumen && (
          <p style={{ fontSize: 13, color: 'var(--hc-muted)', lineHeight: 1.6, flex: 1, margin: '0 0 16px' }}>
            {e.resumen}
          </p>
        )}
        <Link to={`/blog/${e.slug || e.id}`} style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          fontSize: 13, fontWeight: 600, color: 'var(--hc-accent)',
          textDecoration: 'none',
        }}>
          <TextoFlecha>Leer más</TextoFlecha>
        </Link>
      </div>
    </motion.article>
  )
}

export default function BlogPage() {
  const [entradas, setEntradas] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    blogService.getPublicos()
      .then(r => setEntradas(r.data?.data ?? []))
      .catch((err) => { console.error('[BlogPage] entradas', err) })
      .finally(() => setLoading(false))
  }, [])

  const blogListJsonLd = entradas.length > 0 ? {
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: 'Blog HotClick',
    description: 'Artículos, tips y novedades sobre tecnología, emprendimiento y compras online en Costa Rica.',
    url: 'https://hotclick.lat/blog',
    publisher: { '@type': 'Organization', name: 'HotClick', url: 'https://hotclick.lat' },
    blogPost: entradas.map(e => ({
      '@type': 'BlogPosting',
      headline: e.titulo,
      url: `https://hotclick.lat/blog/${e.slug || e.id}`,
      datePublished: e.fechaPublicacion || e.fechaCreacion,
      image: e.imagenUrl || undefined,
      description: e.resumen || e.titulo,
    })),
  } : null

  return (
    <MainLayout>
      <Helmet>
        <title>Blog HotClick — Consejos de tecnología y emprendimiento en Costa Rica</title>
        <meta name="description" content="Artículos y tips sobre tecnología, compras online y emprendimiento costarricense. El blog oficial de HotClick Marketplace." />
        <link rel="canonical" href="https://hotclick.lat/blog" />
        <link rel="alternate" hrefLang="es-CR" href="https://hotclick.lat/blog" />
        <link rel="alternate" hrefLang="es"    href="https://hotclick.lat/blog" />
        <link rel="alternate" hrefLang="x-default" href="https://hotclick.lat/" />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Blog HotClick — Consejos para compradores y emprendedores en Costa Rica" />
        <meta property="og:description" content="Artículos de tecnología, moda, emprendimiento y novedades de HotClick. Todo lo que necesitás para comprar y vender mejor en Costa Rica." />
        <meta property="og:url" content="https://hotclick.lat/blog" />
        <meta property="og:image" content="https://hotclick.lat/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Blog HotClick" />
        <meta name="twitter:description" content="Tips de tecnología, emprendimiento y compras online en Costa Rica." />
        {blogListJsonLd && (
          <script type="application/ld+json">{JSON.stringify(blogListJsonLd)}</script>
        )}
      </Helmet>
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
              Blog HotClick
            </span>
            <h1 style={{ fontSize: 36, fontWeight: 900, color: 'var(--hc-text)', margin: '0 0 12px' }}>
              Noticias y consejos
            </h1>
            <p style={{ fontSize: 16, color: 'var(--hc-muted)', maxWidth: 480, margin: '0 auto' }}>
              Tips de tecnología, novedades de HotClick y más.
            </p>
          </motion.div>
        </div>

        {/* Contenido */}
        <div className="max-w-7xl mx-auto px-5 sm:px-8" style={{ paddingTop: 48, paddingBottom: 64 }}>
          {loading && (
            <div style={{ textAlign: 'center', padding: 80, color: 'var(--hc-muted)' }}>
              <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--hc-border)', borderTopColor: 'var(--hc-accent)', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
              Cargando artículos...
            </div>
          )}
          {!loading && entradas.length === 0 && (
            <div style={{ textAlign: 'center', padding: 80 }}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16, color: 'var(--hc-muted)', opacity: 0.4 }}>
                <TrustGlyph tipo="lista" className="w-12 h-12" />
              </div>
              <p style={{ fontSize: 18, fontWeight: 700, color: 'var(--hc-text)', margin: 0 }}>Próximamente</p>
              <p style={{ fontSize: 14, color: 'var(--hc-muted)', marginTop: 8 }}>Estamos preparando contenido para vos.</p>
            </div>
          )}
          {!loading && entradas.length > 0 && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: 24,
            }}>
              {entradas.map((e, i) => <CardArticulo key={e.id} e={e} i={i} />)}
            </div>
          )}
        </div>
      </div>
    </MainLayout>
  )
}
