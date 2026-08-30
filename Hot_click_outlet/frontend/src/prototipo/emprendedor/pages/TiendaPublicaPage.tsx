import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { formatoColon } from '@/theme/formatoColon'
import iconOjo from '../assets/icon-ojo.svg'
import iconBuscar from '../assets/icon-buscar.svg'
import BadgeEstado from '../ui/BadgeEstado'
import FilaChips from '../ui/FilaChips'
import Miniatura from '../ui/Miniatura'
import { CUENTA_DEMO, RUTA_EMPRENDEDOR } from '../constants'
import { useCatalogoEmprendedor } from '../hooks/useCatalogoEmprendedor'
import type { ProductoEmprendedor } from '../types'

const FILTROS = ['Todos', 'Tecnología', 'Ropa'] as const

/**
 * Paso 5 Tienda vista pública (Figma 15:2).
 */
export default function TiendaPublicaPage() {
  const { productos } = useCatalogoEmprendedor()
  const [filtro, setFiltro] = useState<string>('Todos')
  const [seguir, setSeguir] = useState(false)
  const visibles = useMemo(
    () => (filtro === 'Todos' ? productos : productos.filter((p) => p.categoria === filtro)),
    [productos, filtro],
  )

  return (
    <main>
      <div className="flex items-center justify-center gap-1.5 bg-hc-text py-2">
        <span className="h-3.5 w-[18px] overflow-hidden">
          <img src={iconOjo} alt="" width={18} height={14} className="size-full" />
        </span>
        <p className="text-[10px] font-medium text-white">Así te ven los compradores</p>
      </div>
      <div className="h-24 bg-gradient-to-r from-hc-primary to-[var(--hc-red-700)]" />
      <CabeceraTienda seguir={seguir} onSeguir={() => setSeguir((v) => !v)} />
      <div className="flex flex-col gap-[18px] px-5 pb-10 pt-2">
        <div className="flex items-center gap-2 rounded-xl bg-[var(--hc-n-50)] px-3.5 py-3">
          <span className="size-3.5 overflow-hidden">
            <img src={iconBuscar} alt="" width={14} height={14} className="size-full" />
          </span>
          <span className="text-[13px] text-hc-muted">Buscar en esta tienda</span>
        </div>
        <FilaChips valor={filtro} opciones={FILTROS} onChange={setFiltro} />
        <h2 className="text-[15px] font-bold">Productos de esta tienda</h2>
        <ul className="grid grid-cols-2 gap-3">
          {visibles.map((producto) => (
            <TarjetaTienda key={producto.id} producto={producto} />
          ))}
        </ul>
      </div>
    </main>
  )
}

function CabeceraTienda({ seguir, onSeguir }: { seguir: boolean; onSeguir: () => void }) {
  return (
    <div className="px-5">
      <div className="flex gap-3">
        <div className="-mt-8 flex size-16 items-center justify-center rounded-2xl border-4 border-white bg-hc-surface text-2xl font-bold text-hc-primary">
          Q
        </div>
        <div className="pt-9">
          <p className="text-[15px] font-bold">Tienda {CUENTA_DEMO.tienda}</p>
          <p className="text-[10px] text-hc-muted">4.8 · 126 ventas · Outlet oficial</p>
        </div>
      </div>
      <button
        type="button"
        onClick={onSeguir}
        className={`mt-4 min-h-11 rounded-full px-4 py-2 text-[11px] font-bold ${
          seguir ? 'border border-hc-border bg-hc-surface text-hc-text' : 'bg-hc-primary text-white'
        }`}
      >
        {seguir ? 'Siguiendo' : '+ Seguir tienda'}
      </button>
    </div>
  )
}

function TarjetaTienda({ producto }: { producto: ProductoEmprendedor }) {
  return (
    <li>
      <Link to={`${RUTA_EMPRENDEDOR}/tienda/${producto.id}`} className="flex flex-col gap-2">
        <Miniatura src={producto.imagenUrl} alt="" size="lg" />
        <BadgeEstado>Disponible</BadgeEstado>
        <p className="text-xs font-medium">{producto.nombre}</p>
        <p className="text-[13px] font-bold text-hc-primary">{formatoColon(producto.precio)}</p>
      </Link>
    </li>
  )
}
