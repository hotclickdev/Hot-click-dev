import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import api from '@/services/api'

const SITE_URL = 'https://hotclick.lat'

function fmtDate(d) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'long', year: 'numeric' })
}

function buildBlogPostingJsonLd(post) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.titulo,
    description: post.resumen || post.titulo,
    image: post.imagenUrl || `${SITE_URL}/og-image.png`,
    url: `${SITE_URL}/blog/${post.slug || post.id}`,
    datePublished: post.fechaPublicacion || post.fechaCreacion,
    dateModified: post.fechaPublicacion || post.fechaCreacion,
    author: {
      '@type': 'Organization',
      name: 'HotClick',
      url: SITE_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: 'HotClick',
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/favicon.svg`,
      },
    },
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `${SITE_URL}/blog/${post.slug || post.id}`,
    },
    inLanguage: 'es-CR',
    isPartOf: {
      '@type': 'Blog',
      name: 'Blog HotClick',
      url: `${SITE_URL}/blog`,
    },
  }
}

export default function BlogPostPage() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setNotFound(false)
    api.get(`/blog/publico/${slug}`)
      .then(r => setPost(r.data?.data ?? null))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--hc-bg)' }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', border: '3px solid var(--hc-border)', borderTopColor: 'var(--hc-accent)', animation: 'spin 0.8s linear infinite' }} />
        </div>
      </MainLayout>
    )
  }

  if (notFound || !post) {
    return (
      <MainLayout>
        <Helmet>
          <title>Artículo no encontrado | Blog HotClick</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="min-h-screen flex flex-col items-center justify-center gap-4" style={{ background: 'var(--hc-bg)' }}>
          <p style={{ fontSize: 64 }}>📄</p>
          <h1 style={{ color: 'var(--hc-text)', fontSize: 24, fontWeight: 700 }}>Artículo no encontrado</h1>
          <Link to="/blog" style={{ color: 'var(--hc-accent)', fontWeight: 600 }}>← Volver al blog</Link>
        </div>
      </MainLayout>
    )
  }

  const seoTitle = `${post.titulo} | Blog HotClick`
  const seoDesc = post.resumen || post.titulo
  const seoImage = post.imagenUrl || `${SITE_URL}/og-image.png`
  const canonicalUrl = `${SITE_URL}/blog/${post.slug || post.id}`

  return (
    <MainLayout>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hreflang="es-CR" href={canonicalUrl} />
        <link rel="alternate" hreflang="es"    href={canonicalUrl} />
        <link rel="alternate" hreflang="x-default" href={`${SITE_URL}/`} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={seoTitle} />
        <meta property="og:description" content={seoDesc} />
        <meta property="og:url" content={canonicalUrl} />
        <meta property="og:image" content={seoImage} />
        <meta property="og:image:alt" content={post.titulo} />
        <meta property="og:locale" content="es_CR" />
        <meta property="og:site_name" content="HotClick" />
        {post.fechaPublicacion && <meta property="article:published_time" content={new Date(post.fechaPublicacion).toISOString()} />}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:site" content="@hotclickcr" />
        <meta name="twitter:title" content={seoTitle} />
        <meta name="twitter:description" content={seoDesc} />
        <meta name="twitter:image" content={seoImage} />
        <script type="application/ld+json">
          {JSON.stringify(buildBlogPostingJsonLd(post))}
        </script>
      </Helmet>

      <article style={{ minHeight: '70vh', background: 'var(--hc-bg)' }}>
        {/* Hero imagen */}
        {post.imagenUrl && (
          <div style={{ width: '100%', maxHeight: 440, overflow: 'hidden' }}>
            <img
              src={post.imagenUrl}
              alt={post.titulo}
              style={{ width: '100%', height: 440, objectFit: 'cover' }}
              fetchPriority="high"
              loading="eager"
            />
          </div>
        )}

        <div className="max-w-3xl mx-auto px-5 sm:px-8" style={{ paddingTop: 40, paddingBottom: 80 }}>
          {/* Breadcrumb */}
          <nav aria-label="Ruta de navegación">
            <ol className="flex items-center gap-2 text-sm mb-6 list-none p-0 m-0" style={{ color: 'var(--hc-muted)' }}>
              <li><a href="/" onClick={e => { e.preventDefault(); navigate('/') }} className="hover:underline" style={{ color: 'var(--hc-muted)' }}>HotClick</a></li>
              <li><span aria-hidden="true">/</span></li>
              <li><a href="/blog" onClick={e => { e.preventDefault(); navigate('/blog') }} className="hover:underline" style={{ color: 'var(--hc-muted)' }}>Blog</a></li>
              <li><span aria-hidden="true">/</span></li>
              <li aria-current="page" className="truncate max-w-xs" style={{ color: 'var(--hc-text)' }}>{post.titulo}</li>
            </ol>
          </nav>

          {/* Cabecera */}
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
            <p style={{ fontSize: 12, color: 'var(--hc-accent)', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12 }}>
              Blog HotClick
            </p>
            <h1 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 900, color: 'var(--hc-text)', lineHeight: 1.2, margin: '0 0 16px' }}>
              {post.titulo}
            </h1>
            {post.resumen && (
              <p style={{ fontSize: 18, color: 'var(--hc-muted)', lineHeight: 1.6, marginBottom: 24 }}>
                {post.resumen}
              </p>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 32, borderBottom: '1px solid var(--hc-border)', marginBottom: 40 }}>
              <span style={{ fontSize: 13, color: 'var(--hc-muted)' }}>
                {fmtDate(post.fechaPublicacion || post.fechaCreacion)}
              </span>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--hc-text)' }}>HotClick</span>
            </div>
          </motion.div>

          {/* Contenido */}
          {post.contenido && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="prose-hotclick"
              style={{
                color: 'var(--hc-text)',
                lineHeight: 1.8,
                fontSize: 16,
              }}
              dangerouslySetInnerHTML={{ __html: post.contenido }}
            />
          )}

          {/* Volver */}
          <div style={{ marginTop: 56, paddingTop: 32, borderTop: '1px solid var(--hc-border)' }}>
            <Link to="/blog" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              color: 'var(--hc-accent)', fontWeight: 700, textDecoration: 'none',
              fontSize: 15,
            }}>
              ← Volver al blog
            </Link>
          </div>
        </div>
      </article>
    </MainLayout>
  )
}
