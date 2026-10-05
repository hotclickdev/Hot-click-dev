import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import DOMPurify from 'dompurify'
import { usePublicarMigas } from '@/components/comprador/header/migasContexto'
import MainLayout from '@/layouts/MainLayout'
import Spinner from '@/components/ui/Spinner'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { useToast } from '@/components/ui/Toast'
import { blogService } from '@/services/blogService'
import { IcoBandeja } from './perfil/cuenta/iconosCuenta'
import { IcoSrv } from './servicios/IcoSrv'
import { enlacesCompartir, entradaDeRespuesta, fechaEntrada, minutosDeLectura, type EntradaBlog } from './blog/blogHelpers'

const SITE_URL = 'https://hotclick.lat'

/** Texto del artículo (Figma `54:2240`): párrafos de 15/23 y subtítulos en Sora. El HTML viene del editor del admin. */
const CLASE_CUERPO = [
  'text-[15px] leading-[23px] text-hc-n-900 [overflow-wrap:anywhere]',
  '[&_p]:mb-3 [&_h2]:mb-3 [&_h2]:[text-wrap:wrap] [&_h3]:[text-wrap:wrap] [&_h2]:font-display [&_h2]:text-[17px] [&_h2]:font-bold [&_h2]:leading-[22px]',
  '[&_h3]:mb-3 [&_h3]:font-display [&_h3]:text-[16px] [&_h3]:font-bold [&_h3]:leading-[22px]',
  '[&_ul]:mb-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:mb-3 [&_ol]:list-decimal [&_ol]:pl-5',
  '[&_a]:font-medium [&_a]:text-hc-blue-600 [&_a]:underline [&_img]:my-3 [&_img]:h-auto [&_img]:max-w-full [&_img]:rounded-[12px]',
  '[&_blockquote]:mb-3 [&_blockquote]:border-l-2 [&_blockquote]:border-hc-n-200 [&_blockquote]:pl-3 [&_blockquote]:text-hc-n-600',
].join(' ')

const CHIP = 'rounded-full border border-hc-n-200 bg-hc-n-0 px-[14px] py-2 text-[13px] font-medium text-hc-n-900'

function buildBlogPostingJsonLd(post: EntradaBlog) {
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
        url: `${SITE_URL}/brand/app-icon.png`,
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

/** Artículo del blog (Figma `54:2219`). Los productos del artículo y el autor propio necesitan backend (ver docs). */
export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const toast = useToast()
  const [post, setPost] = useState<EntradaBlog | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true) // eslint-disable-line react-hooks/set-state-in-effect -- reset al cambiar slug
    setNotFound(false)
    blogService.getPublico(slug)
      .then(r => setPost(entradaDeRespuesta(r.data)))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [slug])

  usePublicarMigas({ actual: post?.titulo || undefined })

  if (loading) {
    return (
      <MainLayout variante="interna" titulo="Blog" atras="/blog">
        <div className="flex justify-center py-32"><Spinner variante="figma" /></div>
      </MainLayout>
    )
  }

  if (notFound || !post) {
    return (
      <MainLayout variante="interna" titulo="Blog" atras="/blog">
        <Helmet>
          <title>Artículo no encontrado | Blog HotClick</title>
          <meta name="robots" content="noindex, follow" />
        </Helmet>
        <div className="bg-hc-n-0 max-lg:min-h-[calc(100dvh-123px)]">
          <EstadoVacio
            nivel="h1"
            tono="azul"
            espaciado="cuenta"
            icono={<IcoBandeja size={28} />}
            titulo="Artículo no encontrado"
            accion={{ texto: 'Volver al blog', to: '/blog' }}
          />
        </div>
      </MainLayout>
    )
  }

  const seoTitle = `${post.titulo} | Blog HotClick`
  const seoDesc = post.resumen || post.titulo
  const seoImage = post.imagenUrl || `${SITE_URL}/og-image.png`
  const canonicalUrl = `${SITE_URL}/blog/${post.slug || post.id}`
  const minutos = minutosDeLectura(post.contenido)
  const enlaces = enlacesCompartir(canonicalUrl, post.titulo ?? 'Blog HotClick')

  const copiarEnlace = async () => {
    try {
      await navigator.clipboard.writeText(canonicalUrl)
      toast({ message: 'Enlace copiado', type: 'success' })
    } catch {
      toast({ message: 'No se pudo copiar el enlace', type: 'error' })
    }
  }

  /** Hoja de compartir del sistema si existe; si no, copia el enlace. */
  const compartir = async () => {
    if (typeof navigator.share === 'function') {
      try { await navigator.share({ title: post.titulo, url: canonicalUrl }) } catch { /* el usuario cerró la hoja */ }
      return
    }
    await copiarEnlace()
  }

  const botonCompartir = (
    <button
      type="button"
      onClick={() => void compartir()}
      aria-label="Compartir artículo"
      className="relative flex size-5 items-center justify-center before:absolute before:-inset-[10px] before:content-['']"
    >
      <IcoSrv nombre="blogCompartir" size={20} />
    </button>
  )

  return (
    <MainLayout variante="interna" titulo="Blog" atras="/blog" acciones={botonCompartir}>
      <Helmet>
        <title>{seoTitle}</title>
        <meta name="description" content={seoDesc} />
        <link rel="canonical" href={canonicalUrl} />
        <link rel="alternate" hrefLang="es-CR" href={canonicalUrl} />
        <link rel="alternate" hrefLang="es"    href={canonicalUrl} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/`} />
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

      <article className="flex flex-col bg-hc-n-0 leading-[normal] lg:mx-auto lg:w-full lg:max-w-[720px]">
        {post.imagenUrl && (
          <img src={post.imagenUrl} alt={post.titulo} className="h-[220px] w-full object-cover lg:h-[320px]" fetchPriority="high" loading="eager" />
        )}

        <header className="flex flex-col gap-2 px-4 pb-2 pt-[18px]">
          <nav aria-label="Ruta de navegación">
            <ol className="m-0 flex list-none items-center gap-1 p-0 text-[11px] text-hc-n-600">
              <li><Link to="/">Inicio</Link></li>
              <li aria-hidden="true">/</li>
              <li aria-current="page"><Link to="/blog">Blog</Link></li>
            </ol>
          </nav>
          <h1 className="font-display text-[24px] font-extrabold leading-[30px] text-hc-n-900 [overflow-wrap:anywhere] [text-wrap:wrap]">{post.titulo}</h1>
          <p className="flex flex-wrap items-center gap-2 text-[12px]">
            <span className="font-semibold text-hc-n-600">Por HotClick</span>
            <span className="text-hc-n-600">{[fechaEntrada(post), minutos ? `${minutos} min` : ''].filter(Boolean).join(' · ')}</span>
          </p>
        </header>

        {post.contenido && (
          <div
            className={`px-4 py-2 ${CLASE_CUERPO}`}
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(post.contenido) }}
          />
        )}

        <section className="flex flex-col gap-[10px] px-4 pb-7 pt-4" aria-labelledby="blog-compartir">
          <h2 id="blog-compartir" className="font-sans tracking-normal text-[13px] font-semibold text-hc-n-600">Compartir este artículo</h2>
          <div className="flex flex-wrap items-center gap-2">
            <a href={enlaces.whatsapp} target="_blank" rel="noopener noreferrer" className={CHIP}>WhatsApp</a>
            <a href={enlaces.facebook} target="_blank" rel="noopener noreferrer" className={CHIP}>Facebook</a>
            <button type="button" onClick={() => void copiarEnlace()} className={CHIP}>Copiar enlace</button>
          </div>
        </section>
      </article>
    </MainLayout>
  )
}
