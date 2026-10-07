import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { adminBillingService } from '@/services/adminBillingService'
import { paymentService } from '@/services/paymentService'
import { walletService } from '@/services/walletService'
import { consolaService, objetoDe } from './consola'
import { campoLista, filasDe, idSeguro, texto, type Fila } from './normalizar'
import { Aviso, Carga, Chip, Encabezado, FilaDecision, Marco, Metrica, Segmento, TARJETA } from './piezas'

const VISTAS = [
  { id: 'quincena', label: 'Quincena', to: '/plataforma/dinero' },
  { id: 'cobros', label: 'SINPE', to: '/plataforma/dinero/cobros' },
  { id: 'liquidaciones', label: 'Retiros', to: '/plataforma/dinero/liquidaciones' },
  { id: 'suscripciones', label: 'Suscripciones', to: '/plataforma/dinero/suscripciones' },
]

export default function DineroPlataforma() {
  const path = useLocation().pathname
  const navigate = useNavigate()
  const vista = VISTAS.find((v) => v.id !== 'quincena' && path.endsWith(v.id))?.id ?? 'quincena'
  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="Quincena" detalle="Cada quince días: lo que vendió cada tienda, la comisión de HotClick y lo que se le gira. El envío se suma entero. El efectivo del mensajero no se gira otra vez." />
      <Segmento
        opciones={VISTAS.map(({ id, label }) => ({ id, label }))}
        valor={vista}
        onChange={(id) => {
          const destino = VISTAS.find((item) => item.id === id)
          if (destino) navigate(destino.to)
        }}
      />
      {vista === 'quincena' && <Quincena />}
      {vista === 'liquidaciones' && <Liquidaciones />}
      {vista === 'suscripciones' && <Suscripciones />}
      {vista === 'cobros' && <Cobros />}
    </div>
  )
}

