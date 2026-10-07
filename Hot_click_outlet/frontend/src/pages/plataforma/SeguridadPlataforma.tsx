import { useEffect, useState } from 'react'
import { securityService } from '@/services/securityService'
import { adminService } from '@/services/orderService'
import { detalleAlerta, filasDe, idSeguro, ipDeFila, ipValida, texto, tituloAlerta, type Fila } from './normalizar'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga, Chip, Encabezado, MarcoIcono, Metrica, TARJETA } from './piezas'

export default function SeguridadPlataforma() {
  const [alertas, setAlertas] = useState<Fila[]>([])
  const [ips, setIps] = useState<Fila[]>([])
  const [fallos, setFallos] = useState<string[]>([])
  const [listo, setListo] = useState(false)
  const [marca, setMarca] = useState(0)
  const [ip, setIp] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    void Promise.allSettled([
      securityService.getAlerts(false),
      securityService.getIpsBloqueadas(),
    ]).then(([a, b]) => {
      const errores: string[] = []
      if (a.status === 'fulfilled') setAlertas(filasDe(a.value.data))
      else errores.push('alertas')
      if (b.status === 'fulfilled') setIps(filasDe(b.value.data))
      else errores.push('bloqueos')
      setFallos(errores)
      setListo(true)
    })
  }, [marca])

  async function bloquear() {
    if (!ipValida(ip) || motivo.trim().length < 3) {
      setError('Escribí una IP válida y un motivo.')
      return
    }
    setError('')
    try {
      await securityService.bloquearIp(ip.trim(), motivo.trim())
      setIp('')
      setMotivo('')
      setMarca((n) => n + 1)
    } catch (err) {
      console.error(err)
      setError('No se pudo bloquear la IP.')
    }
  }

  if (!listo) return <Carga />
  return (
    <div className="flex flex-col gap-4">
      <Encabezado titulo="Acceso" detalle="Quién entra a HotClick, qué alerta quedó abierta y qué dirección se bloquea." marca={String(alertas.length)} />
      <div className="grid gap-3 sm:grid-cols-2">
        <Metrica icono="seguridad" etiqueta="Alertas abiertas" valor={String(alertas.length)} />
        <Metrica icono="moderacion" etiqueta="IPs bloqueadas" valor={String(ips.length)} />
      </div>
      {fallos.map((nombre) => <Aviso key={nombre}>{`No se pudo cargar ${nombre}.`}</Aviso>)}
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <section className="grid gap-3 sm:grid-cols-2">
        <h2 className="text-sm font-semibold text-hc-n-600 sm:col-span-2">Alertas</h2>
        {alertas.length === 0 && <div className="sm:col-span-2"><Aviso>Nada pendiente.</Aviso></div>}
        {alertas.map((fila) => {
          const id = idSeguro(fila)
          if (!id) return null
          return (
            <article key={id} className={TARJETA}>
              <div className="flex items-start gap-3">
                <MarcoIcono id="seguridad" />
                <div>
                  <p className="font-semibold">{tituloAlerta(fila)}</p>
                  <p className="mt-1 text-xs text-hc-n-600">{detalleAlerta(fila)}</p>
                  <Chip tono="alerta">Abierta</Chip>
                </div>
              </div>
              <button type="button" className={`${BOTON_SECUNDARIO} mt-3`} onClick={() => void resolver(id, () => setMarca((n) => n + 1), setError)}>
                Resolver
              </button>
            </article>
          )
        })}
      </section>
      <section className={TARJETA}>
        <h2 className="font-display text-[17px] font-bold">Bloquear IP</h2>
        <input value={ip} onChange={(e) => setIp(e.target.value)} placeholder="IP" className="mt-3 h-12 w-full rounded-xl border border-hc-n-200 px-3 text-sm" />
        <input value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Motivo" className="mt-2 h-12 w-full rounded-xl border border-hc-n-200 px-3 text-sm" />
        {error && <p className="mt-2 text-sm text-hc-primary-text">{error}</p>}
        <button type="button" className={`${BOTON_PRIMARIO} mt-3`} onClick={() => void bloquear()}>Bloquear</button>
        <ul className="mt-4 flex flex-col gap-2">
          {ips.map((fila) => {
            const valor = ipDeFila(fila)
            if (!valor) return null
            return (
              <li key={valor} className="flex items-center justify-between text-sm">
                <span>{valor}</span>
                <button type="button" className="font-semibold text-hc-blue-600" onClick={() => void desbloquear(valor, () => setMarca((n) => n + 1), setError)}>
                  Quitar
                </button>
              </li>
            )
          })}
        </ul>
      </section>
      </div>
      <Movimiento />
      <Cuentas />
      <Sospechosas />
    </div>
  )
}

async function resolver(id: string, listo: () => void, fallar: (mensaje: string) => void) {
  try {
    await securityService.resolveAlert(id)
    fallar('')
    listo()
  } catch (err) {
    console.error(err)
    fallar('No se pudo resolver la alerta.')
  }
}

async function desbloquear(ip: string, listo: () => void, fallar: (mensaje: string) => void) {
  if (!ipValida(ip)) {
    fallar('Esa IP no se puede quitar.')
    return
  }
  try {
    await securityService.desbloquearIp(ip)
    fallar('')
    listo()
  } catch (err) {
    console.error(err)
    fallar('No se pudo quitar el bloqueo.')
  }
}

