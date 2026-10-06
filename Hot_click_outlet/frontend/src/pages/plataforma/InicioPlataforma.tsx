import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { adminBillingService } from '@/services/adminBillingService'
import { moderacionService, type ModeracionResumen } from '@/services/moderacionService'
import { securityService } from '@/services/securityService'
import { campoLista, contarAtrasadas, filasDe } from './normalizar'
import { Aviso, Carga, TARJETA, TITULO } from './piezas'

type Tarjeta = { titulo: string; detalle: string; to: string; cuenta: number | null; fallo: boolean }

export default function InicioPlataforma() {
  const [resumen, setResumen] = useState<ModeracionResumen | null>(null)
  const [alertas, setAlertas] = useState<number | null>(null)
  const [atrasadas, setAtrasadas] = useState<number | null>(null)
  const [fallos, setFallos] = useState<Record<string, boolean>>({})

  useEffect(() => {
    moderacionService.resumen()
      .then(setResumen)
      .catch((err: unknown) => { console.error(err); setFallos((f) => ({ ...f, moderacion: true })) })
    securityService.getAlerts(false)
      .then((r) => setAlertas(filasDe(r.data).length))
      .catch((err: unknown) => { console.error(err); setFallos((f) => ({ ...f, seguridad: true })) })
    adminBillingService.listar()
      .then((r) => setAtrasadas(contarAtrasadas(campoLista(r.data, 'content'))))
      .catch((err: unknown) => { console.error(err); setFallos((f) => ({ ...f, dinero: true })) })
  }, [])

  if (!resumen && !fallos.moderacion) return <Carga />

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <header>
        <h1 className="font-display text-[22px] font-bold leading-7 text-hc-n-900">Consola de plataforma</h1>
        <p className="mt-1 text-sm text-hc-n-600">Solo lo que pide una decisión hoy.</p>
      </header>
      <div className="grid gap-3 sm:grid-cols-2">
        {tarjetas(resumen, alertas, atrasadas, fallos).map((tarjeta) => (
          <Link key={tarjeta.to + tarjeta.titulo} to={tarjeta.to} className={TARJETA}>
            <h2 className={TITULO}>{tarjeta.titulo}</h2>
            <p className="mt-1 text-sm text-hc-n-600">{tarjeta.detalle}</p>
            <p className="mt-3 font-display text-[26px] font-extrabold text-hc-n-900">
              {tarjeta.fallo ? '—' : textoCuenta(tarjeta.cuenta)}
            </p>
            {tarjeta.fallo && <p className="mt-1 text-xs text-hc-primary-text">Esta cola no cargó. Las otras siguen disponibles.</p>}
          </Link>
        ))}
      </div>
      {resumen?.total === 0 && alertas === 0 && atrasadas === 0 && <Aviso>Nada pendiente.</Aviso>}
    </div>
  )
}

function textoCuenta(cuenta: number | null): string {
  return cuenta == null ? '…' : String(cuenta)
}

function tarjetas(
  resumen: ModeracionResumen | null,
  alertas: number | null,
  atrasadas: number | null,
  fallos: Record<string, boolean>,
): Tarjeta[] {
  return [
    { titulo: 'Negocios por admitir', detalle: 'Publicar o rechazar el alta', to: '/plataforma/moderacion', cuenta: resumen?.empresas ?? null, fallo: !!fallos.moderacion },
    { titulo: 'Catálogo en revisión', detalle: 'Ofertas, cobro y testimonios', to: '/plataforma/moderacion', cuenta: resumen ? resumen.ofertas + resumen.cuentasCobro + resumen.testimonios : null, fallo: !!fallos.moderacion },
    { titulo: 'Reportes de producto', detalle: 'A los 3 pendientes el producto se pausa', to: '/plataforma/moderacion/reportes', cuenta: resumen?.reportesProducto ?? null, fallo: !!fallos.moderacion },
    { titulo: 'Cobros y liquidaciones', detalle: 'SINPE pendiente y retiros', to: '/plataforma/dinero', cuenta: resumen ? resumen.sinpe + resumen.payouts : null, fallo: !!fallos.moderacion },
    { titulo: 'Suscripciones atrasadas', detalle: 'Mensualidad del plan', to: '/plataforma/dinero/suscripciones', cuenta: atrasadas, fallo: !!fallos.dinero },
    { titulo: 'Alertas de acceso', detalle: 'Cuentas e IPs', to: '/plataforma/seguridad', cuenta: alertas, fallo: !!fallos.seguridad },
  ]
}
