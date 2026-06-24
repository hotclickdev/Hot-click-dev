import { useState } from 'react'
import { webAuthnService } from '@/services/webAuthnService'

export default function WebAuthnStep({ correo, onSuccess, onError }) {
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const handleAuthenticate = async () => {
    setLoading(true)
    setMsg('')
    try {
      const data = await webAuthnService.authenticate(correo)
      onSuccess(data)
    } catch (err) {
      const text = err?.response?.data?.error || err?.message || 'Autenticación fallida'
      if (text.includes('cancelled') || text.includes('NotAllowedError')) {
        setMsg('Operación cancelada. Intentá de nuevo.')
      } else {
        onError(text)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center gap-6 py-4">
      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center">
        <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
        </svg>
      </div>

      <div className="text-center">
        <h3 className="text-lg font-semibold text-neutral-900">Verificar con llave de seguridad</h3>
        <p className="text-sm text-neutral-500 mt-1">
          Conectá tu llave USB o activá la verificación por NFC/Bluetooth.
        </p>
      </div>

      {msg && (
        <p className="text-sm text-amber-600 bg-amber-50 px-4 py-2 rounded-lg">{msg}</p>
      )}

      <button
        onClick={handleAuthenticate}
        disabled={loading}
        className="w-full py-3 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors"
      >
        {loading ? 'Esperando llave...' : 'Usar llave de seguridad'}
      </button>

      <p className="text-xs text-neutral-400">
        Iniciando sesión como <span className="font-medium">{correo}</span>
      </p>
    </div>
  )
}
