import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { IconoCerrar, IconoLike } from './VisitanteIcons'
import VisitanteMain, { VisitanteThumb, VisitanteTitulo } from './VisitantePiezas'
import { PRODUCTOS_VISITANTE, visitanteRuta } from './visitanteMock'

/**
 * Discover Visitante (Figma 120:378).
 */
export default function VisitanteDiscoverPage() {
  const navigate = useNavigate()
  const [indice, setIndice] = useState(
    Math.max(0, PRODUCTOS_VISITANTE.findIndex((item) => item.id === 'cojin')),
  )
  const [gusto, setGusto] = useState(false)
  const producto = PRODUCTOS_VISITANTE[indice % PRODUCTOS_VISITANTE.length]
  const total = PRODUCTOS_VISITANTE.length

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
    <VisitanteMain className="flex flex-col items-center">
      <div className="w-full">
        <VisitanteTitulo sub="Deslizá y descubrí productos que te gustan">Discover</VisitanteTitulo>
      </div>
      <ol className="mb-4 flex gap-1.5" aria-label="Progreso">
        {PRODUCTOS_VISITANTE.map((item, i) => (
          <li
            key={item.id}
            className={`h-1.5 rounded-full ${i === indice ? 'w-5 bg-hc-accent' : 'w-1.5 bg-hc-border'}`}
          />
        ))}
      </ol>
      <div className="relative mb-6 h-[420px] w-full max-w-[320px]">
        <div className="absolute inset-x-4 top-6 h-[390px] rotate-6 rounded-3xl bg-[var(--hc-n-100)] opacity-35" />
        <div className="absolute inset-x-2 top-2 h-[400px] -rotate-3 rounded-3xl bg-[var(--hc-n-100)] opacity-60" />
        <article className="relative flex h-[400px] flex-col gap-1.5 rounded-3xl border border-hc-border bg-hc-surface p-[18px]">
          <VisitanteThumb altura="h-[280px]" />
          <p className="font-display text-[15px] font-bold">{producto.nombre}</p>
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
    </VisitanteMain>
  )
}
