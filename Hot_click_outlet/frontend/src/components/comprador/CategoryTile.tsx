import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useUiStore from '@/store/uiStore'
import { fotoCategoria } from './fotoCategoria'

type CategoryTileProps = {
  nombre: string
  cantidad: number
  fotoUrl?: string | null
  to: string
  className?: string
}

const ID_FILTRO = 'hc-sin-pozo-blanco'
const SVG_NS = 'http://www.w3.org/2000/svg'
/** 50 escalones: solo el último (canal ≥ 250) es blanco puro del JPEG. */
const ESCALONES_BLANCO_PURO = `${'0 '.repeat(49)}1`

function nodo(nombre: string, attrs: Record<string, string>): SVGElement {
  const el = document.createElementNS(SVG_NS, nombre)
  for (const [clave, valor] of Object.entries(attrs)) el.setAttribute(clave, valor)
  return el
}

/** Un solo filtro en el body. Dentro del marco (overflow) Chrome no pinta la foto y muestra la X. */
function asegurarFiltroPozo(): void {
  if (document.getElementById(ID_FILTRO)) return
  const svg = nodo('svg', { width: '0', height: '0', 'aria-hidden': 'true' })
  svg.style.position = 'absolute'
  const filter = nodo('filter', {
    id: ID_FILTRO,
    'color-interpolation-filters': 'sRGB',
    x: '0',
    y: '0',
    width: '100%',
    height: '100%',
  })
  const transferencia = nodo('feComponentTransfer', { in: 'SourceGraphic', result: 'umbral' })
  for (const canal of ['feFuncR', 'feFuncG', 'feFuncB']) {
    transferencia.appendChild(nodo(canal, { type: 'discrete', tableValues: ESCALONES_BLANCO_PURO }))
  }
  filter.append(
    transferencia,
    nodo('feColorMatrix', {
      in: 'umbral',
      type: 'matrix',
      result: 'mascara',
      values: '0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 1 1 0 -2',
    }),
    nodo('feComposite', { in: 'SourceGraphic', in2: 'mascara', operator: 'out' }),
  )
  svg.appendChild(filter)
  document.body.appendChild(svg)
}

/** Categoría con foto representativa y cantidad real de productos (Figma `5:39`). */
export default function CategoryTile({ nombre, cantidad, fotoUrl, to, className = '' }: CategoryTileProps) {
  const { t } = useTranslation()
  const oscuro = useUiStore((s) => s.theme === 'dark')
  const [filtroListo, setFiltroListo] = useState(false)
  const [sinFiltro, setSinFiltro] = useState(false)
  const foto = fotoUrl && !sinFiltro ? fotoCategoria(fotoUrl) : null
  const filtrar = Boolean(oscuro && filtroListo && foto?.filtrable)

  useEffect(() => {
    if (!oscuro) return
    asegurarFiltroPozo()
    setFiltroListo(true)
  }, [oscuro])

  return (
    <Link to={to} className={`flex flex-col items-start gap-2 ${className}`}>
      <span className="hc-marco-foto relative block h-[112px] w-full overflow-hidden rounded-[14px] bg-hc-n-100">
        {fotoUrl && (
          <img
            src={foto?.src ?? fotoUrl}
            alt=""
            crossOrigin={foto?.crossOrigin}
            onError={() => setSinFiltro(true)}
            className="hc-foto-categoria size-full object-cover"
            style={filtrar ? { filter: `url(#${ID_FILTRO})` } : undefined}
            loading="lazy"
            decoding="async"
          />
        )}
      </span>
      <span className="flex flex-col items-start">
        <span className="font-display text-[14px] font-semibold leading-[normal] text-hc-n-900">{nombre}</span>
        <span className="text-[12px] leading-[normal] text-hc-n-600">{t('comprador.categoria.productos', { count: cantidad })}</span>
      </span>
    </Link>
  )
}
