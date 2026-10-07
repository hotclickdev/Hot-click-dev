import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { orderService } from '@/services/orderService'
import { cifra, GraficaBarras, GraficaFilas } from './graficas'
import { filasDe, texto, type Fila } from './normalizar'
import { usePulso } from './usePulso'

/** Pedidos de toda la plataforma, con el ritmo del día al lado. */
export default function PedidosPlataforma() {
  const pulso = usePulso(7)
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')

  useEffect(() => {
    orderService.getPending()
      .then((respuesta) => { setFilas(filasDe(respuesta.data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [])

  const porEstado = useMemo(() => contarPor(filas, 'estadoPedido', 'estado'), [filas])

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-[28px] font-extrabold leading-8">Pedidos</h1>
        <p className="mt-1 text-sm text-hc-n-600">Lo que está por moverse, y cómo viene la semana.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <Resumen etiqueta="En cola" valor={cifra(filas.length)} />
        <Resumen etiqueta="Pagados en 7 días" valor={cifra(pulso?.pago)} />
        <Resumen etiqueta="Llegaron al carrito" valor={cifra(pulso?.carrito)} />
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.7fr)]">
        <section className="overflow-hidden rounded-[14px] border border-hc-n-200 bg-white">
          <div className="border-b border-hc-n-200 px-4 py-3">
            <h2 className="font-display text-[17px] font-bold">Cola</h2>
          </div>
          {estado === 'error' && <p className="px-4 py-6 text-sm text-hc-primary-text">No se pudo cargar la cola.</p>}
          {estado === 'listo' && filas.length === 0 && <p className="px-4 py-8 text-sm text-hc-n-600">No hay pedidos pendientes.</p>}
          <ul>
            {filas.slice(0, 12).map((fila, indice) => (
              <li key={texto(fila.id, String(indice))} className="grid gap-1 border-t border-hc-n-200 px-4 py-3 sm:grid-cols-[1fr_8rem_7rem]">
                <div>
                  <Link className="font-semibold text-hc-blue-600" to={`/plataforma/pedidos/${texto(fila.id, '')}`}>{texto(fila.cliente, texto(fila.nombreCliente, `Pedido ${texto(fila.id, '')}`))}</Link>
                  <p className="text-xs text-hc-n-600">{texto(fila.fechaPedido, texto(fila.fecha, 'Sin hora'))}</p>
                </div>
                <p className="text-sm font-semibold text-hc-blue-600">{texto(fila.estadoPedido, texto(fila.estado, '—'))}</p>
                <p className="text-sm">{texto(fila.totalPedido, texto(fila.total, ''))}</p>
              </li>
            ))}
          </ul>
        </section>
        <div className="flex flex-col gap-4">
          <GraficaFilas
            titulo="Por estado"
            detalle="Cuántos pedidos de la cola están en cada estado."
            serie={porEstado.length > 0 ? porEstado : [{ etiqueta: 'Sin cola', valor: 0 }]}
          />
          <GraficaBarras
            titulo="La semana"
            detalle="Sesiones que avanzaron. Fuente: embudo de 7 días."
            serie={[
              { etiqueta: 'Visita', valor: pulso?.visitas ?? 0 },
              { etiqueta: 'Prod.', valor: pulso?.producto ?? 0 },
              { etiqueta: 'Carr.', valor: pulso?.carrito ?? 0 },
              { etiqueta: 'Pago', valor: pulso?.pago ?? 0 },
            ]}
          />
          <Link to="/plataforma/control" className="text-sm font-semibold text-hc-blue-600">Ver días y horas en Control</Link>
        </div>
      </div>
    </div>
  )
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <section className="rounded-[14px] border border-hc-n-200 bg-white p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-hc-n-600">{etiqueta}</p>
      <p className="mt-1 font-display text-[28px] font-extrabold leading-8">{valor}</p>
    </section>
  )
}

function contarPor(filas: Fila[], ...campos: string[]) {
  const mapa = new Map<string, number>()
  for (const fila of filas) {
    const crudo = campos.map((campo) => texto(fila[campo])).find(Boolean) || 'Sin estado'
    mapa.set(crudo, (mapa.get(crudo) ?? 0) + 1)
  }
  return [...mapa.entries()].map(([etiqueta, valor]) => ({ etiqueta, valor }))
}
