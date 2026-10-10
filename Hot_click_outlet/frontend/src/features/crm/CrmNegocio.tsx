import { useParams } from 'react-router-dom'
import { useOne } from '@refinedev/core'
import type { FichaNegocio } from './crmDatos'
import { fechaOGuion, montoOGuion, numeroOGuion, textoOGuion } from './crmDatos'
import ComprasLista from './ComprasLista'
import { AvisoCrm, CargaCrm } from './Estados'
import { Badge } from './ui/Badge'
import { Card, Kpi } from './ui/Card'

/** Fase 1: ficha del negocio. Cifras tal cual del backend; sin dato se pinta «—». */
export default function CrmNegocio() {
  const { id = '' } = useParams()
  const { result: ficha, query } = useOne<FichaNegocio>({ resource: 'negocios', id, queryOptions: { enabled: !!id } })

  if (query.isLoading) return <CargaCrm />
  if (query.isError || !ficha) return <AvisoCrm>No se pudo abrir la ficha del negocio.</AvisoCrm>

  return (
    <section className="flex flex-col gap-4">
      <header className="flex items-center gap-3">
        {ficha.logoUrl
          ? <img src={ficha.logoUrl} alt="" className="size-14 rounded-[14px] border border-hc-n-200 object-cover" />
          : <span aria-hidden="true" className="grid size-14 place-items-center rounded-[14px] bg-hc-n-100 text-hc-n-400">—</span>}
        <div className="min-w-0">
          <p className="text-xs font-semibold text-hc-n-600">Negocio</p>
          <h1 className="truncate font-display text-[28px] font-extrabold leading-8 text-hc-n-900">{textoOGuion(ficha.nombre)}</h1>
          <p className="mt-1 flex flex-wrap gap-2">
            <Badge tono="azul">{textoOGuion(ficha.plan)}</Badge>
            <Badge tono={ficha.estado === 'ACTIVO' ? 'ok' : 'neutro'}>{textoOGuion(ficha.estado)}</Badge>
          </p>
        </div>
      </header>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi etiqueta="Pedidos" valor={numeroOGuion(ficha.resumen.pedidos)} />
        <Kpi etiqueta="Total pagado" valor={montoOGuion(ficha.resumen.totalPagado)} detalle={`${numeroOGuion(ficha.resumen.pedidosPagados)} pagados`} />
        <Kpi etiqueta="Compradores" valor={numeroOGuion(ficha.resumen.compradoresDistintos)} />
        <Kpi etiqueta="Productos activos" valor={numeroOGuion(ficha.productosActivos)} />
        <Kpi etiqueta="Última venta" valor={fechaOGuion(ficha.resumen.ultimaCompra)} />
      </div>
      <Card className="text-sm text-hc-n-600">En HotClick desde {fechaOGuion(ficha.fechaRegistro)}</Card>
      <h2 className="font-display text-[17px] font-bold text-hc-n-900">Compras recientes</h2>
      {ficha.compras.content.length === 0
        ? <AvisoCrm>Este negocio no tiene compras.</AvisoCrm>
        : <ComprasLista compras={ficha.compras.content} ocultar={['negocio']} />}
    </section>
  )
}
