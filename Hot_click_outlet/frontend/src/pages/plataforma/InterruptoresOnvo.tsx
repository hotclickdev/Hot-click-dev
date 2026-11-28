import { useEffect, useState } from 'react'
import { onvoCobroService, type InterruptoresOnvo as Valores } from '@/services/onvoCobroService'
import { Aviso, BOTON_PRIMARIO, Carga, TARJETA, TITULO } from './piezas'
import { ADVERTENCIA_SANDBOX, interruptoresDe } from './enlacePago'

/** Solo ADMIN: cobro por ONVO a nombre del negocio y enlaces de pago. Ambos apagados hasta validar con el sandbox. */
export default function InterruptoresOnvo() {
  const [valores, setValores] = useState<Valores>({ cobroANombreNegocio: false, enlacesPago: false })
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    onvoCobroService.interruptores()
      .then(({ data }) => {
        const cuerpo = data as { data?: unknown }
        setValores(interruptoresDe(cuerpo?.data))
        setEstado('listo')
      })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [])

  async function guardar() {
    setGuardando(true)
    setMensaje('')
    try {
      await onvoCobroService.guardarInterruptores(valores)
      setMensaje('Guardado.')
    } catch (err) {
      console.error(err)
      setMensaje('No se pudo guardar.')
    } finally {
      setGuardando(false)
    }
  }

  if (estado === 'carga') return <Carga />
  if (estado === 'error') return <Aviso>No se pudieron cargar los interruptores de ONVO.</Aviso>
  return (
    <section className={`${TARJETA} flex flex-col gap-4`} aria-label="Interruptores del cobro por ONVO">
      <h2 className={TITULO}>Cobro por ONVO</h2>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={valores.cobroANombreNegocio}
          onChange={(ev) => setValores((v) => ({ ...v, cobroANombreNegocio: ev.target.checked }))} />
        <span className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-hc-n-900">Cobrar a nombre del negocio (ONVO retiene la comisión)</span>
          <span className="text-xs text-hc-n-600">{ADVERTENCIA_SANDBOX}</span>
        </span>
      </label>
      <label className="flex items-start gap-3">
        <input type="checkbox" className="mt-1 h-5 w-5" checked={valores.enlacesPago}
          onChange={(ev) => setValores((v) => ({ ...v, enlacesPago: ev.target.checked }))} />
        <span className="flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-hc-n-900">Permitir crear enlaces de pago para facturas tardías</span>
          <span className="text-xs text-hc-n-600">{ADVERTENCIA_SANDBOX}</span>
        </span>
      </label>
      {mensaje && <p role="status" className="text-sm text-hc-n-900">{mensaje}</p>}
      <div><button type="button" className={BOTON_PRIMARIO} disabled={guardando} onClick={() => void guardar()}>{guardando ? 'Guardando…' : 'Guardar'}</button></div>
    </section>
  )
}
