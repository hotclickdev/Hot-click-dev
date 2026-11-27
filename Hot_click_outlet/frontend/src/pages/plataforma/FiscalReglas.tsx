import { useEffect, useState, type FormEvent } from 'react'
import { fiscalService, type ReglasFiscales } from '@/services/fiscalService'
import { Aviso, BOTON_PRIMARIO, Carga, TARJETA, TITULO } from './piezas'

const INPUT = 'h-12 w-full rounded-xl border border-hc-n-200 bg-hc-surface px-3.5 text-[15px] text-hc-n-900 outline-none focus:border-hc-blue-600'

type Estado = 'carga' | 'listo' | 'error'
type Form = {
  regimen: string; extra: string; dias: string; minimo: string; costo: string
  fec: boolean; fecNoInscrito: boolean
}

function aForm(r: ReglasFiscales): Form {
  return {
    regimen: r.regimen,
    extra: String(r.extraNoInscritoPct),
    dias: String(r.diasEnviarFactura),
    minimo: String(r.onvoPagoMinimoCrc),
    costo: String(r.onvoCostoPagoCrc),
    fec: r.fecHabilitada === true,
    fecNoInscrito: r.fecPermitirNoInscrito === true,
  }
}

/** Punto decimal o coma, máximo 2 decimales. */
function extraValido(v: string): boolean {
  if (!/^\d{1,2}([.,]\d{1,2})?$/.test(v)) return false
  return Number(v.replace(',', '.')) <= 50
}

function entero(v: string, max: number, min = 0): boolean {
  return /^\d{1,8}$/.test(v) && Number(v) >= min && Number(v) <= max
}

