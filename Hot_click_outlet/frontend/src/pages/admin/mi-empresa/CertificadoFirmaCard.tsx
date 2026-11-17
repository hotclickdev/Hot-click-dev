import { useState } from 'react'

import { validarFormatoPin } from './pinCert'

type Props = {
  tieneCert: boolean
  tienePin: boolean
  canEdit: boolean
  onSubirCert: (file: File) => void | Promise<void>
  onGuardarPin: (pin: string) => boolean | Promise<boolean>
}

function Estado({ ok, si, no }: Readonly<{ ok: boolean; si: string; no: string }>) {
  return (
    <span className={`text-xs font-semibold ${ok ? 'text-green-400' : 'text-yellow-400'}`}>
      {ok ? si : no}
    </span>
  )
}

/** Certificado de firma (.p12) y su PIN para emitir comprobantes electrónicos. El PIN nunca se precarga ni se muestra. */
export default function CertificadoFirmaCard({ tieneCert, tienePin, canEdit, onSubirCert, onGuardarPin }: Readonly<Props>) {
  const [pin, setPin] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [subiendo, setSubiendo] = useState(false)
  const [guardando, setGuardando] = useState(false)

  const subir = async (file: File | undefined) => {
    if (!file || subiendo) return
    setSubiendo(true)
    setPin('')
    try { await onSubirCert(file) } finally { setSubiendo(false) }
  }

  const guardar = async () => {
    const msg = validarFormatoPin(pin)
    setError(msg)
    if (msg || guardando) return
    setGuardando(true)
    try {
      if (await onGuardarPin(pin)) setPin('')
    } finally { setGuardando(false) }
  }

  return (
    <div className="rounded-2xl p-5 space-y-3"
      style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <div>
        <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>Certificado de firma</p>
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          Hacienda exige firmar los comprobantes con el certificado (.p12) de su negocio y su PIN.
        </p>
      </div>
      <div className="flex flex-wrap gap-x-6 gap-y-1">
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          Certificado: <Estado ok={tieneCert} si="subido" no="falta subirlo" />
        </p>
        <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
          PIN: <Estado ok={tienePin} si="guardado" no="falta guardarlo" />
        </p>
      </div>
      {canEdit && (
        <div className="space-y-3">
          <label className="block text-xs" style={{ color: 'var(--hc-muted)' }}>
            {tieneCert ? 'Reemplazar certificado (.p12)' : 'Subir certificado (.p12)'}
            <input
              type="file"
              accept=".p12"
              disabled={subiendo}
              onChange={e => { void subir(e.target.files?.[0]); e.target.value = '' }}
              className="mt-1 block w-full text-xs"
            />
          </label>
          <label className="block text-xs" style={{ color: 'var(--hc-muted)' }}>
            PIN del certificado
            <input
              type="password"
              autoComplete="new-password"
              value={pin}
              disabled={!tieneCert || guardando}
              onChange={e => { setPin(e.target.value); setError(null) }}
              className="mt-1 block w-full rounded-lg px-3 py-2 text-sm"
              style={{ backgroundColor: 'transparent', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }}
            />
          </label>
          <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>
            PIN de 4 dígitos (llaves anteriores) o de 14 caracteres (llaves nuevas: mayúscula, minúscula, número y carácter especial).
          </p>
          {error && <p role="alert" className="text-xs text-red-400">{error}</p>}
          <button
            type="button"
            disabled={!tieneCert || guardando || pin === ''}
            onClick={() => { void guardar() }}
            className="rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
          >
            {guardando ? 'Guardando…' : 'Guardar PIN'}
          </button>
        </div>
      )}
    </div>
  )
}
