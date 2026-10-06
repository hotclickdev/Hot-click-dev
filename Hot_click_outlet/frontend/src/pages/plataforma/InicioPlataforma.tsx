import { useEffect, useState } from 'react'
import { auditoriaAdminService } from '@/services/auditoriaAdminService'
import { embudoService } from '@/services/embudoService'
import { adminService, orderService } from '@/services/orderService'
import { securityService } from '@/services/securityService'
import { filasDe, texto, type Fila } from './normalizar'
import { Aviso, Encabezado, MarcoIcono, Metrica, Segmento, TARJETA } from './piezas'

type Pulso = {
  visitas: number | null
  producto: number | null
  carrito: number | null
  pago: number | null
  pedidos: number | null
  alertas: number | null
  activos: number | null
  revision: number | null
  suspendidos: number | null
  actividad: string[]
}

export default function InicioPlataforma() {
  const [dias, setDias] = useState<7 | 30>(7)
  const [pulso, setPulso] = useState<Pulso | null>(null)

  useEffect(() => {
    void armarPulso(dias).then(setPulso)
  }, [dias])

  return (
    <div className="flex flex-col gap-4">
      <Encabezado
        titulo="Estadísticas"
        detalle="Vistas y movimiento de la plataforma. Esta pantalla no abre otra sección."
        marca={cifra(pulso?.visitas)}
      />
      <Segmento
        opciones={[{ id: '7', label: '7 días' }, { id: '30', label: '30 días' }]}
        valor={String(dias)}
        onChange={(id) => setDias(id === '30' ? 30 : 7)}
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Metrica icono="inicio" etiqueta="Visitas" valor={cifra(pulso?.visitas)} />
        <Metrica icono="negocios" etiqueta="Vieron un producto" valor={cifra(pulso?.producto)} />
        <Metrica icono="dinero" etiqueta="Llegaron al pago" valor={cifra(pulso?.pago)} />
        <Metrica icono="operacion" etiqueta="Pedidos pendientes" valor={cifra(pulso?.pedidos)} />
      </div>
      <div className="grid items-start gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(200px,0.72fr)]">
        <Embudo pulso={pulso} dias={dias} />
        <div className="flex flex-col gap-3">
          <Metrica icono="seguridad" etiqueta="Alertas abiertas" valor={cifra(pulso?.alertas)} />
          <Metrica icono="negocios" etiqueta="Negocios activos" valor={cifra(pulso?.activos)} />
          <Metrica icono="moderacion" etiqueta="En revisión" valor={cifra(pulso?.revision)} />
          <Metrica icono="reglas" etiqueta="Suspendidos" valor={cifra(pulso?.suspendidos)} />
        </div>
      </div>
      <Actividad lineas={pulso?.actividad ?? []} lista={pulso != null} />
      {pulso && pulso.visitas == null && pulso.pedidos == null && (
        <Aviso>Algún conteo no cargó. Los que sí llegaron están arriba.</Aviso>
      )}
    </div>
  )
}

function Embudo({ pulso, dias }: { pulso: Pulso | null; dias: 7 | 30 }) {
  const maximo = Math.max(tope(pulso), 1)
  const pasos = [
    { id: 'visitas', etiqueta: 'Visitas', valor: pulso?.visitas },
    { id: 'producto', etiqueta: 'Producto', valor: pulso?.producto },
    { id: 'carrito', etiqueta: 'Carrito', valor: pulso?.carrito },
    { id: 'pago', etiqueta: 'Pago', valor: pulso?.pago },
  ]
  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">Embudo de {dias} días</h2>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {pasos.map((paso) => (
          <Paso key={paso.id} etiqueta={paso.etiqueta} valor={paso.valor} maximo={maximo} />
        ))}
      </div>
    </section>
  )
}

function Paso({ etiqueta, valor, maximo }: { etiqueta: string; valor: number | null | undefined; maximo: number }) {
  const alto = valor == null ? 8 : Math.max(8, Math.round((valor / maximo) * 100))
  return (
    <article className="rounded-xl bg-hc-n-50 p-3">
      <p className="text-xs font-semibold text-hc-n-600">{etiqueta}</p>
      <p className="mt-1 font-display text-[22px] font-extrabold leading-none">{cifra(valor)}</p>
      <div className="mt-3 flex h-16 items-end rounded-lg bg-hc-n-100">
        <div className="w-full rounded-lg bg-hc-blue-600" style={{ height: `${alto}%` }} />
      </div>
    </article>
  )
}