function Movimiento() {
  const [eventos, setEventos] = useState<Fila[]>([])
  const [sesiones, setSesiones] = useState<Fila[]>([])
  const [fallo, setFallo] = useState('')
  useEffect(() => {
    void Promise.allSettled([
      securityService.getEvents({ page: 0, size: 12, period: '7d' }),
      securityService.getSesionesActivas(),
    ]).then(([ev, ses]) => {
      if (ev.status === 'fulfilled') setEventos(filasDe(ev.value.data))
      else setFallo('No se pudieron cargar los eventos.')
      if (ses.status === 'fulfilled') setSesiones(filasDe(ses.value.data))
    })
  }, [])
  return (
    <div className="flex flex-col gap-3">
      {fallo && <Aviso>{fallo}</Aviso>}
      <TablaEventos eventos={eventos} />
      <h2 className="font-display text-[17px] font-bold">Sesiones activas</h2>
      {sesiones.length === 0 && <Aviso>No hay sesiones activas en la lista.</Aviso>}
      <ul className="grid gap-3 sm:grid-cols-2">
      {sesiones.map((fila) => (
        <li key={texto(fila.id, texto(fila.email, texto(fila.correo, 'sesion')))} className={TARJETA}>
          <p className="font-semibold">{texto(fila.email, texto(fila.correo, texto(fila.usuario, 'Sesión')))}</p>
          <p className="mt-1 text-xs text-hc-n-600">{texto(fila.ip, texto(fila.ipAddress, 'Sin IP'))}</p>
        </li>
      ))}
      </ul>
    </div>
  )
}

function TablaEventos({ eventos }: { eventos: Fila[] }) {
  return (
    <div className="overflow-hidden rounded-[14px] border border-hc-n-200 bg-white">
      <div className="flex items-center justify-between border-b border-hc-n-200 bg-hc-n-50 px-4 py-3">
        <h2 className="font-display text-[17px] font-bold">Movimiento</h2>
        <Chip tono="azul">{`${eventos.length} eventos`}</Chip>
      </div>
      {eventos.length === 0 && <p className="px-4 py-3 text-sm text-hc-n-600">Sin eventos recientes.</p>}
      {eventos.map((fila) => {
        const tipo = texto(fila.eventType, texto(fila.tipo, 'Evento'))
        return (
          <div key={texto(fila.id, texto(fila.message, tipo))} className="grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-2 border-t border-hc-n-200 px-4 py-3">
            <Chip tono={tipo.includes('REJECT') || tipo.includes('FAIL') ? 'alerta' : 'neutro'}>{tipo}</Chip>
            <p className="truncate text-sm text-hc-n-600">{texto(fila.message, texto(fila.descripcion, texto(fila.email, '—')))}</p>
          </div>
        )
      })}
    </div>
  )
}

function Cuentas() {
  const [filas, setFilas] = useState<Fila[]>([])
  const [error, setError] = useState('')
  const [marca, setMarca] = useState(0)
  useEffect(() => {
    securityService.getUsuarios({ page: 0, size: 20 })
      .then((r) => setFilas(filasDe(r.data)))
      .catch((err: unknown) => { console.error(err); setError('No se pudieron cargar las cuentas.') })
  }, [marca])
  return (
    <section className="overflow-hidden rounded-[14px] border border-hc-n-200 bg-white">
      <div className="border-b border-hc-n-200 bg-hc-n-50 px-4 py-3">
        <h2 className="font-display text-[17px] font-bold">Cuentas</h2>
      </div>
      {error && <div className="p-3"><Aviso>{error}</Aviso></div>}
      {filas.map((fila) => {
        const id = idSeguro(fila)
        if (!id) return null
        const bloqueada = texto(fila.estado).toUpperCase() === 'BLOQUEADO'
        return (
          <article key={id} className="flex items-center justify-between gap-3 border-t border-hc-n-200 px-4 py-3">
            <p className="min-w-0">
              <span className="block font-semibold">{texto(fila.nombre, texto(fila.correo, 'Cuenta'))}</span>
              <span className="block truncate text-xs text-hc-n-600">{texto(fila.correo, '')}</span>
            </p>
            <Chip tono={bloqueada ? 'alerta' : 'neutro'}>{texto(fila.estado) || '—'}</Chip>
            <button type="button" className={BOTON_SECUNDARIO} onClick={() => void alternarCuenta(id, bloqueada, () => setMarca((n) => n + 1), setError)}>
              {bloqueada ? 'Desbloquear' : 'Bloquear'}
            </button>
          </article>
        )
      })}
    </section>
  )
}

function Sospechosas() {
  const [filas, setFilas] = useState<Fila[]>([])
  useEffect(() => {
    securityService.getIpsSospechosas()
      .then((r) => setFilas(filasDe(r.data)))
      .catch((err: unknown) => console.error(err))
  }, [])
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-sm font-semibold text-hc-n-600">IPs sospechosas</h2>
      {filas.length === 0 && <Aviso>Ninguna IP sospechosa en las últimas horas.</Aviso>}
      {filas.map((fila) => (
        <p key={ipDeFila(fila) || texto(fila.id, 'ip')} className="text-sm">
          {ipDeFila(fila) || texto(fila.ip, 'IP')} · {texto(fila.motivo, texto(fila.razon, texto(fila.count, '')))}
        </p>
      ))}
    </section>
  )
}

async function alternarCuenta(id: string, bloqueada: boolean, listo: () => void, fallar: (mensaje: string) => void) {
  try {
    if (bloqueada) await adminService.unblockUser(id)
    else await adminService.blockUser(id)
    fallar('')
    listo()
  } catch (err) {
    console.error(err)
    fallar(bloqueada ? 'No se pudo desbloquear la cuenta.' : 'No se pudo bloquear la cuenta.')
  }
}
