import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { solicitudCambioPlanService, solicitudesDe, type SolicitudCambioPlanAdmin } from '@/features/billing/solicitudCambioPlan'
import { Aviso, BOTON_SECUNDARIO, Carga, Chip, TARJETA } from './piezas'

function fecha(valor?: string | null): string {
  return valor ? valor.replace('T', ' ').slice(0, 16) : '—'
}

/** Admin: solicitudes de bajar de plan (pyme, plan actual, pedido, motivo, fecha) y «Marcar revisada». */
export default function CambiosPlanPlataforma() {
  const [filas, setFilas] = useState<SolicitudCambioPlanAdmin[] | null>(null)
  const [error, setError] = useState(false)
  const [ocupado, setOcupado] = useState<number | null>(null)
  const [fallo, setFallo] = useState<string | null>(null)

  const cargar = useCallback(() => {
    solicitudCambioPlanService.listar()
      .then((r) => { setFilas(solicitudesDe(r.data)); setError(false) })
      .catch(() => setError(true))
  }, [])
  useEffect(() => { cargar() }, [cargar])

  const revisar = async (id: number) => {
    setOcupado(id)
    setFallo(null)
    try {
      await solicitudCambioPlanService.revisar(id)
      cargar()
    } catch {
      setFallo('No se pudo marcar como revisada. Probá de nuevo.')
    } finally {
      setOcupado(null)
    }
  }

  if (error) return <Aviso>No se pudieron cargar las solicitudes de cambio de plan.</Aviso>
  if (!filas) return <Carga />
  if (filas.length === 0) return <Aviso>No hay solicitudes de cambio de plan.</Aviso>
  return (
    <section className={TARJETA}>
      <h2 className="font-display text-[17px] font-bold">Solicitudes de cambio de plan</h2>
      {fallo ? <p role="alert" className="mt-2 text-sm text-red-600">{fallo}</p> : null}
      <ul className="mt-2 flex flex-col gap-3">
        {filas.map((s) => (
          <li key={s.id} className="flex flex-col gap-1 border-t border-hc-n-200 pt-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Link className="font-semibold text-hc-blue-600" to={`/plataforma/negocios/${s.empresaId}`}>
                {s.nombreEmpresa ?? `#${s.empresaId}`}
              </Link>
              <Chip tono={s.revisada ? 'ok' : 'azul'}>{s.revisada ? 'Revisada' : 'Pendiente'}</Chip>
            </div>
            <p className="text-sm">{s.planActual} → {s.planSolicitado} · {fecha(s.fechaSolicitud)}</p>
            <p className="text-sm text-hc-n-600">{s.motivo}</p>
            {s.revisada ? (
              <p className="text-xs text-hc-n-600">Revisada por #{s.revisadaPor ?? '—'} el {fecha(s.fechaRevision)}</p>
            ) : (
              <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado === s.id} onClick={() => revisar(s.id)}>
                {ocupado === s.id ? 'Guardando…' : 'Marcar revisada'}
              </button>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
