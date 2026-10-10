import { Link, useParams } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { useQuery } from '@tanstack/react-query'
import MainLayout from '@/layouts/MainLayout'
import { seoService } from '@/services/seoService'

const SITE = 'https://hotclick.lat'

export default function ProvinciaLandingPage() {
  const { provincia = '' } = useParams()
  const { data, isLoading, isError } = useQuery({
    queryKey: ['seo-provincia', provincia],
    queryFn: () => seoService.provincia(provincia),
    enabled: provincia.length > 0,
  })

  const title = data ? `Tiendas en ${data.nombre}, Costa Rica | HotClick` : 'Provincia | HotClick'
  const descripcion = data
    ? `Tiendas en línea de emprendedores, pymes y negocios en ${data.nombre}, Costa Rica. Comprá en HotClick con envío a todo el país.`
    : 'No hay tiendas publicadas en esta provincia.'
  const url = `${SITE}/tiendas/${provincia}`

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
            {JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'CollectionPage',
              name: title,
              description: descripcion,
              areaServed: {
                '@type': 'AdministrativeArea',
                name: data.nombre,
                containedInPlace: { '@type': 'Country', name: 'Costa Rica' },
              },
            })}
          </script>
        )}
      </Helmet>
      <article className="max-w-4xl mx-auto px-4 py-10">
        {isLoading && <p style={{ color: 'var(--hc-muted)' }}>Cargando…</p>}
        {isError && (
          <>
            <h1 className="text-3xl font-black" style={{ color: 'var(--hc-text)' }}>Sin tiendas en esta provincia</h1>
            <p className="mt-3" style={{ color: 'var(--hc-muted)' }}>{descripcion}</p>
            <Link to="/negocios" className="inline-block mt-6 underline">Ver negocios en HotClick</Link>
          </>
        )}
        {data && (
          <>
            <h1 className="text-3xl sm:text-4xl font-black" style={{ color: 'var(--hc-text)' }}>
              Tiendas en {data.nombre}, Costa Rica
            </h1>
            <p className="mt-3 text-base leading-relaxed" style={{ color: 'var(--hc-muted)' }}>{descripcion}</p>
            <ul className="mt-8 space-y-3">
              {data.tiendas.map(tienda => (
                <li key={tienda.slug}>
                  <Link to={`/tienda/${tienda.slug}`} className="block rounded-2xl border p-4" style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-surface)' }}>
                    <span className="font-bold" style={{ color: 'var(--hc-text)' }}>{tienda.nombre}</span>
                    {tienda.tagline && (
                      <span className="block text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{tienda.tagline}</span>
                    )}
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
