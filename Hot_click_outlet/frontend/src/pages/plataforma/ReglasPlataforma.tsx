import { useEffect, useState } from 'react'
import { billingService } from '@/services/billingService'
import { adminService } from '@/services/orderService'
import { flagService } from '@/services/flagService'
import { filasDe, texto, type Fila } from './normalizar'
import { Aviso, Carga, Chip, Encabezado, MarcoIcono, Segmento, TARJETA } from './piezas'

type CargaEstado = 'carga' | 'listo' | 'error'

export default function ReglasPlataforma() {
  const [vista, setVista] = useState<'planes' | 'accesos' | 'tecnico'>('planes')
  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="Reglas" detalle="Planes, operadores e interruptores." />
      <Segmento
        opciones={[{ id: 'planes', label: 'Planes' }, { id: 'accesos', label: 'Accesos' }, { id: 'tecnico', label: 'Técnico' }]}
        valor={vista}
        onChange={(id) => setVista(id as 'planes' | 'accesos' | 'tecnico')}
      />
      {vista === 'planes' && <Planes />}
      {vista === 'accesos' && <Accesos />}
      {vista === 'tecnico' && <Tecnico />}
      <p className="text-xs text-hc-n-600">La comisión del plan se lee aquí. Dinero no la edita.</p>
    </div>
  )
}

function Planes() {
  const { filas, estado } = useLista(billingService.getPlanes)
  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudieron cargar los planes.</Aviso>
  return (
    <div className="flex flex-col gap-3">
    <div className="flex items-end justify-between rounded-[16px] bg-hc-blue-50 px-5 py-4">
      <h2 className="font-display text-[17px] font-bold">Planes publicados</h2>
      <p className="font-display text-[40px] font-extrabold leading-none text-hc-blue-600">{filas.length}</p>
    </div>
    <ul className="grid gap-3 sm:grid-cols-3">
      {filas.map((fila) => (
        <li key={texto(fila.nombre, texto(fila.id, 'plan'))} className={TARJETA}>
          <MarcoIcono id="reglas" />
          <p className="mt-3 font-display text-[17px] font-bold">{texto(fila.nombre, 'Plan')}</p>
          <p className="mt-2 font-display text-[26px] font-extrabold leading-none">{porcentaje(fila.comisionPorcentaje ?? fila.comision)}</p>
          <p className="mt-1 text-xs text-hc-n-600">Comisión · mensualidad {plata(fila.precioMensual ?? fila.precio)}</p>
        </li>
      ))}
    </ul>
    </div>
  )
}

function Accesos() {
  const { filas, estado } = useLista(adminService.getOperadores)
  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudieron cargar los accesos.</Aviso>
  if (filas.length === 0) return <Aviso>No hay operadores de plataforma.</Aviso>
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {filas.map((fila) => {
        const nombre = texto(fila.nombre, 'Operador')
        return (
          <li key={texto(fila.id, texto(fila.correo, 'user'))} className={`${TARJETA} flex items-center gap-3`}>
            <span className="grid size-11 place-items-center rounded-xl bg-hc-blue-50 font-display text-sm font-bold text-hc-blue-600">
              {nombre.trim().slice(0, 1).toUpperCase()}
            </span>
            <span>
              <span className="block font-semibold">{nombre}</span>
              <span className="text-xs text-hc-n-600">{texto(fila.correo, '')}</span>
            </span>
            <Chip tono="azul">{texto(fila.rol, 'ADMIN')}</Chip>
          </li>
        )
      })}
    </ul>
  )
}

function Tecnico() {
  const { filas, estado } = useLista(flagService.list)
  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudieron cargar los interruptores.</Aviso>
  if (filas.length === 0) return <Aviso>No hay interruptores en la lista.</Aviso>
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {filas.map((fila) => {
        const activo = fila.activo === true || fila.on === true
        return (
          <li key={texto(fila.nombre, texto(fila.flag, texto(fila.id, 'flag')))} className={`${TARJETA} flex items-center justify-between gap-3`}>
            <p className="font-semibold">{texto(fila.nombre, texto(fila.flag, 'Interruptor'))}</p>
            <Chip tono={activo ? 'ok' : 'neutro'}>{activo ? 'Encendido' : 'Apagado'}</Chip>
          </li>
        )
      })}
    </ul>
  )
}

function porcentaje(valor: unknown): string {
  const crudo = texto(valor, '')
  if (!crudo) return '—'
  return crudo.includes('%') ? crudo : `${crudo}%`
}

function plata(valor: unknown): string {
  const n = typeof valor === 'number' ? valor : Number(texto(valor, ''))
  if (!texto(valor, '') || !Number.isFinite(n)) return '—'
  return new Intl.NumberFormat('es-CR', { style: 'currency', currency: 'CRC', maximumFractionDigits: 0 }).format(n)
}

function useLista(cargar: () => Promise<{ data: unknown }>) {
  const [filas, setFilas] = useState<Fila[]>([])
  const [estado, setEstado] = useState<CargaEstado>('carga')
  useEffect(() => {
    cargar()
      .then((r) => { setFilas(filasDe(r.data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [cargar])
  return { filas, estado }
}