/** Solo ADMIN: reglas fiscales de la plataforma. El servidor valida los rangos de nuevo. */
export default function FiscalReglas() {
  const [form, setForm] = useState<Form>({ regimen: 'SIMPLIFICADO', extra: '', dias: '', minimo: '', costo: '', fec: false, fecNoInscrito: false })
  const [estado, setEstado] = useState<Estado>('carga')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(null)

  useEffect(() => {
    fiscalService.getReglas()
      .then(({ data }) => {
        const o = ((data as { data?: ReglasFiscales })?.data ?? data) as ReglasFiscales | undefined
        if (!o || typeof o.regimen !== 'string') throw new Error('sin datos')
        setForm(aForm(o))
        setEstado('listo')
      })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [])

  const invalido = !extraValido(form.extra) || !entero(form.dias, 60, 1)
    || !entero(form.minimo, 10_000_000) || !entero(form.costo, 100_000)

  async function guardar(e: FormEvent) {
    e.preventDefault()
    if (invalido) return
    setGuardando(true)
    setMensaje(null)
    try {
      await fiscalService.putReglas({
        regimen: form.regimen === 'TRADICIONAL' ? 'TRADICIONAL' : 'SIMPLIFICADO',
        extraNoInscritoPct: Number(form.extra.replace(',', '.')),
        diasEnviarFactura: Number(form.dias),
        onvoPagoMinimoCrc: Number(form.minimo),
        onvoCostoPagoCrc: Number(form.costo),
        fecHabilitada: form.regimen === 'TRADICIONAL' && form.fec,
        fecPermitirNoInscrito: form.fecNoInscrito,
      })
      setMensaje({ ok: true, texto: 'Reglas guardadas. Aplican a las próximas comisiones.' })
    } catch (err) {
      console.error(err)
      setMensaje({ ok: false, texto: 'No se pudieron guardar. Revisá los rangos de cada campo.' })
    } finally {
      setGuardando(false)
    }
  }

  const campo = (clave: 'regimen' | 'extra' | 'dias' | 'minimo' | 'costo', valor: string) => setForm((f) => ({ ...f, [clave]: valor }))

  const tradicional = form.regimen === 'TRADICIONAL'
  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudieron cargar las reglas fiscales.</Aviso>
  return (
    <form onSubmit={guardar} className={`${TARJETA} flex flex-col gap-4`} noValidate>
      <div>
        <h2 className={TITULO}>Reglas fiscales</h2>
        <p className="mt-1 text-xs text-hc-n-600">
          El negocio que no está inscrito en Hacienda paga la comisión de su plan más este extra, hasta que se inscriba.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-hc-n-900">Régimen de HotClick</span>
          <select className={INPUT} value={form.regimen} onChange={(ev) => campo('regimen', ev.target.value)}>
            <option value="SIMPLIFICADO">Simplificado (RTS)</option>
            <option value="TRADICIONAL">Tradicional</option>
          </select>
          <span className="text-xs text-hc-n-600">Hoy HotClick está en el Régimen de Tributación Simplificada.</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-hc-n-900">Extra por no estar inscrito (%)</span>
          <input className={INPUT} inputMode="decimal" value={form.extra} aria-invalid={!extraValido(form.extra)}
            onChange={(ev) => campo('extra', ev.target.value.replace(/[^\d.,]/g, '').slice(0, 5))} />
          <span className="text-xs text-hc-n-600">Entre 0 y 50, con hasta 2 decimales.</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-hc-n-900">Días para enviar la factura</span>
          <input className={INPUT} inputMode="numeric" value={form.dias} aria-invalid={!entero(form.dias, 60, 1)}
            onChange={(ev) => campo('dias', ev.target.value.replace(/\D/g, '').slice(0, 2))} />
          <span className="text-xs text-hc-n-600">Plazo del negocio para facturarle a HotClick (1 a 60).</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-hc-n-900">Pago mínimo de ONVO (₡)</span>
          <input className={INPUT} inputMode="numeric" value={form.minimo} aria-invalid={!entero(form.minimo, 10_000_000)}
            onChange={(ev) => campo('minimo', ev.target.value.replace(/\D/g, '').slice(0, 8))} />
          <span className="text-xs text-hc-n-600">Solo informativo.</span>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-hc-n-900">Costo por pago de ONVO (₡)</span>
          <input className={INPUT} inputMode="numeric" value={form.costo} aria-invalid={!entero(form.costo, 100_000)}
            onChange={(ev) => campo('costo', ev.target.value.replace(/\D/g, '').slice(0, 6))} />
          <span className="text-xs text-hc-n-600">Solo informativo.</span>
        </label>
      </div>
      <fieldset className="flex flex-col gap-3 rounded-xl border border-hc-n-200 p-4">
        <legend className="px-1 text-[13px] font-semibold text-hc-n-900">Factura electrónica de compra (FEC)</legend>
        <p className="text-xs text-hc-n-600">
          Una FEC por quincena a cada negocio en régimen simplificado, cuando HotClick pasa al régimen tradicional.
          {!tradicional && ' Mientras HotClick esté en régimen simplificado (RTS) la FEC no se usa y queda apagada.'}
        </p>
        <label className="flex items-center gap-2 text-sm text-hc-n-900">
          <input type="checkbox" checked={tradicional && form.fec} disabled={!tradicional}
            onChange={(ev) => setForm((f) => ({ ...f, fec: ev.target.checked }))} />
          Activar la FEC por quincena
        </label>
        <label className="flex items-center gap-2 text-sm text-hc-n-900">
          <input type="checkbox" checked={form.fecNoInscrito}
            onChange={(ev) => setForm((f) => ({ ...f, fecNoInscrito: ev.target.checked }))} />
          Incluir también a los negocios no inscritos
        </label>
        <span className="text-xs text-hc-n-600">Los no inscritos van como «No contribuyente»; Hacienda todavía no lo confirmó. Déjalo apagado hasta tener confirmación.</span>
      </fieldset>
      {invalido && <p className="text-xs text-hc-primary">Revisá los valores: extra de 0 a 50, días de 1 a 60 y montos enteros.</p>}
      {mensaje && <p role="status" className={`text-sm ${mensaje.ok ? 'text-hc-n-900' : 'text-hc-primary'}`}>{mensaje.texto}</p>}
      <div><button type="submit" className={BOTON_PRIMARIO} disabled={guardando || invalido}>{guardando ? 'Guardando…' : 'Guardar reglas'}</button></div>
    </form>
  )
}
