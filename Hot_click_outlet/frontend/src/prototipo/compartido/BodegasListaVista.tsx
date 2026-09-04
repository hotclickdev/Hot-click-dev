import type { ReactNode } from 'react'
import { Boton } from './ui'
import { ListaStagger, ItemListaStagger } from './motion/ListaStagger'
import EstadoVacioConversacional from './motion/EstadoVacioConversacional'
import ListadoFeedback from './ListadoFeedback'

export type BodegaListaItem = {
  id: string
  nombre: string
  ubicacion: string
  productos: number
  principal: boolean
}

export type BodegasListaVariante = 'emp' | 'seller'

type Props = Readonly<{
  bodegas: BodegaListaItem[]
  cargando: boolean
  error: string | null
  rutaNueva: string
  variante?: BodegasListaVariante
  /** CTA alternativa (p. ej. EnlacePrimario Emp). Por defecto Boton compartido. */
  ctaNueva?: ReactNode
}>

/**
 * Cuerpo compartido Mis Bodegas (sin chrome de página).
 */
export default function BodegasListaVista({
  bodegas,
  cargando,
  error,
  rutaNueva,
  variante = 'seller',
  ctaNueva,
}: Props) {
  const cta = ctaNueva ?? <Boton to={rutaNueva}>+ Nueva bodega</Boton>
  const emp = variante === 'emp'

  return (
    <ListadoFeedback
      cargando={cargando}
      error={error}
      cantidad={bodegas.length}
      skeletonLabel="Cargando bodegas"
      className={emp ? 'space-y-3' : 'mt-4 space-y-3'}
      empty={(
        <EstadoVacioConversacional
          titulo="Todavía no tenés bodegas"
          mensaje="Creá la primera para saber dónde guardás tu inventario."
          accion={cta}
        />
      )}
    >
      {!emp ? cta : null}
      <ListaStagger className={emp ? 'flex flex-col gap-4' : 'mt-5 space-y-3'}>
        {bodegas.map((item) => (
          <ItemListaStagger key={item.id}>
            {emp ? <TarjetaEmp bodega={item} /> : <TarjetaSeller bodega={item} />}
          </ItemListaStagger>
        ))}
      </ListaStagger>
      {emp ? cta : null}
    </ListadoFeedback>
  )
}

function TarjetaEmp({ bodega }: { bodega: BodegaListaItem }) {
  return (
    <div className="rounded-xl border border-hc-border bg-hc-surface p-4 md:p-6">
      <div className="flex flex-col gap-1">
        <p className="text-[15px] font-semibold text-hc-text">{bodega.nombre}</p>
        <p className="text-[13px] text-hc-muted">{detalleEmp(bodega)}</p>
      </div>
    </div>
  )
}

function TarjetaSeller({ bodega }: { bodega: BodegaListaItem }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-hc-surface-2 p-3.5">
      <span className="flex size-11 items-center justify-center rounded-full bg-hc-surface text-sm font-bold">
        {bodega.nombre.slice(0, 1)}
      </span>
      <div className="flex-1">
        <p className="text-sm font-medium">{bodega.nombre}</p>
        <p className="text-xs text-hc-muted">{bodega.ubicacion || 'Sin ubicación'}</p>
      </div>
      {bodega.principal ? (
        <span
          className="rounded-full px-2.5 py-1 text-[10px]"
          style={{ background: 'var(--hc-blue-50)', color: 'var(--hc-blue-700)' }}
        >
          Principal
        </span>
      ) : null}
    </div>
  )
}

function detalleEmp(bodega: BodegaListaItem): string {
  const base = `${bodega.ubicacion} · ${bodega.productos} productos`
  return bodega.principal ? `${base} · Principal` : base
}