function Quincena() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')

  useEffect(() => {
    consolaService.quincena()
      .then((respuesta) => { setFilas(campoLista(objetoDe(respuesta.data), 'lineas')); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [])

  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudo armar la quincena.</Aviso>
  return (
    <Marco
      principal={
        filas.length === 0
          ? <Aviso>En esta quincena no hay ventas pagadas para liquidar. Cuando un pedido se paga, aparece acá el neto que se le gira a la tienda.</Aviso>
          : <ul className="flex flex-col gap-2">{filas.map((fila) => <LineaQuincena key={`${texto(fila.empresaId)}-${texto(fila.dia)}`} fila={fila} />)}</ul>
      }
      lado={
        <section className={TARJETA}>
          <h2 className="font-display text-[17px] font-bold">Para qué sirve</h2>
          <p className="mt-2 text-sm text-hc-n-600">Es el cierre para el banco, no un historial de pedidos. Una línea es un día de una tienda: productos menos la comisión del plan, más el envío. Si el efectivo del mensajero no cuadra, o la cuenta SINPE es de esta misma quincena, ese monto no se gira.</p>
        </section>
      }
    />
  )
}

function LineaQuincena({ fila }: { fila: Fila }) {
  return (
    <li className={TARJETA}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link className="font-semibold text-hc-blue-600" to={`/plataforma/negocios/${texto(fila.empresaId)}`}>{texto(fila.nombre, 'Tienda')}</Link>
        <span className="text-xs text-hc-n-600">{texto(fila.dia, '')}</span>
      </div>
      <p className="mt-2 text-sm">
        Productos {colones(fila.productos)} · comisión {colones(fila.comision)} ({texto(fila.plan, '')} {texto(fila.porcentaje, '')}%) · envío {colones(fila.envio)} · neto {colones(fila.neto)}
      </p>
      <p className="mt-1 text-xs text-hc-n-600">
        Retenido: pasarela {colones(fila.pasarela)} · para operar {colones(fila.operar)} · a girar {colones(fila.aGirar)}
      </p>
      <div className="mt-2 flex flex-wrap gap-1">
        <Chip tono={fila.girado === true ? 'ok' : 'neutro'}>{fila.girado === true ? 'Ya se giró' : 'Sin giro'}</Chip>
        {fila.marcado === true && <Chip tono="alerta">Efectivo no cuadra</Chip>}
        {fila.cuentaNueva === true && <Chip tono="alerta">Cuenta de esta quincena</Chip>}
        {fila.cuentaAprobada !== true && <Chip tono="alerta">Sin cuenta aprobada</Chip>}
      </div>
    </li>
  )
}

function colones(valor: unknown): string {
  const crudo = typeof valor === 'number' ? valor : Number(texto(valor, ''))
  if (!Number.isFinite(crudo)) return '—'
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(crudo)
}

function Cobros() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [marca, setMarca] = useState(0)

  useEffect(() => {
    paymentService.listarComprobantes('PENDIENTE')
      .then((r) => { setFilas(filasDe(r.data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [marca])

  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudieron cargar los cobros.</Aviso>
  if (filas.length === 0) return <Aviso>Nada pendiente.</Aviso>
  return (
    <div className="flex flex-col gap-3">
      <Metrica icono="dinero" etiqueta="Cobros por revisar" valor={String(filas.length)} />
      <div className="grid gap-3 lg:grid-cols-2">
      {filas.map((fila) => {
        const id = idSeguro(fila)
        if (!id) return null
        return (
          <div key={id} className="flex flex-col gap-1">
          <FilaDecision
            icono="dinero"
            titulo={texto(fila.pedidoNumero, texto(fila.id, 'Comprobante'))}
            meta={metaMonto(fila, texto(fila.estado, 'PENDIENTE'))}
            onAprobar={async () => { await paymentService.aprobarComprobante(id); setMarca((n) => n + 1) }}
            onRechazar={async (motivo) => { await paymentService.rechazarComprobante(id, motivo); setMarca((n) => n + 1) }}
          />
          {texto(fila.pedidoId, texto(fila.idPedido, '')) && (
            <Link className="text-sm font-semibold text-hc-blue-600" to={`/plataforma/pedidos/${texto(fila.pedidoId, texto(fila.idPedido))}`}>Abrir el pedido</Link>
          )}
          </div>
        )
      })}
      </div>
    </div>
  )
}

function montoVisible(fila: Fila): string {
  const monto = texto(fila.monto, texto(fila.montoColones, texto(fila.precioMensual, '')))
  return monto ? `₡${monto}` : '—'
}

function metaMonto(fila: Fila, resto: string): string {
  const monto = texto(fila.monto, texto(fila.montoColones, texto(fila.precioMensual, '')))
  return monto ? `₡${monto} · ${resto}` : resto
}

function Liquidaciones() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [marca, setMarca] = useState(0)

  useEffect(() => {
    walletService.adminPendientes()
      .then((r) => { setFilas(filasDe(r.data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [marca])

  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudieron cargar las liquidaciones.</Aviso>
  if (filas.length === 0) return <Aviso>Nada pendiente. Los retiros bajo el umbral se aprueban solos.</Aviso>
  return (
    <div className="flex flex-col gap-3">
      <Metrica icono="dinero" etiqueta="Retiros por revisar" valor={String(filas.length)} />
      <p className="text-sm text-hc-n-600">Solo se aprueba hacia una cuenta ya aprobada. Si se registró en esta quincena, el giro espera.</p>
      <div className="grid gap-3 lg:grid-cols-2">
      {filas.map((fila) => {
        const id = idSeguro(fila)
        if (!id) return null
        return (
          <FilaDecision
            key={id}
            icono="dinero"
            titulo={texto(fila.monto, texto(fila.id, 'Retiro'))}
            meta={metaMonto(fila, texto(fila.estado, 'Pendiente'))}
            onAprobar={async () => { await walletService.adminAprobar(id, 'Aprobado en consola'); setMarca((n) => n + 1) }}
            onRechazar={async (motivo) => { await walletService.adminRechazar(id, motivo); setMarca((n) => n + 1) }}
          />
        )
      })}
      </div>
    </div>
  )
}

function inicial(nombre: string): string {
  return nombre.trim().slice(0, 1).toUpperCase() || 'N'
}

function Suscripciones() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  useEffect(() => {
    adminBillingService.listar()
      .then((r) => { setFilas(filasDe(r.data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [])
  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudieron cargar las suscripciones.</Aviso>
  if (filas.length === 0) return <Aviso>No hay suscripciones para revisar.</Aviso>
  return (
    <div className="overflow-hidden rounded-[14px] border border-hc-n-200 bg-white">
      <div className="flex items-center justify-between border-b border-hc-n-200 bg-hc-n-50 px-4 py-3">
        <h2 className="font-display text-[17px] font-bold">Suscripciones</h2>
        <Chip tono="azul">{`${filas.length} en lista`}</Chip>
      </div>
      <div className="grid grid-cols-[1fr_7rem_6rem] gap-2 px-4 py-2 text-xs font-semibold text-hc-n-600">
        <span>Negocio</span><span>Monto</span><span>Estado</span>
      </div>
      {filas.map((fila) => (
        <div key={idSeguro(fila) ?? texto(fila.nombre)} className="grid grid-cols-[1fr_7rem_6rem] items-center gap-2 border-t border-hc-n-200 px-4 py-3">
          <span className="flex items-center gap-2 font-semibold">
            <span className="grid size-8 place-items-center rounded-lg bg-hc-blue-50 font-display text-xs font-bold text-hc-blue-600">
              {inicial(texto(fila.nombreComercial, texto(fila.nombre, 'N')))}
            </span>
            {texto(fila.nombreComercial, texto(fila.nombre, 'Negocio'))}
          </span>
          <span className="text-sm">{montoVisible(fila)}</span>
          <Chip tono="ok">{texto(fila.estado, texto(fila.plan, 'Activa'))}</Chip>
        </div>
      ))}
    </div>
  )
}
