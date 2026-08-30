import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import CheckoutStepper from '@/components/ui/CheckoutStepper'
import { formatPrice } from '@/utils/format'
import TextoFlecha from '@/components/ui/TextoFlecha'
import CheckoutChrome from './CheckoutChrome'
import { hrefPedidosCheckout, usaSkinVisitanteCheckout } from './checkoutVisitanteSkin'
import { WhatsAppIcon } from './checkoutIcons'
import { SINPE_NUMERO, SINPE_TITULAR } from './checkoutHelpers'
import type { Dispatch, SetStateAction, ReactNode, RefObject } from 'react'

type PagoDataSinpe = {
  numeroPedido?: string
  proveedor?: string
}

type CheckoutSinpePendingProps = {
  pagoData: PagoDataSinpe | null
  totalFinal: number
  sinpeNombre: string
  sinpeCedula: string
  sinpeTelefono: string
  sinpeImagen: File | null
  setSinpeImagen: Dispatch<SetStateAction<File | null>>
  sinpeImagenErr: string
  setSinpeImagenErr: Dispatch<SetStateAction<string>>
  sinpeUploadEstado: string
  setSinpeUploadEstado: Dispatch<SetStateAction<string>>
  sinpeUploadError: string
  setSinpeUploadError: Dispatch<SetStateAction<string>>
  sinpeInputRef: RefObject<HTMLInputElement | null>
  onSubirComprobante: () => void
  onSinpeWhatsApp: () => void
  rutaPedidos?: string
}

export default function CheckoutSinpePending({
  pagoData,
  totalFinal,
  sinpeNombre,
  sinpeCedula,
  sinpeTelefono,
  sinpeImagen,
  setSinpeImagen,
  sinpeImagenErr,
  setSinpeImagenErr,
  sinpeUploadEstado,
  setSinpeUploadEstado,
  sinpeUploadError,
  setSinpeUploadError,
  sinpeInputRef,
  onSubirComprobante,
  onSinpeWhatsApp,
  rutaPedidos: rutaPedidosProp,
}: CheckoutSinpePendingProps) {
  const { pathname } = useLocation()
  const skinVisitante = usaSkinVisitanteCheckout(pathname)
  const rutaPedidos = rutaPedidosProp ?? hrefPedidosCheckout(skinVisitante)
  const esEfectivo = pagoData?.proveedor === 'EFECTIVO'
  return (
    <CheckoutChrome embedido={skinVisitante}>
      <div
        className={
          skinVisitante
            ? 'mx-auto max-w-md px-5 py-8'
            : 'mx-auto max-w-xl px-4 py-14'
        }
      >
        {!skinVisitante ? <CheckoutStepper activeStep="checkout" /> : null}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className={
            skinVisitante
              ? 'space-y-4'
              : 'mt-8 space-y-6 rounded-2xl p-7'
          }
          style={
            skinVisitante
              ? undefined
              : { background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }
          }
        >
          <CabeceraPedido esEfectivo={esEfectivo} skinVisitante={skinVisitante} />

          {esEfectivo && (
            <BloqueEfectivo
              pagoData={pagoData}
              totalFinal={totalFinal}
              onSinpeWhatsApp={onSinpeWhatsApp}
              rutaPedidos={rutaPedidos}
            />
          )}

          {!esEfectivo && (
            <BloqueSinpe
              pagoData={pagoData}
              totalFinal={totalFinal}
              sinpeNombre={sinpeNombre}
              sinpeCedula={sinpeCedula}
              sinpeTelefono={sinpeTelefono}
              sinpeImagen={sinpeImagen}
              setSinpeImagen={setSinpeImagen}
              sinpeImagenErr={sinpeImagenErr}
              setSinpeImagenErr={setSinpeImagenErr}
              sinpeUploadEstado={sinpeUploadEstado}
              setSinpeUploadEstado={setSinpeUploadEstado}
              sinpeUploadError={sinpeUploadError}
              setSinpeUploadError={setSinpeUploadError}
              sinpeInputRef={sinpeInputRef}
              onSubirComprobante={onSubirComprobante}
              onSinpeWhatsApp={onSinpeWhatsApp}
              rutaPedidos={rutaPedidos}
              skinVisitante={skinVisitante}
            />
          )}
        </motion.div>
      </div>
    </CheckoutChrome>
  )
}

