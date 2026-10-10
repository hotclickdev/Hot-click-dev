import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import useAuthStore from '@/store/authStore'
import { adminService } from '@/services/orderService'
import Modal from '@/components/ui/Modal'
import { sinPuntoDoble } from '@/utils/sinPuntoDoble'

/** Largo mínimo del motivo; igual que ImpersonacionService.MOTIVO_ESCRITURA_MIN en el backend. */
export const MOTIVO_ESCRITURA_MIN = 15

type RespuestaEscritura = { accessToken?: string; expiraEn?: number }

function mensajeDe(err: unknown, fallo: string): string {
  const msg = (err as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  return typeof msg === 'string' && msg.trim() ? msg : fallo
}

/**
 * Banner persistente mientras un ADMIN ve un negocio en modo soporte.
 * Solo lectura por defecto (banner rojo); en modo escritura usa los tokens de advertencia.
 */

export default function ImpersonacionBanner() {
  const { t } = useTranslation()
  const impersonando = useAuthStore((s) => s.impersonando)
  const modo = useAuthStore((s) => s.impersonacionModo)
  const hasta = useAuthStore((s) => s.impersonacionEscrituraHasta)
  const empresaNombre = useAuthStore((s) => s.empresaNombre)
  const empresaId = useAuthStore((s) => s.empresaId)
  const salirImpersonacion = useAuthStore((s) => s.salirImpersonacion)
  const habilitarEscritura = useAuthStore((s) => s.habilitarEscrituraImpersonacion)
  const [saliendo, setSaliendo] = useState(false)
  const [pidiendo, setPidiendo] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  if (!impersonando) return null

  const escritura = modo === 'ESCRITURA'
  const motivoValido = motivo.trim().length >= MOTIVO_ESCRITURA_MIN

  async function salir() {
    setSaliendo(true)
    try {
      if (empresaId) await adminService.finalizarImpersonacion(empresaId)
    } catch {
      // el token vence solo; no bloquear la salida por un error de auditoría
    } finally {
      salirImpersonacion()
      navigate('/plataforma')
    }
  }

  async function confirmarEscritura() {
    if (!empresaId || !motivoValido) return
    setEnviando(true)
    setError('')
    try {
      const r = await adminService.habilitarEscrituraImpersonacion(empresaId, motivo.trim())
      const data = r.data as RespuestaEscritura
      if (!data?.accessToken) throw new Error('sin token')
      habilitarEscritura(data.accessToken, typeof data.expiraEn === 'number' ? data.expiraEn : null)
      setPidiendo(false)
      setMotivo('')
    } catch (err) {
      setError(mensajeDe(err, t('impersonacion.errorEscritura')))
    } finally {
      setEnviando(false)
    }
  }

  const horaFin = hasta
    ? new Date(hasta).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <>
      <div
        className={escritura
          ? 'flex items-center justify-between gap-3 border-b border-hc-warning bg-hc-warning-bg px-4 py-2.5 text-sm text-hc-warning'
          : 'flex items-center justify-between gap-3 border-b border-hc-primary bg-hc-primary px-4 py-2.5 text-sm text-white'}
        data-mm="impersonacion-banner"
        data-modo={escritura ? 'escritura' : 'lectura'}
        role="status"
      >
        <p className="min-w-0 truncate">
          {escritura ? (
            <>
              <strong>{t('impersonacion.modoEscritura')}</strong>{' '}
              {t('impersonacion.escrituraAuditada', { negocio: empresaNombre || t('impersonacion.estaTienda') })}
              {horaFin ? ` ${sinPuntoDoble(t('impersonacion.venceA', { hora: horaFin }))}` : ''}
            </>
          ) : (
            <>
              Usted es el administrador, no el usuario. Está en <strong>{empresaNombre || 'esta tienda'}</strong>.{' '}
              {t('impersonacion.soloLectura')}
            </>
          )}
        </p>
        <div className="flex shrink-0 items-center gap-2">
          {!escritura && (
            <button type="button"
              onClick={() => { setPidiendo(true); setError('') }}
              className="rounded-lg border border-white px-3 py-1 text-xs font-semibold text-white"
            >
              {t('impersonacion.habilitarEscritura')}
            </button>
          )}
          <button type="button"
            onClick={salir}
            disabled={saliendo}
            className={escritura
              ? 'rounded-lg border border-hc-warning px-3 py-1 text-xs font-semibold text-hc-warning disabled:opacity-60'
              : 'rounded-lg bg-white px-3 py-1 text-xs font-semibold text-hc-primary disabled:opacity-60'}
          >
            {saliendo ? 'Volviendo…' : 'Salir a la consola'}
          </button>
        </div>
      </div>
      <Modal open={pidiendo} onClose={() => setPidiendo(false)} title={t('impersonacion.tituloEscritura')} size="sm">
        <div className="flex flex-col gap-3 text-sm">
          <p>{t('impersonacion.explicacionEscritura')}</p>
          <label className="flex flex-col gap-1">
            <span className="font-semibold">{t('impersonacion.motivo')}</span>
            <textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows={3}
              maxLength={300}
              className="rounded-lg border border-hc-border bg-transparent p-2"
              aria-describedby="impersonacion-motivo-ayuda"
            />
            <span id="impersonacion-motivo-ayuda" className="text-xs text-hc-text-secondary">
              {t('impersonacion.motivoMin', { min: MOTIVO_ESCRITURA_MIN })}
            </span>
          </label>
          {error && <p role="alert" className="text-hc-danger">{error}</p>}
          <button type="button"
            onClick={confirmarEscritura}
            disabled={!motivoValido || enviando}
            className="rounded-lg bg-hc-primary px-4 py-2 font-semibold text-white disabled:opacity-60"
          >
            {enviando ? t('impersonacion.habilitando') : t('impersonacion.confirmarEscritura')}
          </button>
        </div>
      </Modal>
    </>
  )
}
