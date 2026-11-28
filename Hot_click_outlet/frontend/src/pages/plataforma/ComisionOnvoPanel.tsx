import { useCallback, useEffect, useState } from 'react'
import { onvoCobroService, type ComisionOnvo, type EnlacePago } from '@/services/onvoCobroService'
import { formatPrice } from '@/utils/format'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga, Chip, TARJETA, TITULO } from './piezas'
import { etiquetaEstado, pct, resumenComision, validarEnlace } from './enlacePago'

function datos<T>(respuesta: { data: unknown }): T {
  const cuerpo = respuesta.data as { data?: T }
  return (cuerpo?.data ?? respuesta.data) as T
}

/**
 * Ficha de tienda (solo ADMIN): comisión efectiva frente a la que tiene ONVO, y enlaces de pago único
 * para cobrar una factura tardía. El servidor valida todo; acá solo se pide y se muestra.
 */
export default function ComisionOnvoPanel({ id }: { id: string }) {
  const [comision, setComision] = useState<ComisionOnvo | null>(null)
  const [enlaces, setEnlaces] = useState<EnlacePago[]>([])
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [ocupado, setOcupado] = useState(false)
  const [mensaje, setMensaje] = useState('')
  const [monto, setMonto] = useState('')
  const [motivo, setMotivo] = useState('')

  const cargar = useCallback(() => {
    Promise.all([onvoCobroService.comision(id), onvoCobroService.enlaces(id)])
      .then(([c, e]) => { setComision(datos<ComisionOnvo>(c)); setEnlaces(datos<EnlacePago[]>(e)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  async function ejecutar(accion: () => Promise<unknown>, exito: string, falla: string) {
    setOcupado(true)
    setMensaje('')
    try {
      await accion()
      setMensaje(exito)
      cargar()
    } catch (err) {
      console.error(err)
      const texto = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setMensaje(texto || falla)
    } finally {
      setOcupado(false)
    }
  }

  function crear() {
    const v = validarEnlace(monto, motivo)
    if (!v.ok) { setMensaje(v.error); return }
    void ejecutar(async () => {
      await onvoCobroService.crearEnlace(id, v.monto, v.motivo)
      setMonto('')
      setMotivo('')
    }, 'Enlace creado.', 'No se pudo crear el enlace.')
  }

  function copiar(url: string) {
    navigator.clipboard.writeText(url)
      .then(() => setMensaje('Enlace copiado.'))
      .catch(() => setMensaje('No se pudo copiar. Seleccionalo y copialo a mano.'))
  }

  if (estado === 'carga') return <Carga />
  if (estado === 'error' || !comision) return <Aviso>No se pudo cargar la comisión de ONVO.</Aviso>

  const resumen = resumenComision(comision)
  return (
    <section className={`${TARJETA} flex flex-col gap-4`} aria-label="Comisión y enlace de pago ONVO">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className={TITULO}>Comisión en ONVO</h2>
        <Chip tono={resumen.tono}>{resumen.texto}</Chip>
      </div>
      <dl className="grid gap-3 sm:grid-cols-3">
        <div><dt className="text-xs text-hc-n-600">Comisión efectiva</dt><dd className="text-sm font-semibold text-hc-n-900">{pct(comision.efectivoPct)}</dd></div>
        <div><dt className="text-xs text-hc-n-600">En ONVO</dt><dd className="text-sm font-semibold text-hc-n-900">{pct(comision.enviadoPct)}</dd></div>
        <div><dt className="text-xs text-hc-n-600">Último envío</dt><dd className="text-sm font-semibold text-hc-n-900">{comision.enviadoEn ? new Date(comision.enviadoEn).toLocaleString('es-CR') : '—'}</dd></div>
      </dl>
      {comision.ultimoError && <p className="text-xs text-hc-n-600">Último error: {comision.ultimoError}</p>}
      <div>
        <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado || !comision.tieneCuenta}
          onClick={() => void ejecutar(() => onvoCobroService.sincronizar(id), 'Sincronización enviada.', 'No se pudo sincronizar con ONVO.')}>
          Sincronizar % con ONVO
        </button>
      </div>

      <h3 className="text-[15px] font-bold text-hc-n-900">Enlace de pago</h3>
      <p className="text-xs text-hc-n-600">Para cobrar una factura tardía. Se cobra a HotClick; se cancela si la factura llega antes del pago.</p>
      <div className="grid gap-3 sm:grid-cols-[160px_1fr_auto]">
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-hc-n-900">Monto (₡)</span>
          <input inputMode="numeric" className="h-12 w-full rounded-xl border border-hc-n-200 bg-hc-surface px-3.5 text-[15px] text-hc-n-900 outline-none focus:border-hc-blue-600"
            value={monto} onChange={(e) => setMonto(e.target.value)} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-hc-n-900">Motivo</span>
          <input className="h-12 w-full rounded-xl border border-hc-n-200 bg-hc-surface px-3.5 text-[15px] text-hc-n-900 outline-none focus:border-hc-blue-600"
            value={motivo} maxLength={200} onChange={(e) => setMotivo(e.target.value)} />
        </label>
        <div className="flex items-end">
          <button type="button" className={BOTON_PRIMARIO} disabled={ocupado} onClick={crear}>Crear enlace</button>
        </div>
      </div>

      {enlaces.length === 0 ? (
        <p className="text-sm text-hc-n-600">Este negocio no tiene enlaces de pago.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {enlaces.map((e) => {
            const sello = etiquetaEstado(e.estado)
            return (
              <li key={e.id} className="flex flex-wrap items-center gap-2 rounded-xl border border-hc-n-200 p-3">
                <span className="text-sm font-semibold text-hc-n-900">{formatPrice(e.montoCrc)}</span>
                <span className="min-w-0 flex-1 break-words text-sm text-hc-n-600">{e.motivo}</span>
                <Chip tono={sello.tono}>{sello.texto}</Chip>
                {e.estado === 'CREADO' && e.url && (
                  <>
                    <button type="button" className={BOTON_SECUNDARIO} onClick={() => copiar(e.url as string)}>Copiar</button>
                    <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado}
                      onClick={() => void ejecutar(() => onvoCobroService.cancelarEnlace(e.id), 'Enlace cancelado.', 'ONVO no confirmó la cancelación; el enlace sigue abierto.')}>
                      Cancelar
                    </button>
                  </>
                )}
              </li>
            )
          })}
        </ul>
      )}
      {mensaje && <p role="status" className="text-sm text-hc-n-900">{mensaje}</p>}
    </section>
  )
}
