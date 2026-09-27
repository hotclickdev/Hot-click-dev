import { useState, type FormEvent } from 'react'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRA } from '@/pages/checkout/iconosCompra'
import { usaGuiaCorreos, type DespachoPaquete } from './despachoPaquete'

const LARGO_MAXIMO_GUIA = 100
const CLASE_TARJETA = 'flex w-full flex-col gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]'

type Props = Readonly<{
  despacho: DespachoPaquete
  despachado: boolean
  onDespachar: (numeroGuia: string | null) => Promise<void>
}>

function Despachado({ numeroGuia }: Readonly<{ numeroGuia: string | null }>) {
  return (
    <section className={CLASE_TARJETA}>
      <h2 className="text-[14px] font-semibold text-hc-n-900">Paquete despachado</h2>
      {numeroGuia ? <p className="font-mono text-[15px] font-medium text-hc-n-900">{numeroGuia}</p> : null}
      <p className="text-[12px] leading-[16px] text-hc-n-500">
        {numeroGuia ? 'El cliente recibió un correo con el seguimiento.' : 'Ya marcaste este paquete como despachado.'}
      </p>
    </section>
  )
}

/** Card «Guía» (Figma `37:1819`). Sin Correos no hay guía: solo se marca como despachado. */
export default function TarjetaGuia({ despacho, despachado, onDespachar }: Props) {
  const conGuia = usaGuiaCorreos(despacho.metodoEnvio)
  const [guia, setGuia] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (despachado) return <Despachado numeroGuia={despacho.numeroGuia} />

  async function enviar(evento: FormEvent) {
    evento.preventDefault()
    const numero = guia.trim().toUpperCase()
    if (conGuia && !numero) {
      setError('Escribí el número de guía que viene en el comprobante de Correos.')
      return
    }
    setEnviando(true)
    setError(null)
    try {
      await onDespachar(conGuia ? numero : null)
    } catch (err: unknown) {
      console.error('[Despacho]', err)
      setError('No pudimos marcar el paquete como despachado. Intentá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={(e) => void enviar(e)} className={CLASE_TARJETA} noValidate>
      {conGuia ? <CampoGuia valor={guia} onCambio={setGuia} deshabilitado={enviando} /> : (
        <h2 className="text-[14px] font-semibold text-hc-n-900">Despacho</h2>
      )}
      <p className="text-[12px] leading-[16px] text-hc-n-500">
        {conGuia
          ? 'Llevá el paquete a cualquier sucursal de Correos y copiá la guía del comprobante. El cliente recibe un correo con el seguimiento.'
          : 'Cuando el paquete salga hacia el cliente (o él lo recoja), marcalo como despachado.'}
      </p>
      {error ? <p role="alert" className="text-[12px] font-medium text-hc-red-600">{error}</p> : null}
      <button
        type="submit"
        disabled={enviando}
        className="flex w-full items-center justify-center gap-[8px] rounded-[12px] bg-hc-red-500 py-[14px] text-[15px] font-semibold text-hc-n-0 disabled:opacity-60"
      >
        <IconoFigma src={ICONOS_COMPRA.checkDespachado} size={18} />
        {enviando ? 'Guardando…' : 'Marcar como despachado'}
      </button>
    </form>
  )
}

type CampoGuiaProps = Readonly<{ valor: string; onCambio: (valor: string) => void; deshabilitado: boolean }>

function CampoGuia({ valor, onCambio, deshabilitado }: CampoGuiaProps) {
  return (
    <>
      <label htmlFor="numero-guia" className="text-[14px] font-semibold text-hc-n-900">Número de guía de Correos CR</label>
      <div className="flex items-center gap-[8px] rounded-[10px] border-[1.5px] border-hc-blue-600 bg-hc-n-0 py-[10px] pl-[12px] pr-[8px]">
        <input
          id="numero-guia"
          value={valor}
          onChange={(e) => onCambio(e.target.value)}
          disabled={deshabilitado}
          maxLength={LARGO_MAXIMO_GUIA}
          autoComplete="off"
          autoCapitalize="characters"
          placeholder="RR123456789CR"
          className="min-w-0 flex-1 bg-transparent font-mono text-[15px] font-medium text-hc-n-900 outline-none placeholder:text-hc-n-300"
        />
        <IconoFigma src={ICONOS_COMPRA.escanear} size={20} className="shrink-0 text-hc-blue-600" />
      </div>
    </>
  )
}
