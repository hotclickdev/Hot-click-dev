import ProductCard from '@/components/comprador/ProductCard'
import type { Producto } from '@/types/producto'

type CarruselProductosProps = {
  id: string
  titulo: string
  productos: Producto[]
  /**
   * `sangrado`: "También te puede gustar" (Figma 28:925), el carrusel corre hasta el borde derecho.
   * `contenido`: "Parecidos disponibles" (Figma 44:1965), el carrusel respeta los 16 px laterales.
   */
  variante: 'sangrado' | 'contenido'
  maximo?: number
}

/**
 * Carrusel de tarjetas de producto de la ficha: desplazable en móvil, una fila de hasta seis en
 * desktop (Figma 29:2072, nodo 29:2211). Usa la tarjeta compartida `comprador/ProductCard` (167x280).
 */
export default function CarruselProductos({ id, titulo, productos, variante, maximo = 6 }: CarruselProductosProps) {
  if (productos.length === 0) return null
  const sangrado = variante === 'sangrado'

  return (
    <section
      aria-labelledby={id}
      className={`flex flex-col gap-3 leading-[normal] lg:gap-5 lg:px-0 lg:pb-14 lg:pt-5 ${
        sangrado ? 'pb-[27px] pt-2' : 'px-4 pb-4 pt-3'
      }`}
    >
      <h2
        id={id}
        className={`font-display font-bold tracking-normal text-hc-n-900 [text-wrap:wrap] lg:px-0 lg:text-[22px] lg:leading-7 ${
          sangrado ? 'px-4 text-[17px] leading-[21px]' : 'text-[16px] leading-5'
        }`}
      >
        {titulo}
      </h2>
      <div
        className={`scrollbar-hide flex gap-3 overflow-x-auto lg:gap-[39.6px] lg:pl-0 ${sangrado ? 'pl-4' : ''}`}
      >
        {productos.slice(0, maximo).map((p) => (
          <ProductCard key={p.id} product={p} className="w-[167px] shrink-0" />
        ))}
      </div>
    </section>
  )
}
