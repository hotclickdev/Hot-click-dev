import { formatColones, inicialesProducto, nombreItem, tituloYCodigo } from './posPagoFormat'
import type { QrPagoItem } from './posPagoTypes'

export default function PosPagoItemFila({ item }: { item: QrPagoItem }) {
  const nombre = nombreItem(item)
  const { titulo, codigo } = tituloYCodigo(nombre)
  const cantidad = Math.max(1, item.cantidad ?? 1)
  const linea = (item.precioUnitario ?? 0) * cantidad

  return (
    <li className="flex items-center gap-3 px-4 py-2.5">
      <Miniatura nombre={titulo} imagen={item.imagen} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium leading-snug text-[var(--hc-text)] line-clamp-2">
          {titulo}
        </p>
        <p className="mt-0.5 text-xs text-[var(--hc-muted)]">
          {codigo ? `${codigo} · ` : ''}
          {cantidad} × ₡{formatColones(item.precioUnitario)}
        </p>
      </div>
      <span className="shrink-0 text-sm font-semibold tabular-nums text-[var(--hc-text)]">
        ₡{formatColones(linea)}
      </span>
    </li>
  )
}

function Miniatura({ nombre, imagen }: { nombre: string; imagen?: string | null }) {
  if (imagen) {
    return (
      <img
        src={imagen}
        alt=""
        className="size-10 shrink-0 rounded-lg object-cover bg-[var(--hc-n-50)]"
      />
    )
  }

  return (
    <span
      className="size-10 shrink-0 rounded-lg grid place-items-center text-xs font-bold tracking-wide"
      style={{ background: 'var(--hc-n-50)', color: 'var(--hc-muted)' }}
      aria-hidden="true"
    >
      {inicialesProducto(nombre)}
    </span>
  )
}
