import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { adminService } from '@/services/orderService'

/** Banner persistente mientras un ADMIN está impersonando el negocio de otro usuario (soporte). */
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
      navigate('/admin/empresas')
    }
  }

  return (
    <div
      className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm"
      style={{ backgroundColor: '#78350f', borderBottom: '1px solid #d97706' }}
    >
      <div className="flex items-center gap-2 min-w-0">
        <svg className="w-4 h-4 shrink-0" style={{ color: '#fde68a' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM4 21c0-4.418 3.582-7 8-7s8 2.582 8 7" />
        </svg>
        <span style={{ color: '#fff' }} className="truncate">
          Estás viendo como <strong>{empresaNombre || 'esta empresa'}</strong> — modo soporte
        </span>
      </div>
      <button type="button"
        onClick={salir}
        disabled={saliendo}
        className="shrink-0 px-3 py-1 rounded-lg text-xs font-semibold transition-opacity hover:opacity-80 disabled:opacity-60"
        style={{ backgroundColor: '#fde68a', color: '#1a1a1a' }}
      >
        {saliendo ? 'Saliendo…' : 'Salir'}
      </button>
    </div>
  )
}
