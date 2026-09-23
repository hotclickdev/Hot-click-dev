import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import { useCuentaVendedor } from '@/prototipo/emprendedor/hooks/useCuentaVendedor'
import Miniatura from '@/prototipo/emprendedor/ui/Miniatura'
import BadgeEstado from '@/prototipo/emprendedor/ui/BadgeEstado'
import { Chip } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import { useCatalogoVendedor } from './useCatalogoVendedor'
import EntradaPagina from './motion/EntradaPagina'
import { ItemListaStagger, ListaStagger } from './motion/ListaStagger'
import EstadoVacioConversacional from './motion/EstadoVacioConversacional'
import iconBuscar from './assets/icon-buscar.svg'
import iconOjo from './assets/icon-ojo.svg'

const FILTROS = ['Todos', 'Tecnología', 'Ropa'] as const

/**
 * Vista pública de la tienda (Figma 61:344).
 * Catálogo y nombre de tienda reales (P1-02): antes mostraba el mock fijo
 * "Tienda QA2 Emprendedor" en PYME/Plus, sin relación con el catálogo real
 * del vendedor. Usa los mismos hooks ya cableados a la API que la versión
 * de Emprendedor (`useCatalogoVendedor` / `useCuentaVendedor`).
 */
export default function TiendaPublicaPage() {
  const ruta = useSellerRuta()
  const { seller: productos, cargando, error } = useCatalogoVendedor()
  const { tienda, inicial } = useCuentaVendedor()
  const [filtro, setFiltro] = useState<string>('Todos')
  const publicados = useMemo(
    () => productos.filter((item) => item.estado === 'Publicado'),
    [productos],
  )
  const visibles = useMemo(
    () => (filtro === 'Todos' ? publicados : publicados.filter((item) => item.categoria === filtro)),
    [publicados, filtro],
  )
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
          <div className="-mt-8 flex size-16 items-center justify-center rounded-full bg-hc-primary text-xl font-bold text-white">{inicial}</div>
          <div className="pt-2">
            <h1 className="font-display text-lg font-bold">Tienda {tienda}</h1>
            <p className="text-xs text-hc-muted">Outlet oficial</p>
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
            {FILTROS.map((item) => (
              <Chip key={item} activo={filtro === item} onClick={() => setFiltro(item)}>{item}</Chip>
            ))}
          </div>
          <h2 className="mb-3 mt-5 text-[15px] font-bold">Productos de esta tienda</h2>
          {cargando ? <p className="text-sm text-hc-muted">Cargando productos…</p> : null}
          {error ? <p className="text-sm text-hc-danger">{error}</p> : null}
          {!cargando && !error && visibles.length === 0 ? (
            <EstadoVacioConversacional
              titulo={publicados.length === 0 ? 'Tu vitrina está vacía' : 'Sin productos en este filtro'}
              mensaje={publicados.length === 0
                ? 'Todavía no tenés productos publicados.'
                : 'Probá con otra categoría o volvé a Todos.'}
            />
          ) : null}
          {!cargando && visibles.length > 0 ? (
            <ListaStagger className="grid grid-cols-2 gap-3">
              {visibles.map((item) => (
                <ItemListaStagger key={item.id}>
                  <Link to={ruta(`productos/${item.id}`)} className="block">
                    <Miniatura src={item.imagenUrl} alt="" size="lg" />
                    <div className="mt-2">
                      <BadgeEstado tono="exito">Disponible</BadgeEstado>
                    </div>
                    <p className="mt-1 text-xs font-medium">{item.nombre}</p>
                    <p className="text-sm font-bold">{formatoColon(item.precio)}</p>
                  </Link>
                </ItemListaStagger>
              ))}
            </ListaStagger>
          ) : null}
        </div>
      </EntradaPagina>
    </main>
  )
}
