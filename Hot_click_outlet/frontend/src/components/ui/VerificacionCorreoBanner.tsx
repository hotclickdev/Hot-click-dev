import { useState } from 'react'
import useAuthStore from '@/store/authStore'
import { useVerificarCorreoOtp } from '@/hooks/useVerificarCorreoOtp'

/** Aviso persistente (gate suave) mientras el correo del dueño no está verificado. */
export default function VerificacionCorreoBanner() {
  const correoVerificado = useAuthStore((s) => s.correoVerificado)
  const userEmail = useAuthStore((s) => s.userEmail)
  const [abierto, setAbierto] = useState(false)
  const otp = useVerificarCorreoOtp(userEmail ?? '')

  if (correoVerificado || otp.verificado) return null

  return (
    <div
      className="w-full px-4 py-2.5 flex flex-col items-center gap-2 text-sm text-center"
      style={{ background: 'var(--hc-warning-bg, #FDF3DC)', color: 'var(--hc-warning, #9A6700)', borderBottom: '1px solid var(--hc-border)' }}
      role="status"
    >
      <div className="flex flex-wrap items-center justify-center gap-2">
        <span>Verificá tu correo para poder activar un plan de pago.</span>
        <button
          type="button"
          onClick={() => setAbierto((v) => !v)}
          className="font-semibold underline"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
        >
          {abierto ? 'Ocultar' : 'Verificar ahora'}
        </button>
      </div>
      {abierto ? (
        <form onSubmit={otp.verificar} className="flex flex-wrap items-center justify-center gap-2">
          <input
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
            placeholder="Código de 6 dígitos"
            value={otp.codigoVerif}
            onChange={(e) => otp.setCodigoVerif(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="px-2 py-1 rounded-md text-sm text-center"
            style={{ border: '1px solid var(--hc-border)', color: 'var(--hc-text)', background: 'var(--hc-surface)' }}
          />
          <button
            type="submit"
            disabled={otp.loading || otp.codigoVerif.length !== 6}
            className="font-semibold underline disabled:opacity-50"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            {otp.loading ? 'Verificando…' : 'Confirmar'}
          </button>
          <button
            type="button"
            onClick={() => void otp.reenviar()}
            disabled={otp.reenvioLoad}
            className="underline disabled:opacity-50"
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}
          >
            {otp.reenvioLoad ? 'Enviando…' : 'Reenviar código'}
          </button>
          {otp.error ? <span className="w-full text-xs">{otp.error}</span> : null}
        </form>
      ) : null}
    </div>
  )
}
