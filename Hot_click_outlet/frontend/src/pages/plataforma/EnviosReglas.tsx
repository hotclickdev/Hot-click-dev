import { useEffect, useState, type FormEvent } from 'react'
import api from '@/services/api'
import { aplicarMontosEnvio, type MontosEnvio } from '@/config/montosEnvio'
import { Aviso, BOTON_PRIMARIO, Carga, TARJETA, TITULO } from './piezas'

const MAX = 50_000
const CAMPOS: Array<{ clave: keyof MontosEnvio; etiqueta: string; detalle: string }> = [
  { clave: 'montoGamCrc', etiqueta: 'Envío normal GAM', detalle: 'Destino dentro del Gran Área Metropolitana.' },
  { clave: 'montoFueraGamCrc', etiqueta: 'Envío normal fuera del GAM', detalle: 'Resto del país o destino sin identificar.' },
  { clave: 'montoRapidoCrc', etiqueta: 'Envío rápido', detalle: 'Solo GAM, dentro de la ventana del día.' },
]
const INPUT = 'h-12 w-full rounded-xl border border-hc-n-200 bg-hc-surface px-3.5 text-[15px] text-hc-n-900 outline-none focus:border-hc-blue-600'

type Estado = 'carga' | 'listo' | 'error'

/** A-2 (solo ADMIN): montos de envío por negocio. El servidor valida 0..50.000 y siempre calcula el cobro. */
export default function EnviosReglas() {
  const [valores, setValores] = useState<Record<keyof MontosEnvio, string>>({ montoGamCrc: '', montoFueraGamCrc: '', montoRapidoCrc: '' })
  const [estado, setEstado] = useState<Estado>('carga')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)

  useEffect(() => {
    api.get('/admin/configuracion/envio')
      .then(({ data }) => {
        const m = (data as { data?: MontosEnvio })?.data
        if (!m) throw new Error('sin datos')
        setValores({ montoGamCrc: String(m.montoGamCrc), montoFueraGamCrc: String(m.montoFueraGamCrc), montoRapidoCrc: String(m.montoRapidoCrc) })
        setEstado('listo')
      })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [])

  const invalido = CAMPOS.some(({ clave }) => !/^\d{1,5}$/.test(valores[clave]) || Number(valores[clave]) > MAX)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (invalido) return
    setGuardando(true)
    setMensaje(null)
    const body: MontosEnvio = {
      montoGamCrc: Number(valores.montoGamCrc),
      montoFueraGamCrc: Number(valores.montoFueraGamCrc),
      montoRapidoCrc: Number(valores.montoRapidoCrc),
    }
    try {
      await api.put('/admin/configuracion/envio', body)
      aplicarMontosEnvio(body)
      setMensaje({ ok: true, texto: 'Montos guardados. Aplican a los próximos pedidos.' })
    } catch (err) {
      console.error(err)
      setMensaje({ ok: false, texto: 'No se pudieron guardar. Revisá que cada monto esté entre ₡0 y ₡50.000.' })
    } finally {
      setGuardando(false)
    }
  }

  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudieron cargar los montos de envío.</Aviso>
  return (
    <form onSubmit={guardar} className={`${TARJETA} flex flex-col gap-4`} noValidate>
      <div>
        <h2 className={TITULO}>Montos de envío</h2>
        <p className="mt-1 text-xs text-hc-n-600">Se cobra un envío por negocio. El servidor clasifica el destino; sin destino cobra fuera del GAM.</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        {CAMPOS.map(({ clave, etiqueta, detalle }) => (
          <label key={clave} className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-hc-n-900">{etiqueta} (₡)</span>
            <input
              className={INPUT}
              inputMode="numeric"
              value={valores[clave]}
              aria-invalid={!/^\d{1,5}$/.test(valores[clave]) || Number(valores[clave]) > MAX}
              onChange={(ev) => setValores((v) => ({ ...v, [clave]: ev.target.value.replace(/\D/g, '').slice(0, 5) }))}
            />
            <span className="text-xs text-hc-n-600">{detalle}</span>
          </label>
        ))}
      </div>
      {invalido && <p className="text-xs text-hc-primary">Cada monto tiene que ser un entero entre ₡0 y ₡50.000.</p>}
      {mensaje && <p role="status" className={`text-sm ${mensaje.ok ? 'text-hc-n-900' : 'text-hc-primary'}`}>{mensaje.texto}</p>}
      <div><button type="submit" className={BOTON_PRIMARIO} disabled={guardando || invalido}>{guardando ? 'Guardando…' : 'Guardar montos'}</button></div>
    </form>
  )
}
