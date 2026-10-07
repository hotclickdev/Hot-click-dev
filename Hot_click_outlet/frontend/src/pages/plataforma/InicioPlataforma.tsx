import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { cifra, GraficaBarras, GraficaFilas } from './graficas'
import { campoLista, idSeguro, texto, type Fila } from './normalizar'
import { consolaService, objetoDe } from './consola'
import { Aviso, Carga } from './piezas'
import { usePulso } from './usePulso'

export default function InicioPlataforma() {
  const [dias, setDias] = useState<7 | 30>(7)
  const pulso = usePulso(dias)
  const serie = [
    { etiqueta: 'Visitas', valor: pulso?.visitas ?? 0 },
    { etiqueta: 'Producto', valor: pulso?.producto ?? 0 },
    { etiqueta: 'Carrito', valor: pulso?.carrito ?? 0 },
    { etiqueta: 'Pago', valor: pulso?.pago ?? 0 },
  ]

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-extrabold leading-8 text-hc-n-900">Inicio</h1>
          <p className="mt-1 text-sm text-hc-n-600">Qué se movió en HotClick y qué pide una decisión.</p>
        </div>
        <div className="flex rounded-xl bg-hc-n-100 p-1">
          {[7, 30].map((opcion) => (
            <button
              key={opcion}
              type="button"
              onClick={() => setDias(opcion as 7 | 30)}
              className={`h-9 rounded-lg px-3 text-sm font-semibold ${dias === opcion ? 'bg-white text-hc-blue-600' : 'text-hc-n-600'}`}
            >
              {opcion} días
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi etiqueta="Visitas" valor={cifra(pulso?.visitas)} nota="Sesiones de la plataforma" />
        <Kpi etiqueta="Vieron un producto" valor={cifra(pulso?.producto)} nota="No es la visita de un producto" />
        <Kpi etiqueta="Pedidos pendientes" valor={cifra(pulso?.pedidos)} nota="Pagados o por confirmar" tono="rojo" />
        <Kpi etiqueta="Negocios en marcha" valor={cifra(pulso?.activos)} nota={`${cifra(pulso?.revision)} en revisión`} tono="verde" />
      </div>

      <Reloj />

      <div className="grid items-stretch gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(280px,0.8fr)]">
        <GraficaBarras
          titulo="Embudo del periodo"
          detalle={`Sesiones en ${dias} días. El eje es el paso. El valor es la cantidad de sesiones.`}
          serie={serie}
        />
        <GraficaFilas
          titulo="Dónde se cae"
          detalle="Misma fuente que las barras, para ver el salto entre pasos."
          serie={[
            { etiqueta: 'Visitas', valor: pulso?.visitas ?? 0 },
            { etiqueta: 'Producto', valor: pulso?.producto ?? 0, tono: 'azul' },
            { etiqueta: 'Carrito', valor: pulso?.carrito ?? 0, tono: 'rojo' },
            { etiqueta: 'Pedidos pagados', valor: pulso?.pago ?? 0, tono: 'verde' },
          ]}
        />
      </div>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(260px,0.7fr)]">
        <section className="overflow-hidden rounded-[14px] border border-hc-n-200 bg-white">
          <div className="flex items-center justify-between border-b border-hc-n-200 px-4 py-3">
            <h2 className="font-display text-[17px] font-bold">Tiendas</h2>
            <Link to="/plataforma/negocios" className="text-sm font-semibold text-hc-blue-600">Ver todas</Link>
          </div>
          <div className="grid grid-cols-[1.4fr_0.6fr_0.7fr] gap-2 bg-hc-n-50 px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-hc-n-600">
            <span>Negocio</span><span>Plan</span><span>Estado</span>
          </div>
          <ul>
            {(pulso?.tiendas ?? []).slice(0, 6).map((fila) => {
              const id = idSeguro(fila)
              if (!id) return null
              return (
                <li key={id} className="grid grid-cols-[1.4fr_0.6fr_0.7fr] items-center gap-2 border-t border-hc-n-200 px-4 py-3">
                  <Link to={`/plataforma/negocios/${id}`} className="truncate font-semibold">{texto(fila.nombreComercial, texto(fila.nombreEmpresa, 'Negocio'))}</Link>
                  <span className="text-sm text-hc-n-600">{texto(fila.plan, texto(fila.planSaas, '—'))}</span>
                  <span className="text-sm font-semibold text-hc-blue-600">{texto(fila.estadoEmpresa, '—')}</span>
                </li>
              )
            })}
            {pulso && pulso.tiendas.length === 0 && <li className="px-4 py-6 text-sm text-hc-n-600">Todavía no hay tiendas en esta lista.</li>}
          </ul>
        </section>
        <section className="rounded-[14px] border border-hc-n-200 bg-white p-4">
          <h2 className="font-display text-[17px] font-bold">Para decidir hoy</h2>
          <ul className="mt-3 flex flex-col gap-2">
            <Dato etiqueta="En revisión" valor={cifra(pulso?.revision)} />
            <Dato etiqueta="Suspendidos" valor={cifra(pulso?.suspendidos)} />
            <Dato etiqueta="Alertas abiertas" valor={cifra(pulso?.alertas)} />
          </ul>
          <h3 className="mt-5 font-display text-sm font-bold">Movimiento</h3>
          <ul className="mt-2 flex flex-col gap-2">
            {(pulso?.actividad ?? []).map((linea) => (
              <li key={linea} className="rounded-xl bg-hc-n-50 px-3 py-2 text-sm">{linea}</li>
            ))}
            {pulso && pulso.actividad.length === 0 && <li className="text-sm text-hc-n-600">Sin movimientos recientes.</li>}
          </ul>
        </section>
      </div>
    </div>
  )
}

function Kpi({ etiqueta, valor, nota, tono = 'azul' }: { etiqueta: string; valor: string; nota: string; tono?: 'azul' | 'rojo' | 'verde' }) {
  const barra = tono === 'rojo' ? 'bg-hc-primary' : tono === 'verde' ? 'bg-hc-success' : 'bg-hc-blue-600'
  return (
    <section className="rounded-[14px] border border-hc-n-200 bg-white p-4">
      <span className={`mb-3 block h-1 w-10 rounded-full ${barra}`} />
      <p className="text-xs font-semibold uppercase tracking-wide text-hc-n-600">{etiqueta}</p>
      <p className="mt-1 font-display text-[28px] font-extrabold leading-8">{valor}</p>
      <p className="mt-1 text-xs text-hc-n-600">{nota}</p>
    </section>
  )
}

function Dato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <li className="flex items-center justify-between rounded-xl bg-hc-n-50 px-3 py-2">
      <span className="text-sm text-hc-n-600">{etiqueta}</span>
      <span className="font-display text-lg font-bold">{valor}</span>
    </li>
  )
}

function Reloj() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  useEffect(() => {
    consolaService.reloj()
      .then((respuesta) => { setFilas(campoLista(objetoDe(respuesta.data), 'filas')); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [])
  return (
    <section className="rounded-[14px] border border-hc-n-200 bg-white p-4">
      <h2 className="font-display text-[17px] font-bold">Reloj</h2>
      <p className="mt-1 text-xs text-hc-n-600">Pedido pagado sin movimiento desde hace un día hábil.</p>
      {estado === 'carga' && <Carga />}
      {estado === 'error' && <Aviso>No se pudo leer el reloj.</Aviso>}
      {estado === 'listo' && filas.length === 0 && <p className="mt-3 text-sm text-hc-n-600">Nada vencido.</p>}
      <ul className="mt-3 flex flex-col gap-2">
        {filas.map((fila) => (
          <li key={texto(fila.id)}>
            <Link className="text-sm font-semibold text-hc-blue-600" to={`/plataforma/pedidos/${texto(fila.id)}`}>
              {texto(fila.numero, 'Pedido')} · {texto(fila.empresaNombre, 'Tienda')} · {texto(fila.fecha, '')}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
