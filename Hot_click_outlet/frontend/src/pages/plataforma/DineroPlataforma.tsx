import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { adminBillingService } from '@/services/adminBillingService'
import { paymentService } from '@/services/paymentService'
import { walletService } from '@/services/walletService'
import { filasDe, idSeguro, texto, type Fila } from './normalizar'
import { Aviso, Carga, FilaDecision, Segmento, TARJETA } from './piezas'

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
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-[22px] font-bold text-hc-n-900">Dinero</h1>
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
      {filas.map((fila) => {
        const id = idSeguro(fila)
        if (!id) return null
        return (
          <FilaDecision
            key={id}
            titulo={texto(fila.pedidoNumero, texto(fila.id, 'Comprobante'))}
            meta={texto(fila.estado, 'PENDIENTE')}
            onAprobar={async () => { await paymentService.aprobarComprobante(id); setMarca((n) => n + 1) }}
            onRechazar={async (motivo) => { await paymentService.rechazarComprobante(id, motivo); setMarca((n) => n + 1) }}
          />
        )
      })}
    </div>
  )
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
      {filas.map((fila) => {
        const id = idSeguro(fila)
        if (!id) return null
        return (
          <FilaDecision
            key={id}
            titulo={texto(fila.monto, texto(fila.id, 'Retiro'))}
            meta={texto(fila.estado, 'Pendiente')}
            onAprobar={async () => { await walletService.adminAprobar(id, 'Aprobado en consola'); setMarca((n) => n + 1) }}
            onRechazar={async (motivo) => { await walletService.adminRechazar(id, motivo); setMarca((n) => n + 1) }}
          />
        )
      })}
    </div>
  )
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
    <ul className="flex flex-col gap-3">
      {filas.map((fila) => (
        <li key={idSeguro(fila) ?? texto(fila.nombre)} className={TARJETA}>
          <p className="font-semibold">{texto(fila.nombreComercial, texto(fila.nombre, 'Negocio'))}</p>
          <p className="text-xs text-hc-n-600">{texto(fila.estado, texto(fila.plan, '—'))}</p>
        </li>
      ))}
    </ul>
  )
}
