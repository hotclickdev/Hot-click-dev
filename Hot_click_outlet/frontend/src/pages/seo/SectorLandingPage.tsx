import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import MainLayout from '@/layouts/MainLayout'
import { seoService } from '@/services/seoService'
import { formatPrice } from '@/utils/format'
import { generateBreadcrumbJsonLd, generateItemListJsonLd } from '@/utils/jsonLd'

const SITE = 'https://hotclick.lat'

export default function SectorLandingPage() {
  const { slug = '' } = useParams()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['seo-sector', slug],
    queryFn: () => seoService.sector(slug),
    enabled: slug.length > 0,
  })

  const title = data ? `${data.nombre} en Costa Rica — comprá en línea | HotClick` : 'Sector | HotClick'
  const descripcion = data?.descripcion ?? 'Este sector no está publicado en HotClick.'
  const url = `${SITE}/comprar/${slug}`

  return (
    <MainLayout>
      <Helmet>
        <title>{title}</title>
        <meta name="description" content={descripcion} />
        <link rel="canonical" href={url} />
        {isError && <meta name="robots" content="noindex, follow" />}
        <meta property="og:title" content={title} />
        <meta property="og:description" content={descripcion} />
        <meta property="og:url" content={url} />
        {data && (
          <script type="application/ld+json">
            {JSON.stringify(generateBreadcrumbJsonLd([
              { name: 'Inicio', url: `${SITE}/` },
              { name: 'Productos', url: `${SITE}/productos` },
              { name: data.nombre, url },
            ]))}
          </script>
        )}
        {data && data.productos.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify(generateItemListJsonLd(
              data.productos.map(p => ({ id: p.id, nombre: p.nombre })),
              SITE,
              `${data.nombre} en Costa Rica`,
            ))}
          </script>
        )}
      </Helmet>
      <article className="max-w-6xl mx-auto px-4 py-10">
        {isLoading && <p style={{ color: 'var(--hc-muted)' }}>Cargando…</p>}
        {isError && (
          <>
            <h1 className="text-3xl font-black" style={{ color: 'var(--hc-text)' }}>Sector no publicado</h1>
            <p className="mt-3" style={{ color: 'var(--hc-muted)' }}>
              Este rubro no tiene suficientes productos visibles en HotClick.
            </p>
            <Link to="/productos" className="inline-block mt-6 underline">Ver el catálogo</Link>
          </>
        )}
        {data && (
          <>
            <nav className="text-xs mb-4" style={{ color: 'var(--hc-muted)' }}>
              <Link to="/">Inicio</Link>
              <span aria-hidden="true"> / </span>
              <Link to="/productos">Productos</Link>
              <span aria-hidden="true"> / </span>
              <span>{data.nombre}</span>
            </nav>
            <h1 className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--hc-text)' }}>
              {data.nombre} en Costa Rica
            </h1>
            <p className="mt-3 max-w-3xl text-base leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
              {data.descripcion}
            </p>
            <ul className="mt-8 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {data.productos.map(producto => (
                <li key={producto.id}>
                  <Link to={`/productos/${producto.id}`} className="block rounded-2xl overflow-hidden border" style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-surface)' }}>
                    {producto.imagenUrl
                      ? <img src={producto.imagenUrl} alt={producto.nombre} className="aspect-square w-full object-cover" />
                      : <div className="aspect-square" />}
                    <div className="p-3">
                      <p className="text-sm font-semibold line-clamp-2" style={{ color: 'var(--hc-text)' }}>{producto.nombre}</p>
                      <p className="text-sm mt-1" style={{ color: 'var(--hc-accent)' }}>{formatPrice(producto.precio)}</p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </>
        )}
      </article>
    </MainLayout>
  )
}
