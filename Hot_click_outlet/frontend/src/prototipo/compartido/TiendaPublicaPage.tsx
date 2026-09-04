import { useState } from 'react'
import { Link } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { PRODUCTOS, type CategoriaProducto } from './mock'
import { Chip, Miniatura } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import EntradaPagina from './motion/EntradaPagina'
import { ItemListaStagger, ListaStagger } from './motion/ListaStagger'
import EstadoVacioConversacional from './motion/EstadoVacioConversacional'
import iconBuscar from './assets/icon-buscar.svg'
import iconOjo from './assets/icon-ojo.svg'

/**
 * Vista pública de la tienda (Figma 61:344).
 */
export default function TiendaPublicaPage() {
  const ruta = useSellerRuta()
  const [filtro, setFiltro] = useState<'Todos' | CategoriaProducto>('Todos')
  const publicados = PRODUCTOS.filter((item) => item.estado === 'Publicado')
  const visibles = filtro === 'Todos' ? publicados : publicados.filter((item) => item.categoria === filtro)
  return (
    <main className="pb-8">
      <div className="flex items-center justify-center gap-2 bg-[var(--hc-n-900)] py-2 text-[12px] text-white">
        <span className="relative block size-[18px] overflow-clip">
          <img src={iconOjo} alt="" width={18} height={14} className="size-full object-contain" />
        </span>
        Así te ven los compradores
      </div>
      <EntradaPagina>
        <div className="h-24 bg-hc-surface-2" aria-hidden />
        <div className="flex items-start gap-4 px-5 pt-0">
          <div className="-mt-8 flex size-16 items-center justify-center rounded-full bg-hc-primary text-xl font-bold text-white">Q</div>
          <div className="pt-2">
            <h1 className="font-display text-lg font-bold">Tienda QA2 Emprendedor</h1>
            <p className="text-xs text-hc-muted">4.8 · 126 ventas · Outlet oficial</p>
          </div>
        </div>
        <div className="px-5 pt-4">
          <Link to={ruta('proximamente')} className="inline-flex min-h-8 items-center rounded-full border border-hc-border px-4 text-xs font-medium">
            + Seguir tienda
          </Link>
          <div className="mt-4 flex min-h-11 items-center gap-2 rounded-xl bg-hc-surface-2 px-3.5 text-sm text-hc-muted">
            <span className="relative block size-[14px] overflow-clip">
              <img src={iconBuscar} alt="" width={14} height={14} className="size-full" />
            </span>
            Buscar en esta tienda
          </div>
          <div className="mt-4 flex gap-2">
            {(['Todos', 'Tecnología', 'Ropa'] as const).map((item) => (
              <Chip key={item} activo={filtro === item} onClick={() => setFiltro(item)}>{item}</Chip>
            ))}
          </div>
          <h2 className="mb-3 mt-5 text-[15px] font-bold">Productos de esta tienda</h2>
          {visibles.length === 0 ? (
            <EstadoVacioConversacional
              titulo="Sin productos en este filtro"
              mensaje="Probá con otra categoría o volvé a Todos."
            />
          ) : (
            <ListaStagger className="grid grid-cols-2 gap-3">
              {visibles.map((item) => (
                <ItemListaStagger key={item.id}>
                  <Link to={ruta(`productos/${item.id}`)} className="block">
                    <Miniatura className="h-[100px] w-full" />
                    <span className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'var(--hc-success-bg)', color: 'var(--hc-success)' }}>
                      Disponible
                    </span>
                    <p className="mt-1 text-xs font-medium">{item.nombre}</p>
                    <p className="text-sm font-bold">{formatoColon(item.precio)}</p>
                  </Link>
                </ItemListaStagger>
              ))}
            </ListaStagger>
          )}
        </div>
      </EntradaPagina>
    </main>
  )
}
