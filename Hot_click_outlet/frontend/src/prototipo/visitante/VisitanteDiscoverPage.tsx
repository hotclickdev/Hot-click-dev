import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { IconoCerrar, IconoLike } from './VisitanteIcons'
import VisitanteMain, { VisitanteEmptyState, VisitanteThumb, VisitanteTitulo } from './VisitantePiezas'
import { visitanteRuta, type ProductoVisitante } from './visitanteMock'
import { useProductosVisitanteApi } from './useCatalogoVisitante'

/**
 * Discover Visitante: carrusel sobre el catálogo API, sin SKUs mock.
 */
export default function VisitanteDiscoverPage() {
  const { productos, cargando, error } = useProductosVisitanteApi()

  return (
    <VisitanteMain className="flex flex-col items-center">
      <div className="w-full">
        <VisitanteTitulo sub="Deslizá y descubrí productos que te gustan">Discover</VisitanteTitulo>
      </div>
      <CuerpoDiscover productos={productos} cargando={cargando} error={error} />
    </VisitanteMain>
  )
}

function CuerpoDiscover({
  productos,
  cargando,
  error,
}: {
  productos: ProductoVisitante[]
  cargando: boolean
  error: boolean
}) {
  if (cargando) return <p className="text-sm text-hc-muted">Cargando productos…</p>
  if (error) {
    return (
      <VisitanteEmptyState
        titulo="Catálogo no disponible"
        detalle="No pudimos cargar los productos. Intentá de nuevo en un momento."
      />
    )
  }
  if (productos.length === 0) {
    return (
      <VisitanteEmptyState
        titulo="No hay productos para descubrir"
        detalle="Cuando el catálogo tenga artículos, van a aparecer acá."
      />
    )
  }
  return <DiscoverCarrusel productos={productos} />
}

function DiscoverCarrusel({ productos }: { productos: ProductoVisitante[] }) {
  const navigate = useNavigate()
  const [indice, setIndice] = useState(0)
  const [gusto, setGusto] = useState(false)
  const producto = productos[indice]
  if (!producto) return null
  const total = productos.length

  function saltar() {
    setGusto(false)
    if (indice + 1 >= total) {
      navigate(visitanteRuta('recomendados'))
      return
    }
    setIndice((n) => n + 1)
  }

  function gustar() {
    setGusto(true)
    window.setTimeout(saltar, 280)
  }

  return (
    <>
      <ol className="mb-4 flex gap-1.5" aria-label="Progreso">
        {productos.map((item, i) => (
          <li
            key={item.id}
            className={`h-1.5 rounded-full ${i === indice ? 'w-5 bg-hc-accent' : 'w-1.5 bg-hc-border'}`}
          />
        ))}
      </ol>
      <TarjetaDiscover producto={producto} gusto={gusto} />
      <div className="mb-4 flex items-center gap-6">
        <button
          type="button"
          aria-label="Saltar"
          onClick={saltar}
          className="flex size-[60px] items-center justify-center rounded-full border border-hc-border bg-hc-surface text-hc-muted"
        >
          <IconoCerrar className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Me gusta"
          onClick={gustar}
          className="flex size-[60px] items-center justify-center rounded-full bg-hc-accent text-white"
        >
          <IconoLike className="size-5" />
        </button>
      </div>
      <p className="text-center text-[10px] font-medium text-hc-muted">
        Deslizá para saltar   ·   Deslizá para guardar
      </p>
    </>
  )
}

function TarjetaDiscover({ producto, gusto }: { producto: ProductoVisitante; gusto: boolean }) {
  return (
    <div className="relative mb-6 h-[420px] w-full max-w-[320px]">
      <div className="absolute inset-x-4 top-6 h-[390px] rotate-6 rounded-3xl bg-[var(--hc-n-100)] opacity-35" />
      <div className="absolute inset-x-2 top-2 h-[400px] -rotate-3 rounded-3xl bg-[var(--hc-n-100)] opacity-60" />
      <article className="relative flex h-[400px] flex-col gap-1.5 rounded-3xl border border-hc-border bg-hc-surface p-[18px]">
        <VisitanteThumb altura="h-[280px]" imagenUrl={producto.imagenUrl} />
        <Link to={visitanteRuta(`producto/${producto.id}`)} className="font-display text-[15px] font-bold">
          {producto.nombre}
        </Link>
        <p className="text-xs font-medium text-hc-primary">
          {producto.negocio}  ·  {formatoColon(producto.precio)}
        </p>
        {gusto ? (
          <span className="absolute bottom-16 left-6 rotate-12 rounded-lg border-[2.5px] border-hc-success px-3.5 py-1.5 text-[13px] font-bold text-hc-success">
            ME GUSTA
          </span>
        ) : null}
      </article>
    </div>
  )
}
