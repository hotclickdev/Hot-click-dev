import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import api from '@/services/api'
import BarcodeCameraScan from '@/components/inventario/BarcodeCameraScan'
import { posUi } from './posApariencia'

type Linea = { producto: string; cantidad: number }
type Canje = { numeroPedido: string; comprador?: string | null; items: Linea[] }

/**
 * Entrega de un pedido de retiro hecho por Telegram: el cajero escanea el QR (o pega el código/enlace) y el
 * servidor lo canjea una sola vez para ESTA empresa. Solo el primer canje válido devuelve los productos.
 */
export default function PosRetiroTelegramModal({ open, onClose }: Readonly<{ open: boolean; onClose: () => void }>) {
  const { t } = useTranslation()
  const [codigo, setCodigo] = useState('')
  const [camara, setCamara] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Canje | null>(null)

  if (!open) return null

  function cerrar() {
    setCodigo('')
    setError(null)
    setResultado(null)
    setCamara(false)
    onClose()
  }

  async function entregar(valor: string) {
    const limpio = valor.trim()
    if (!limpio || enviando) return
    setEnviando(true)
    setError(null)
    try {
      const { data } = await api.post('/pos/retiro-telegram/canjear', { codigo: limpio })
      setResultado(data?.data as Canje)
    } catch (e) {
      const status = (e as { response?: { status?: number } }).response?.status
      setError(status === 404 ? t('pos.retiroTg.invalido') : t('pos.retiroTg.error'))
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('pos.retiroTg.titulo')}
        className="w-full max-w-md rounded-2xl p-5"
        style={{ backgroundColor: posUi.panel, border: `1px solid ${posUi.borde}`, color: posUi.texto }}
      >
        <h2 className="text-base font-bold">{t('pos.retiroTg.titulo')}</h2>

        {resultado ? (
          <div className="mt-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--hc-success-text)' }}>
              {t('pos.retiroTg.entregado', { numero: resultado.numeroPedido })}
            </p>
            {resultado.comprador ? (
              <p className="text-xs" style={{ color: posUi.muted }}>{t('pos.retiroTg.comprador', { nombre: resultado.comprador })}</p>
            ) : null}
            <ul className="mt-3 space-y-1 text-sm">
              {resultado.items.map((l) => (
                <li key={`${l.producto}-${l.cantidad}`}>{l.cantidad} × {l.producto}</li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="mt-3 space-y-3">
            <p className="text-xs" style={{ color: posUi.muted }}>{t('pos.retiroTg.ayuda')}</p>
            <input
              value={codigo}
              onChange={(ev) => setCodigo(ev.target.value)}
              onKeyDown={(ev) => { if (ev.key === 'Enter') void entregar(codigo) }}
              aria-label={t('pos.retiroTg.campo')}
              placeholder={t('pos.retiroTg.campo')}
              maxLength={300}
              autoComplete="off"
              className="w-full rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: posUi.barra, border: `1px solid ${posUi.borde}`, color: posUi.texto }}
            />
            {error ? <p role="alert" className="text-sm text-red-500">{error}</p> : null}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCamara(true)}
                className="rounded-lg px-3 py-2 text-sm font-semibold"
                style={{ backgroundColor: posUi.barra, border: `1px solid ${posUi.borde}` }}
              >
                {t('pos.retiroTg.escanear')}
              </button>
              <button
                type="button"
                disabled={enviando || !codigo.trim()}
                onClick={() => void entregar(codigo)}
                className="rounded-lg px-3 py-2 text-sm font-bold disabled:opacity-50"
                style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
              >
                {t('pos.retiroTg.entregar')}
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 text-right">
          <button type="button" onClick={cerrar} className="rounded-lg px-3 py-2 text-sm font-semibold"
            style={{ border: `1px solid ${posUi.borde}` }}>
            {t('pos.retiroTg.cerrar')}
          </button>
        </div>
      </div>

      {camara ? (
        <BarcodeCameraScan
          crudo
          onScan={(c) => { setCodigo(c); void entregar(c) }}
          onClose={() => setCamara(false)}
        />
      ) : null}
    </div>
  )
}
