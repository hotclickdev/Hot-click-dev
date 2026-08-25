import { motion } from 'framer-motion'
import ErrMsg from '../ErrMsg'

/**
 * Paso 2 — verificar correo. Handlers de verify/reenviar viven en el padre.
 */
export default function EmprendimientoPasoVerificar({
  correoReg, otpFalló, codigoVerif, error, loading, reenvioLoad,
  setCodigoVerif, onSubmit, onReenviar,
}) {
  return (
    <motion.form key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.2 }}
      onSubmit={onSubmit} className="space-y-5">
      <div className="text-center py-2">
        <div className="text-4xl mb-3">📧</div>
        <h3 className="font-bold text-base" style={{ color: 'var(--hc-text)' }}>Verificá tu correo</h3>
        <p className="text-sm mt-1" style={{ color: 'var(--hc-muted)' }}>
          {otpFalló
            ? <>No se pudo enviar el código a <strong style={{ color: 'var(--hc-text)' }}>{correoReg}</strong>. Presioná "Reenviar código".</>
            : <>Enviamos un código de 6 dígitos a <strong style={{ color: 'var(--hc-text)' }}>{correoReg}</strong></>
          }
        </p>
      </div>

      {otpFalló ? (
        <div className="rounded-xl px-4 py-3 text-sm text-center"
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>
          El código no pudo enviarse. Verificá que el correo sea correcto o intentá reenviar.
        </div>
      ) : (
        <div>
          <label htmlFor="reg-codigo-verif" className="hc-input-label block mb-2" style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--hc-muted)' }}>
            Código de verificación
          </label>
          <input id="reg-codigo-verif"
            type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6}
            placeholder="000000" autoFocus
            value={codigoVerif}
            onChange={e => setCodigoVerif(e.target.value.replace(/\D/g, '').slice(0, 6))}
            className="w-full text-center outline-none"
            style={{
              height: '68px', borderRadius: '14px', fontSize: '32px', fontWeight: 900,
              letterSpacing: '0.4em', background: 'var(--hc-surface-2)',
              border: '1.5px solid var(--hc-border)', color: 'var(--hc-text)',
            }}
          />
        </div>
      )}

      {error && <ErrMsg>{error}</ErrMsg>}

      {!otpFalló && (
        <button type="submit" disabled={loading || codigoVerif.length !== 6}
          className="hc-btn hc-btn-primary hc-btn-lg w-full disabled:opacity-50"
          style={{ background: 'var(--hc-primary)', borderColor: 'var(--hc-primary)', boxShadow: '0 4px 20px color-mix(in srgb, var(--hc-primary) 30%, transparent)' }}>
          {loading ? 'Verificando…' : 'Verificar y entrar al panel →'}
        </button>
      )}

      <button type="button" onClick={onReenviar} disabled={reenvioLoad}
        className="w-full text-center text-xs py-1.5 rounded-lg transition-opacity disabled:opacity-50"
        style={{ color: 'var(--hc-accent)', background: 'none', border: 'none', cursor: 'pointer' }}>
        {reenvioLoad ? 'Enviando…' : '¿No llegó el código? Reenviar →'}
      </button>
    </motion.form>
  )
}