function Actividad({ lineas, lista }: { lineas: string[]; lista: boolean }) {
  return (
    <section className={TARJETA}>
      <div className="flex items-center gap-3">
        <MarcoIcono id="seguridad" />
        <h2 className="font-display text-[17px] font-bold">Movimiento</h2>
      </div>
      {lista && lineas.length === 0 && <p className="mt-3 text-sm text-hc-n-600">Sin movimientos recientes.</p>}
      <ul className="mt-3 flex flex-col gap-2">
        {lineas.map((linea, indice) => (
          <li key={`${indice}-${linea}`} className="flex items-start gap-3 rounded-xl bg-hc-n-50 px-3 py-2 text-sm">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-hc-blue-600" />
            {linea}
          </li>
        ))}
      </ul>
    </section>
  )
}

function cifra(valor: number | null | undefined): string {
  if (valor == null) return '—'
  return new Intl.NumberFormat('es-CR').format(valor)
}

function tope(pulso: Pulso | null): number {
  if (!pulso) return 0
  return Math.max(pulso.visitas ?? 0, pulso.producto ?? 0, pulso.carrito ?? 0, pulso.pago ?? 0)
}

async function armarPulso(dias: 7 | 30): Promise<Pulso> {
  const [embudo, pedidos, alertas, empresas, auditoria, eventos] = await Promise.allSettled([
    embudoService.resumen(dias),
    orderService.getPending(),
    securityService.getAlerts(false),
    adminService.getEmpresas({ page: 0, size: 200 }),
    auditoriaAdminService.listar({ page: 0, size: 8 }),
    securityService.getEvents({ page: 0, size: 8, period: dias === 30 ? '30d' : '7d' }),
  ])
  const emb = embudo.status === 'fulfilled' ? embudo.value : null
  const tiendas = empresas.status === 'fulfilled' ? filasDe(empresas.value.data) : []
  return {
    visitas: entero(emb, 'visita'),
    producto: entero(emb, 'producto'),
    carrito: entero(emb, 'carrito'),
    pago: entero(emb, 'pedidosPagados'),
    pedidos: pedidos.status === 'fulfilled' ? filasDe(pedidos.value.data).length : null,
    alertas: alertas.status === 'fulfilled' ? filasDe(alertas.value.data).length : null,
    activos: empresas.status === 'fulfilled' ? contarEstado(tiendas, 'ACTIVO') : null,
    revision: empresas.status === 'fulfilled' ? contarEstado(tiendas, 'PENDIENTE_APROBACION') : null,
    suspendidos: empresas.status === 'fulfilled' ? tiendas.filter((f) => ['SUSPENDIDO', 'INACTIVO', 'RECHAZADO'].includes(texto(f.estadoEmpresa).toUpperCase())).length : null,
    actividad: actividadDe(auditoria, eventos),
  }
}

function entero(data: unknown, campo: string): number | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const valor = (data as Record<string, unknown>)[campo]
  return typeof valor === 'number' && Number.isFinite(valor) ? valor : null
}

function contarEstado(filas: Fila[], estado: string): number {
  return filas.filter((fila) => texto(fila.estadoEmpresa).toUpperCase() === estado).length
}

function actividadDe(
  auditoria: PromiseSettledResult<{ data: unknown }>,
  eventos: PromiseSettledResult<{ data: unknown }>,
): string[] {
  const decisiones = auditoria.status === 'fulfilled'
    ? filasDe(auditoria.value.data).map(lineaAuditoria)
    : []
  const accesos = eventos.status === 'fulfilled'
    ? filasDe(eventos.value.data).map(lineaEvento)
    : []
  return [...decisiones, ...accesos].filter(Boolean).slice(0, 12)
}

function lineaAuditoria(fila: Fila): string {
  const quien = texto(fila.adminEmail, 'Operador')
  const que = texto(fila.detalle, texto(fila.accion, 'Decisión'))
  return `${quien} · ${que}`
}

function lineaEvento(fila: Fila): string {
  return texto(fila.message, texto(fila.descripcion, texto(fila.eventType, texto(fila.tipo, ''))))
}