function CabeceraPedido({
  esEfectivo,
  skinVisitante,
}: {
  esEfectivo: boolean
  skinVisitante: boolean
}) {
  const titulo = esEfectivo ? '¡Pedido registrado!' : 'Pedido registrado — realizá tu SINPE'
  const sub = esEfectivo
    ? 'Pagás en efectivo cuando recibas tu pedido — monto exacto'
    : 'Transferí el monto exacto y subí la foto del comprobante'

  if (skinVisitante) {
    return (
      <div className="flex flex-col items-center gap-4 text-center">
        <div
          className="flex size-16 items-center justify-center rounded-[32px]"
          style={{ background: 'var(--hc-success-bg)' }}
        >
          <svg className="size-7 text-hc-text" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <div>
          <h2 className="font-display text-base font-bold text-hc-text">{titulo}</h2>
          <p className="mt-1 text-xs text-hc-muted">{sub}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10">
        <svg className="h-5 w-5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <div>
        <h2 className="text-base font-bold" style={{ color: 'var(--hc-text)' }}>{titulo}</h2>
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{sub}</p>
      </div>
    </div>
  )
}

function BloqueEfectivo({
  pagoData, totalFinal, onSinpeWhatsApp, rutaPedidos,
}: {
  pagoData: PagoDataSinpe | null
  totalFinal: number
  onSinpeWhatsApp: () => void
  rutaPedidos: string
}) {
  return (
    <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="space-y-4">
      <div className="rounded-xl p-5 space-y-3" style={{ background: 'color-mix(in srgb, #f59e0b 6%, transparent)', border: '1px solid color-mix(in srgb, #f59e0b 25%, transparent)' }}>
        <p className="text-xs font-semibold text-amber-400">DETALLES DEL PAGO</p>
        <div className="flex justify-between items-center">
          <span className="text-sm" style={{ color: 'var(--hc-muted)' }}>Método</span>
          <span className="font-semibold text-amber-300">Efectivo contra entrega</span>
        </div>
        {pagoData?.numeroPedido && (
          <div className="flex justify-between items-center text-sm">
            <span style={{ color: 'var(--hc-muted)' }}>Pedido</span>
            <span className="font-mono font-semibold" style={{ color: 'var(--hc-primary)' }}>{pagoData.numeroPedido}</span>
          </div>
        )}
        <div className="border-t pt-3" style={{ borderColor: 'color-mix(in srgb, #f59e0b 20%, transparent)' }}>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold" style={{ color: 'var(--hc-muted)' }}>Monto EXACTO a pagar</span>
            <span className="font-bold text-2xl text-amber-300">{formatPrice(totalFinal)}</span>
          </div>
        </div>
      </div>
      <div className="flex gap-2.5 p-3.5 rounded-xl" style={{ background: 'color-mix(in srgb, #10b981 8%, transparent)', border: '1px solid color-mix(in srgb, #10b981 25%, transparent)' }}>
        <svg className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p className="text-xs leading-relaxed text-emerald-300/90">
          Nuestro repartidor llevará tu pedido y cobrará el monto exacto en efectivo. Te avisamos por WhatsApp antes de salir.
        </p>
      </div>
      <LinkMisPedidos primario rutaPedidos={rutaPedidos} />
      <WhatsAppAtajo onClick={onSinpeWhatsApp}>Notificar también por WhatsApp</WhatsAppAtajo>
    </motion.div>
  )
}

function BloqueSinpe(props: CheckoutSinpePendingProps & { skinVisitante?: boolean }) {
  const {
    pagoData, totalFinal, sinpeNombre, sinpeCedula, sinpeTelefono,
    sinpeImagen, setSinpeImagen, sinpeImagenErr, setSinpeImagenErr,
    sinpeUploadEstado, setSinpeUploadEstado, sinpeUploadError, setSinpeUploadError,
    sinpeInputRef, onSubirComprobante, onSinpeWhatsApp, skinVisitante = false,
  } = props
  const rutaPedidos = props.rutaPedidos ?? hrefPedidosCheckout(skinVisitante)

  return (
    <>
      {!skinVisitante && (sinpeNombre || sinpeCedula || sinpeTelefono) ? (
        <div
          className="space-y-1.5 rounded-xl p-4 text-sm"
          style={{ background: 'color-mix(in srgb, var(--hc-surface) 50%, transparent)', border: '1px solid var(--hc-border)' }}
        >
          <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--hc-muted)' }}>TUS DATOS DE TRANSFERENCIA</p>
          {sinpeNombre ? <FilaDato etiqueta="Nombre" valor={sinpeNombre} /> : null}
          {sinpeCedula ? <FilaDato etiqueta="Cédula" valor={sinpeCedula} /> : null}
          {sinpeTelefono ? <FilaDato etiqueta="Teléfono" valor={sinpeTelefono} /> : null}
        </div>
      ) : null}

      <TarjetaTransferencia
        skinVisitante={skinVisitante}
        totalFinal={totalFinal}
        numeroPedido={pagoData?.numeroPedido}
      />

      {sinpeUploadEstado !== 'done' ? (
        <SubirComprobante
          skinVisitante={skinVisitante}
          sinpeImagen={sinpeImagen}
          setSinpeImagen={setSinpeImagen}
          sinpeImagenErr={sinpeImagenErr}
          setSinpeImagenErr={setSinpeImagenErr}
          sinpeUploadEstado={sinpeUploadEstado}
          setSinpeUploadEstado={setSinpeUploadEstado}
          sinpeUploadError={sinpeUploadError}
          setSinpeUploadError={setSinpeUploadError}
          sinpeInputRef={sinpeInputRef}
          onSubirComprobante={onSubirComprobante}
        />
      ) : (
        <ComprobanteListo onSinpeWhatsApp={onSinpeWhatsApp} rutaPedidos={rutaPedidos} />
      )}

      <AvisoVerificacion skinVisitante={skinVisitante} />
    </>
  )
}

