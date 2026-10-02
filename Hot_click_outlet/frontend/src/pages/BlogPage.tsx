import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import Spinner from '@/components/ui/Spinner'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { blogService } from '@/services/blogService'
import { IcoBandeja } from './perfil/cuenta/iconosCuenta'
import { IcoSrv } from './servicios/IcoSrv'
import { fechaEntrada, listaEntradas, metaEntrada, urlEntrada, type EntradaBlog } from './blog/blogHelpers'

export type { EntradaBlog } from './blog/blogHelpers'

const META = 'font-mono text-[11px] font-medium text-hc-n-500'

/** Artículo destacado: foto de 190, fecha y lectura, título, resumen y "Leer artículo" (Figma `54:2162`). */
function Destacado({ e }: { e: EntradaBlog }) {
  return (
    <Link to={urlEntrada(e)} className="flex flex-col overflow-hidden rounded-[14px] border border-hc-n-200 bg-hc-n-0">
      {e.imagenUrl
        ? <img src={e.imagenUrl} alt="" className="h-[190px] w-full object-cover" />
        : <span aria-hidden="true" className="h-[190px] w-full bg-hc-n-100" />}
      <span className="flex flex-col gap-[6px] px-[14px] pb-[14px] pt-3">
        <span className={META}>{metaEntrada(e)}</span>
        <h2 className="font-display text-[19px] font-bold leading-6 text-hc-n-900 [overflow-wrap:anywhere] [text-wrap:wrap]">{e.titulo}</h2>
        {e.resumen && <span className="text-[13px] leading-[18px] text-hc-n-600">{e.resumen}</span>}
        <span className="flex items-center gap-1 text-[13px] font-semibold text-hc-blue-600">
          Leer artículo
          <IcoSrv nombre="blogFlecha" size={14} />
        </span>
      </span>
    </Link>
  )
}

/** Fila de artículo: miniatura de 96, fecha, título y resumen (Figma `54:2173`). */
function Fila({ e }: { e: EntradaBlog }) {
  return (
    <Link to={urlEntrada(e)} className="flex items-start gap-3">
      {e.imagenUrl
        ? <img src={e.imagenUrl} alt="" className="size-24 shrink-0 rounded-[12px] object-cover" loading="lazy" />
        : <span aria-hidden="true" className="size-24 shrink-0 rounded-[12px] bg-hc-n-100" />}
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className={META}>{fechaEntrada(e)}</span>
        <h2 className="font-display text-[14px] font-semibold leading-[19px] text-hc-n-900 [overflow-wrap:anywhere] [text-wrap:wrap]">{e.titulo}</h2>
        {e.resumen && <span className="line-clamp-3 text-[12px] leading-4 text-hc-n-600">{e.resumen}</span>}
      </span>
    </Link>
  )
}

/** Blog (Figma `54:2126`): artículo destacado y lista. Los temas y el buscador del frame necesitan backend (ver docs). */
export default function BlogPage() {
  const [entradas, setEntradas] = useState<EntradaBlog[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    blogService.getPublicos()
      .then(r => setEntradas(listaEntradas(r.data)))
      .catch((err: unknown) => { console.error('[BlogPage] entradas', err) })
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

  const [destacada, ...resto] = entradas

  return (
    <MainLayout variante="interna" titulo="Blog HotClick" esTituloPrincipal atras="/" barraInferior>
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

      <div className="flex flex-col leading-[normal] lg:mx-auto lg:w-full lg:max-w-[720px]">
        <h1 className="hidden lg:block lg:pt-8 lg:font-display lg:text-[28px] lg:font-bold lg:text-hc-n-900">Blog HotClick</h1>
        <p className="px-4 pb-1 pt-4 text-[13px] leading-[18px] text-hc-n-600 lg:px-0">
          Ideas para comprar mejor y conocer a los emprendedores de Costa Rica.
        </p>

        {loading && <div className="flex justify-center py-20"><Spinner /></div>}

        {!loading && entradas.length === 0 && (
          <div className="bg-hc-n-0 max-lg:min-h-[calc(100dvh-240px)] lg:rounded-[16px]">
            <EstadoVacio
              tono="azul"
              espaciado="cuenta"
              icono={<IcoBandeja size={28} />}
              titulo="Próximamente"
              texto="Estamos preparando contenido para vos."
            />
          </div>
        )}

        {!loading && destacada && (
          <>
            <div className="px-4 pb-2 pt-3 lg:px-0"><Destacado e={destacada} /></div>
            {resto.length > 0 && (
              <div className="flex flex-col gap-3 px-4 pb-6 pt-3 lg:px-0">
                {resto.map((e) => <Fila key={e.id ?? e.slug} e={e} />)}
              </div>
            )}
          </>
        )}
      </div>
    </MainLayout>
  )
}
