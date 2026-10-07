import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { adminService } from '@/services/orderService'

/** Banner persistente mientras un ADMIN ve un negocio en modo soporte. */
export default function ImpersonacionBanner() {
  const impersonando = useAuthStore((s) => s.impersonando)
  const empresaNombre = useAuthStore((s) => s.empresaNombre)
  const empresaId = useAuthStore((s) => s.empresaId)
  const salirImpersonacion = useAuthStore((s) => s.salirImpersonacion)
  const [saliendo, setSaliendo] = useState(false)
  const navigate = useNavigate()

  if (!impersonando) return null

  async function salir() {
    setSaliendo(true)
    try {
      if (empresaId) await adminService.finalizarImpersonacion(empresaId)
    } catch {
      // el token expira solo (30 min); no bloquear la salida por un error de auditoría
    } finally {
      salirImpersonacion()
      navigate('/plataforma')
    }
  }

  return (
    <div
      className="flex items-center justify-between gap-3 border-b border-hc-primary bg-hc-primary px-4 py-2.5 text-sm text-white"
      data-mm="impersonacion-banner"
    >
      <p className="min-w-0 truncate">
        Usted es el administrador, no el usuario. Está en <strong>{empresaNombre || 'esta tienda'}</strong>.
      </p>
      <button type="button"
        onClick={salir}
        disabled={saliendo}
        className="shrink-0 rounded-lg bg-white px-3 py-1 text-xs font-semibold text-hc-primary disabled:opacity-60"
      >
        {saliendo ? 'Volviendo…' : 'Salir a la consola'}
      </button>
    </div>
  )
}