function FilaDato({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span style={{ color: 'var(--hc-muted)' }}>{etiqueta}</span>
      <span style={{ color: 'var(--hc-text)' }}>{valor}</span>
    </div>
  )
}

function TarjetaTransferencia({
  skinVisitante,
  totalFinal,
  numeroPedido,
}: {
  skinVisitante: boolean
  totalFinal: number
  numeroPedido?: string
}) {
  if (skinVisitante) {
    return (
      <div
        className="space-y-2.5 rounded-2xl border p-4"
        style={{ background: 'var(--hc-success-bg)', borderColor: 'var(--hc-success)' }}
      >
        <p className="text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--hc-success)' }}>
          Realizá la transferencia a:
        </p>
        <FilaTransferencia etiqueta="Número SINPE" valor={SINPE_NUMERO} />
        <FilaTransferencia etiqueta="Titular" valor={SINPE_TITULAR} />
        {numeroPedido ? <FilaTransferencia etiqueta="Referencia" valor={numeroPedido} mono /> : null}
        <FilaTransferencia etiqueta="Monto EXACTO" valor={formatPrice(totalFinal)} />
      </div>
    )
  }

  return (
    <div
      className="space-y-3 rounded-xl p-5"
      style={{ background: 'color-mix(in srgb, #10b981 6%, transparent)', border: '1px solid color-mix(in srgb, #10b981 25%, transparent)' }}
    >
      <p className="text-xs font-semibold text-emerald-400">REALIZÁ LA TRANSFERENCIA A:</p>
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: 'var(--hc-muted)' }}>Número SINPE</span>
        <span className="text-xl font-bold tracking-widest text-emerald-300">{SINPE_NUMERO}</span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span style={{ color: 'var(--hc-muted)' }}>Titular</span>
        <span className="font-medium" style={{ color: 'var(--hc-text)' }}>{SINPE_TITULAR}</span>
      </div>
      {numeroPedido ? (
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: 'var(--hc-muted)' }}>Referencia</span>
          <span className="font-mono font-semibold" style={{ color: 'var(--hc-primary)' }}>{numeroPedido}</span>
        </div>
      ) : null}
      <div className="border-t pt-3" style={{ borderColor: 'color-mix(in srgb, #10b981 20%, transparent)' }}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold" style={{ color: 'var(--hc-muted)' }}>Monto EXACTO</span>
          <span className="text-2xl font-bold text-emerald-300">{formatPrice(totalFinal)}</span>
        </div>
      </div>
    </div>
  )
}

