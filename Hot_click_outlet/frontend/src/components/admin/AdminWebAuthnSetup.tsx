import { useState, useEffect } from 'react'
import { webAuthnService } from '@/services/webAuthnService'

type WebAuthnMsg = { text: string; type: 'success' | 'error' }

function textoErrorRegistroLlave(err: unknown): string {
  if (!err || typeof err !== 'object') return 'Error al registrar la llave'
  const e = err as { response?: { data?: { error?: string } }; message?: string }
  return e.response?.data?.error || e.message || 'Error al registrar la llave'
}

export default function AdminWebAuthnSetup() {
  const [hasKey, setHasKey]     = useState(false)
  const [loading, setLoading]   = useState(true)
  const [working, setWorking]   = useState(false)
  const [msg, setMsg]           = useState<WebAuthnMsg | null>(null)   // { text, type: 'success'|'error' }
  const [deviceName, setDeviceName] = useState('Llave de seguridad')

  useEffect(() => {
    webAuthnService.hasCredentials()
      .then(v => setHasKey(v))
      .catch((err: unknown) => { console.error('[AdminWebAuthnSetup] hasCredentials', err) })
      .finally(() => setLoading(false))
  }, [])

  const handleRegister = async () => {
    setWorking(true)
    setMsg(null)
    try {
      await webAuthnService.registerKey(deviceName)
      setHasKey(true)
      setMsg({ text: 'Llave registrada correctamente.', type: 'success' })
    } catch (err: unknown) {
      const text = textoErrorRegistroLlave(err)
      if (text.includes('cancelled') || text.includes('NotAllowedError')) {
        setMsg({ text: 'Registro cancelado.', type: 'error' })
      } else {
        setMsg({ text, type: 'error' })
      }
    } finally {
      setWorking(false)
    }
  }

  if (loading) return null

  return (
    <div className="rounded-2xl border border-neutral-200 p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
          <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
          </svg>
        </div>
        <div>
          <h3 className="font-semibold text-neutral-900">Llave de seguridad (WebAuthn)</h3>
          <p className="text-sm text-neutral-500">
            {hasKey
              ? 'Tienes una llave de seguridad registrada. Al iniciar sesión se te pedirá usarla.'
              : 'Registrá una llave USB, NFC o Bluetooth para requerir autenticación física al ingresar.'}
          </p>
        </div>
      </div>

      {!hasKey && (
        <div className="space-y-3">
          <div>
            <label htmlFor="webauthn-device-name" className="text-sm font-medium text-neutral-700 block mb-1">
              Nombre del dispositivo
            </label>
            <input
              id="webauthn-device-name"
              type="text"
              value={deviceName}
              onChange={e => setDeviceName(e.target.value)}
              placeholder="Ej: YubiKey 5, Titan Key..."
              className="w-full border border-neutral-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button type="button"
            onClick={handleRegister}
            disabled={working}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {working ? 'Esperando llave...' : 'Registrar llave de seguridad'}
          </button>
        </div>
      )}

      {hasKey && (
        <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-4 py-2.5 rounded-xl">
          <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
          </svg>
          Llave activa — requerida en cada inicio de sesión
        </div>
      )}

      {msg && (
        <p className={`text-sm px-4 py-2.5 rounded-xl ${
          msg.type === 'success'
            ? 'bg-green-50 text-green-700'
            : 'bg-red-50 text-red-700'
        }`}>
          {msg.text}
        </p>
      )}
    </div>
  )
}
