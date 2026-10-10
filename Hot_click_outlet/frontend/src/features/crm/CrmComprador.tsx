import { useParams } from 'react-router-dom'
import { useOne } from '@refinedev/core'
import type { FichaComprador } from './crmDatos'
import { fechaOGuion, montoOGuion, numeroOGuion, textoOGuion } from './crmDatos'
import ComprasLista from './ComprasLista'
import { AvisoCrm, CargaCrm } from './Estados'
import { Card, Kpi } from './ui/Card'

/** Fase 1: ficha del comprador. Contacto enmascarado por el backend; ver la ficha queda auditado. */
export default function CrmComprador() {
  const { id = '' } = useParams()
  const { result: ficha, query } = useOne<FichaComprador>({ resource: 'compradores', id, queryOptions: { enabled: !!id } })

  if (query.isLoading) return <CargaCrm />
  if (query.isError || !ficha) return <AvisoCrm>No se pudo abrir la ficha del comprador.</AvisoCrm>

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold text-hc-n-600">Comprador</p>
        <h1 className="font-display text-[28px] font-extrabold leading-8 text-hc-n-900">{textoOGuion(ficha.nombre)}</h1>
      </div>
      <Card className="grid gap-2 text-sm sm:grid-cols-3">
        <p><span className="block text-xs text-hc-n-600">Correo</span>{textoOGuion(ficha.correo)}</p>
        <p><span className="block text-xs text-hc-n-600">Teléfono</span>{textoOGuion(ficha.telefono)}</p>
        <p><span className="block text-xs text-hc-n-600">Cliente desde</span>{fechaOGuion(ficha.fechaRegistro)}</p>
      </Card>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi etiqueta="Pedidos" valor={numeroOGuion(ficha.resumen.pedidos)} />
        <Kpi etiqueta="Pedidos pagados" valor={numeroOGuion(ficha.resumen.pedidosPagados)} />
        <Kpi etiqueta="Total pagado" valor={montoOGuion(ficha.resumen.totalPagado)} />
        <Kpi etiqueta="Última compra" valor={fechaOGuion(ficha.resumen.ultimaCompra)} />
      </div>
      <h2 className="font-display text-[17px] font-bold text-hc-n-900">Compras recientes</h2>
      {ficha.compras.content.length === 0
        ? <AvisoCrm>Este comprador no tiene compras.</AvisoCrm>
        : <ComprasLista compras={ficha.compras.content} ocultar={['comprador']} />}
    </section>
  )
}