function FilaTransferencia({
  etiqueta,
  valor,
  mono = false,
}: {
  etiqueta: string
  valor: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="text-hc-muted">{etiqueta}</span>
      <span className={`text-right text-[13px] font-bold text-hc-text ${mono ? 'font-mono' : ''}`}>
        {valor}
      </span>
    </div>
  )
}

function AvisoVerificacion({ skinVisitante }: { skinVisitante: boolean }) {
  if (skinVisitante) {
    return (
      <div
        className="rounded-2xl border p-4"
        style={{
          background: 'color-mix(in srgb, #e57300 8%, white)',
          borderColor: '#e57300',
        }}
      >
        <p className="text-[11px] leading-relaxed" style={{ color: '#9a6700' }}>
          Tu pago será verificado por un administrador. El pedido expira en 72 horas si no se confirma.
        </p>
      </div>
    )
  }

  return (
    <div
      className="flex gap-2.5 rounded-xl p-3.5"
      style={{ background: 'color-mix(in srgb, #f59e0b 8%, transparent)', border: '1px solid color-mix(in srgb, #f59e0b 25%, transparent)' }}
    >
      <svg className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-xs leading-relaxed text-amber-300/90">
        Tu pago será <strong>verificado por un administrador</strong>. El pedido expira en 72 horas si no se confirma.
      </p>
    </div>
  )
}

