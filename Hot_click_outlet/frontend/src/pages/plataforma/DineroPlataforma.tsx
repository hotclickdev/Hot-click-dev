import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { adminBillingService } from '@/services/adminBillingService'
import { paymentService } from '@/services/paymentService'
import { walletService } from '@/services/walletService'
import { filasDe, idSeguro, texto, type Fila } from './normalizar'
import { Aviso, Carga, Chip, Encabezado, FilaDecision, Metrica, Segmento } from './piezas'

const VISTAS = [
  { id: 'cobros', label: 'Cobros', to: '/plataforma/dinero/cobros' },
  { id: 'liquidaciones', label: 'Liquidaciones', to: '/plataforma/dinero/liquidaciones' },
  { id: 'suscripciones', label: 'Suscripciones', to: '/plataforma/dinero/suscripciones' },
]

export default function DineroPlataforma() {
  const path = useLocation().pathname
  const navigate = useNavigate()
  const vista = VISTAS.find((v) => path.endsWith(v.id))?.id ?? 'cobros'
  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="Dinero" detalle="Cobros, retiros y la mensualidad." />
      <Segmento
        opciones={VISTAS.map(({ id, label }) => ({ id, label }))}
        valor={vista}
        onChange={(id) => {
          const destino = VISTAS.find((item) => item.id === id)
          if (destino) navigate(destino.to)
        }}
      />
      {vista === 'liquidaciones' && <Liquidaciones />}
      {vista === 'suscripciones' && <Suscripciones />}
      {vista === 'cobros' && <Cobros />}
    </div>
  )
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
          <FilaDecision
            key={id}
            icono="dinero"
            titulo={texto(fila.pedidoNumero, texto(fila.id, 'Comprobante'))}
            meta={metaMonto(fila, texto(fila.estado, 'PENDIENTE'))}
            onAprobar={async () => { await paymentService.aprobarComprobante(id); setMarca((n) => n + 1) }}
            onRechazar={async (motivo) => { await paymentService.rechazarComprobante(id, motivo); setMarca((n) => n + 1) }}
          />
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
