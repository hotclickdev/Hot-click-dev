import { useState } from 'react'
import FormularioPorPasos from '@/prototipo/compartido/FormularioPorPasos'
import type { PasoFormulario } from '@/prototipo/compartido/formularioPorPasosHelpers'
import { linkWhatsAppCotizacion, type Encargo } from '@/services/encargoService'

type Props = Readonly<{
  encargo: Encargo
  precio: string
  onPrecioChange: (v: string) => void
  mensaje: string
  onMensajeChange: (v: string) => void
  motivo: string
  onMotivoChange: (v: string) => void
  busy: boolean
  onAprobar: () => void
  onRechazar: () => void
}>

type Modo = 'decidir' | 'cotizar' | 'rechazar'

const PASOS_COTIZAR: readonly PasoFormulario[] = [
  { id: 'precio', titulo: 'Precio a cobrar' },
  { id: 'mensaje', titulo: 'Mensaje al cliente', opcional: true },
  { id: 'confirmar', titulo: 'Enviar link de pago' },
]

const PASOS_RECHAZAR: readonly PasoFormulario[] = [
  { id: 'motivo', titulo: 'Motivo del rechazo' },
  { id: 'confirmar', titulo: 'Confirmar rechazo' },
]

/**
 * Respuesta a encargo pendiente en pasos (cotizar o rechazar).
 */
export default function EncargoRespuestaPasos({
  encargo,
  precio,
  onPrecioChange,
  mensaje,
  onMensajeChange,
  motivo,
  onMotivoChange,
  busy,
  onAprobar,
  onRechazar,
}: Props) {
  const [modo, setModo] = useState<Modo>('decidir')
  const [paso, setPaso] = useState(0)
  const waLink = precio && Number(precio) > 0
    ? linkWhatsAppCotizacion(encargo, Number(precio))
    : null

  if (modo === 'decidir') {
    return (
      <div className="space-y-3 border-t pt-2" style={{ borderColor: 'var(--hc-border)' }}>
        <p className="text-sm font-medium">¿Qué querés hacer?</p>
        <button
          type="button"
          onClick={() => { setModo('cotizar'); setPaso(0) }}
          className="w-full rounded-xl py-3 text-sm font-bold text-white"
          style={{ backgroundColor: 'var(--hc-primary)' }}
        >
          Cotizar y aprobar
        </button>
        <button
          type="button"
          onClick={() => { setModo('rechazar'); setPaso(0) }}
          className="w-full rounded-xl border py-3 text-sm"
          style={{ borderColor: 'var(--hc-border)' }}
        >
          Rechazar encargo
        </button>
      </div>
    )
  }

  if (modo === 'rechazar') {
    const idPaso = PASOS_RECHAZAR[paso]?.id
    return (
      <div className="border-t pt-3" style={{ borderColor: 'var(--hc-border)' }}>
        <button type="button" className="mb-3 text-xs text-hc-muted" onClick={() => setModo('decidir')}>
          Cambiar decisión
        </button>
        <FormularioPorPasos
          pasos={PASOS_RECHAZAR}
          pasoActual={paso}
          onPasoChange={setPaso}
          validarPaso={(i) => {
            if (PASOS_RECHAZAR[i]?.id === 'motivo' && !motivo.trim()) return 'Indicá el motivo del rechazo.'
            return null
          }}
          onFinalizar={onRechazar}
          etiquetaFinal="Rechazar"
          enviando={busy}
          ocultarAtrasEnPrimero={false}
        >
          {idPaso === 'motivo' ? (
            <textarea
              id="encargo-motivo-rechazo"
              className="w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--hc-border)', minHeight: 64 }}
              value={motivo}
              onChange={(e) => onMotivoChange(e.target.value)}
              placeholder="Motivo para el cliente"
            />
          ) : null}
          {idPaso === 'confirmar' ? (
            <p className="text-sm text-hc-muted">Se notificará el rechazo con el motivo indicado.</p>
          ) : null}
        </FormularioPorPasos>
      </div>
    )
  }

  const idPaso = PASOS_COTIZAR[paso]?.id
  return (
    <div className="border-t pt-3" style={{ borderColor: 'var(--hc-border)' }}>
      <button type="button" className="mb-3 text-xs text-hc-muted" onClick={() => setModo('decidir')}>
        Cambiar decisión
      </button>
      <FormularioPorPasos
        pasos={PASOS_COTIZAR}
        pasoActual={paso}
        onPasoChange={setPaso}
        validarPaso={(i) => {
          if (PASOS_COTIZAR[i]?.id === 'precio' && !(Number(precio) > 0)) {
            return 'Indicá un precio válido.'
          }
          return null
        }}
        onFinalizar={onAprobar}
        etiquetaFinal="Aprobar y enviar link de pago"
        enviando={busy}
        ocultarAtrasEnPrimero={false}
      >
        {idPaso === 'precio' ? (
          <div>
            <label htmlFor="encargo-precio-aprobar" className="text-xs">Precio a cobrar (₡)</label>
            <input
              id="encargo-precio-aprobar"
              type="number"
              min={1}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--hc-border)' }}
              value={precio}
              onChange={(e) => onPrecioChange(e.target.value)}
            />
          </div>
        ) : null}
        {idPaso === 'mensaje' ? (
          <div>
            <label htmlFor="encargo-mensaje-vendedor" className="text-xs">Mensaje para el cliente (opcional)</label>
            <textarea
              id="encargo-mensaje-vendedor"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
              style={{ borderColor: 'var(--hc-border)', minHeight: 56 }}
              value={mensaje}
              onChange={(e) => onMensajeChange(e.target.value)}
              maxLength={500}
            />
          </div>
        ) : null}
        {idPaso === 'confirmar' ? (
          <div className="space-y-2">
            <p className="text-sm">
              Precio: <strong>₡{Number(precio).toLocaleString('es-CR')}</strong>
            </p>
            {mensaje.trim() ? <p className="text-sm text-hc-muted">{mensaje}</p> : null}
            {waLink ? (
              <a
                href={waLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-center text-sm font-semibold"
                style={{ color: 'var(--hc-accent)' }}
              >
                Enviar cotización por WhatsApp
              </a>
            ) : null}
          </div>
        ) : null}
      </FormularioPorPasos>
    </div>
  )
}