function SubirComprobante({
  sinpeImagen, setSinpeImagen, sinpeImagenErr, setSinpeImagenErr,
  sinpeUploadEstado, setSinpeUploadEstado, sinpeUploadError, setSinpeUploadError,
  sinpeInputRef, onSubirComprobante, skinVisitante = false,
}: {
  sinpeImagen: File | null
  setSinpeImagen: Dispatch<SetStateAction<File | null>>
  sinpeImagenErr: string
  setSinpeImagenErr: Dispatch<SetStateAction<string>>
  sinpeUploadEstado: string
  setSinpeUploadEstado: Dispatch<SetStateAction<string>>
  sinpeUploadError: string
  setSinpeUploadError: Dispatch<SetStateAction<string>>
  sinpeInputRef: RefObject<HTMLInputElement | null>
  onSubirComprobante: () => void
  skinVisitante?: boolean
}) {
  const cuerpo = (
    <>
      {skinVisitante ? (
        <>
          <p className="text-[13px] font-bold text-hc-text">
            Subir comprobante <span className="text-hc-primary">*</span>
          </p>
          <p className="text-[11px] text-hc-muted">
            Adjuntá una foto o captura del comprobante SINPE. Solo imágenes.
          </p>
        </>
      ) : (
        <>
          <div className="flex items-center gap-2">
            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">!</span>
            <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
              Subir comprobante <span className="text-red-400">*</span>
            </p>
          </div>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            Adjuntá una foto o captura del comprobante SINPE. Solo imágenes (JPG, PNG, WebP).
          </p>
        </>
      )}

      <input
        ref={sinpeInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(e) => {
          setSinpeImagen(e.target.files?.[0] ?? null)
          setSinpeImagenErr('')
          setSinpeUploadEstado('idle')
          setSinpeUploadError('')
        }}
      />
      <button
        type="button"
        onClick={() => sinpeInputRef.current?.click()}
        className={`flex min-h-11 w-full items-center justify-center gap-2.5 py-4 text-sm font-medium transition-all ${
          skinVisitante ? 'rounded-xl border-[1.5px]' : 'rounded-xl border-2 border-dashed'
        }`}
        style={sinpeImagen
          ? { borderColor: 'var(--hc-success)', background: 'var(--hc-success-bg)', color: 'var(--hc-success)' }
          : { borderColor: sinpeImagenErr ? '#f87171' : 'var(--hc-border)', color: sinpeImagenErr ? '#f87171' : 'var(--hc-muted)' }}
      >
        {sinpeImagen ? (
          <>
            <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
            {sinpeImagen.name}
          </>
        ) : (
          <>
            {!skinVisitante ? (
              <svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
            ) : null}
            Seleccionar imagen del comprobante
          </>
        )}
      </button>
      {sinpeImagenErr ? <p className="text-xs text-red-400">{sinpeImagenErr}</p> : null}

      {sinpeImagen ? (
        <div className="overflow-hidden rounded-xl border" style={{ borderColor: 'var(--hc-border)' }}>
          <img
            src={URL.createObjectURL(sinpeImagen)}
            alt="Vista previa del comprobante"
            className="max-h-48 w-full object-contain bg-black/20"
          />
        </div>
      ) : null}

      {sinpeUploadError ? (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs text-red-400">
          {sinpeUploadError}
        </p>
      ) : null}

      <button
        type="button"
        onClick={onSubirComprobante}
        disabled={sinpeUploadEstado === 'uploading'}
        className="hc-btn hc-btn-primary min-h-11 w-full disabled:opacity-50"
      >
        {sinpeUploadEstado === 'uploading' ? (
          <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> Subiendo comprobante…</>
        ) : (
          <><svg className="h-4 w-4 shrink-0" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>Enviar comprobante</>
        )}
      </button>
    </>
  )

  if (skinVisitante) {
    return (
      <div className="space-y-2.5 rounded-2xl border border-hc-border bg-hc-surface p-4">
        {cuerpo}
      </div>
    )
  }

  return <div className="space-y-3">{cuerpo}</div>
}

function ComprobanteListo({
  onSinpeWhatsApp,
  rutaPedidos,
}: {
  onSinpeWhatsApp: () => void
  rutaPedidos: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      className="rounded-xl p-5 space-y-3 text-center"
      style={{ background: 'color-mix(in srgb, #10b981 8%, transparent)', border: '1px solid color-mix(in srgb, #10b981 25%, transparent)' }}
    >
      <div className="w-12 h-12 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mx-auto">
        <svg className="w-6 h-6 text-emerald-400" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <p className="font-bold text-emerald-400">¡Comprobante recibido!</p>
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
        Un administrador verificará tu pago y activará tu pedido. Te avisamos por correo.
      </p>
      <LinkMisPedidos primario rutaPedidos={rutaPedidos} />
      <WhatsAppAtajo onClick={onSinpeWhatsApp}>Notificar también por WhatsApp</WhatsAppAtajo>
    </motion.div>
  )
}

/** Atajo: no compite con Enviar comprobante ni Ver mis pedidos. */
function WhatsAppAtajo({ onClick, children }: { onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full min-h-11 inline-flex items-center justify-center gap-2 text-sm font-medium"
      style={{ color: 'var(--hc-muted)' }}
    >
      <WhatsAppIcon />
      {children}
    </button>
  )
}

function LinkMisPedidos({
  primario = false,
  rutaPedidos = '/mis-pedidos',
}: {
  primario?: boolean
  rutaPedidos?: string
}) {
  if (primario) {
    return (
      <Link to={rutaPedidos} className="hc-btn hc-btn-primary w-full min-h-11 inline-flex items-center justify-center">
        Ver mis pedidos
      </Link>
    )
  }
  return (
    <Link to={rutaPedidos} className="block text-xs text-center mt-1 hover:underline" style={{ color: 'var(--hc-muted)' }}>
      <TextoFlecha>Ver mis pedidos</TextoFlecha>
    </Link>
  )
}
