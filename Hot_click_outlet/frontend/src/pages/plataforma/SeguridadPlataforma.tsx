import { useEffect, useState } from 'react'
import { securityService } from '@/services/securityService'
import { filasDe, idSeguro, ipValida, texto, type Fila } from './normalizar'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga, TARJETA } from './piezas'

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
    <div className="mx-auto flex max-w-3xl flex-col gap-4">
      <h1 className="font-display text-[22px] font-bold text-hc-n-900">Seguridad</h1>
      {fallos.map((nombre) => <Aviso key={nombre}>{`No se pudo cargar ${nombre}.`}</Aviso>)}
      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold text-hc-n-600">Alertas</h2>
        {alertas.length === 0 && <Aviso>Nada pendiente.</Aviso>}
        {alertas.map((fila) => {
          const id = idSeguro(fila)
          if (!id) return null
          return (
            <article key={id} className={TARJETA}>
              <p className="font-semibold">{texto(fila.titulo, texto(fila.tipo, 'Alerta'))}</p>
              <p className="text-xs text-hc-n-600">{texto(fila.detalle, texto(fila.mensaje, ''))}</p>
              <button type="button" className={`${BOTON_SECUNDARIO} mt-3`} onClick={() => void resolver(id, () => setMarca((n) => n + 1))}>
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
            const valor = texto(fila.ip, texto(fila.id, ''))
            if (!valor) return null
            return (
              <li key={valor} className="flex items-center justify-between text-sm">
                <span>{valor}</span>
                <button type="button" className="font-semibold text-hc-blue-600" onClick={() => void desbloquear(valor, () => setMarca((n) => n + 1))}>
                  Quitar
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}

async function resolver(id: string, listo: () => void) {
  try {
    await securityService.resolveAlert(id)
    listo()
  } catch (err) {
    console.error(err)
  }
}

async function desbloquear(ip: string, listo: () => void) {
  if (!ipValida(ip)) return
  try {
    await securityService.desbloquearIp(ip)
    listo()
  } catch (err) {
    console.error(err)
  }
}
