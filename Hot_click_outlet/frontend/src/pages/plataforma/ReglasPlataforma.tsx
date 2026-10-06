import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { billingService } from '@/services/billingService'
import { adminService } from '@/services/orderService'
import { flagService } from '@/services/flagService'
import { filasDe, texto, type Fila } from './normalizar'
import { Aviso, Carga, Segmento, TARJETA } from './piezas'

type CargaEstado = 'carga' | 'listo' | 'error'

export default function ReglasPlataforma() {
  const [vista, setVista] = useState<'planes' | 'accesos' | 'tecnico'>('planes')
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-[22px] font-bold text-hc-n-900">Plataforma</h1>
      <Segmento
        opciones={[{ id: 'planes', label: 'Planes' }, { id: 'accesos', label: 'Accesos' }, { id: 'tecnico', label: 'Técnico' }]}
        valor={vista}
        onChange={(id) => setVista(id as 'planes' | 'accesos' | 'tecnico')}
      />
      {vista === 'planes' && <Planes />}
      {vista === 'accesos' && <Accesos />}
      {vista === 'tecnico' && <Tecnico />}
      <p className="text-xs text-hc-n-600">
        La comisión del plan no se edita desde Dinero. <Link to="/plataforma/negocios" className="font-semibold text-hc-blue-600">Ver negocios</Link>
      </p>
    </div>
  )
}

function Planes() {
  const { filas, estado } = useLista(billingService.getPlanes)
  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudieron cargar los planes.</Aviso>
  return (
    <ul className="flex flex-col gap-3">
      {filas.map((fila) => (
        <li key={texto(fila.nombre, texto(fila.id, 'plan'))} className={TARJETA}>
          <p className="font-display text-[17px] font-bold">{texto(fila.nombre, 'Plan')}</p>
          <p className="text-xs text-hc-n-600">
            Comisión {texto(fila.comisionPorcentaje, texto(fila.comision, '—'))} · mensualidad {texto(fila.precioMensual, texto(fila.precio, '—'))}
          </p>
        </li>
      ))}
    </ul>
  )
}

function Accesos() {
  const { filas, estado } = useLista(adminService.getUsers)
  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudieron cargar los accesos.</Aviso>
  const staff = filas.filter((fila) => JSON.stringify(fila.roles ?? fila.rol ?? '').includes('ADMIN'))
  return (
    <ul className="flex flex-col gap-3">
      {(staff.length > 0 ? staff : filas.slice(0, 20)).map((fila) => (
        <li key={texto(fila.correo, texto(fila.id, 'user'))} className={TARJETA}>
          <p className="font-semibold">{texto(fila.nombre, 'Usuario')}</p>
          <p className="text-xs text-hc-n-600">{texto(fila.correo, '')}</p>
        </li>
      ))}
    </ul>
  )
}

function Tecnico() {
  const { filas, estado } = useLista(flagService.list)
  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudieron cargar los interruptores.</Aviso>
  if (filas.length === 0) return <Aviso>No hay interruptores en la lista.</Aviso>
  return (
    <ul className="flex flex-col gap-3">
      {filas.map((fila) => (
        <li key={texto(fila.nombre, texto(fila.flag, texto(fila.id, 'flag')))} className={TARJETA}>
          <p className="font-semibold">{texto(fila.nombre, texto(fila.flag, 'Interruptor'))}</p>
          <p className="text-xs text-hc-n-600">{fila.activo === true || fila.on === true ? 'Encendido' : 'Apagado'}</p>
        </li>
      ))}
    </ul>
  )
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
