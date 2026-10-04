import { Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { seoService } from '@/services/seoService'

/** Directorio de tiendas públicas. Cada tarjeta enlaza a /tienda/{slug}. */
export default function TiendasDirectorio() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['seo-tiendas'],
    queryFn: () => seoService.tiendas(),
  })

  if (isLoading || isError || !data || data.length === 0) return null

  return (
    <section className="max-w-7xl mx-auto px-5 sm:px-8 pb-16">
      <h2 className="text-2xl font-black mb-2" style={{ color: 'var(--hc-text)' }}>Tiendas en línea</h2>
      <p className="mb-6 max-w-3xl text-sm leading-relaxed" style={{ color: 'var(--hc-muted)' }}>
        Estas son las tiendas de emprendedores, pymes y negocios que venden en HotClick, con envío a todo Costa Rica.
      </p>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {data.map(tienda => (
          <li key={tienda.slug}>
            <Link
              to={`/tienda/${tienda.slug}`}
              className="block rounded-2xl border p-4 h-full"
              style={{ borderColor: 'var(--hc-border)', background: 'var(--hc-surface)' }}
            >
              <span className="font-bold" style={{ color: 'var(--hc-text)' }}>{tienda.nombre}</span>
              {tienda.tagline && (
                <span className="block text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>{tienda.tagline}</span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
