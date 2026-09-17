import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminPageHeader from '@/prototipo/admin/AdminPageHeader'
import { adminService } from '@/services/orderService'
import { useToast } from '@/components/ui/Toast'
import { mensajeErrorConfig } from './configUi'

const FRASE = 'ELIMINAR PLATAFORMA'

/**
 * Super admin: borra tiendas, usuarios y productos. Deja admin + 3 QA.
 */
export default function SuperAdminVaciarPlataforma() {
  const navigate = useNavigate()
  const toast = useToast()
  const [frase, setFrase] = useState('')
  const [borrando, setBorrando] = useState(false)
  const listo = frase.trim().toUpperCase() === FRASE

  async function vaciar() {
    if (!listo) return
    setBorrando(true)
    try {
      const { data } = await adminService.resetPlataformaQa(FRASE)
      const resumen = resumenDesde(data)
      toast({
        message: resumen || 'Se borraron tiendas, usuarios y productos. Quedan admin y las 3 cuentas QA.',
        type: 'success',
      })
      navigate('/admin/empresas')
    } catch (err: unknown) {
      toast({ message: mensajeErrorConfig(err, 'No se pudo vaciar la plataforma.'), type: 'error' })
    } finally {
      setBorrando(false)
    }
  }

  return (
    <div className="mx-auto max-w-md pb-10 md:max-w-xl">
      <AdminPageHeader
        titulo="Vaciar plataforma"
        subtitulo="Borra tiendas, usuarios y productos. Conserva admin y las 3 cuentas QA."
      />
      <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 dark:border-red-900/40 dark:bg-red-950/20">
        <p className="text-sm font-semibold text-red-700">Esto no se puede deshacer</p>
        <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-hc-muted">
          <li>Todos los productos</li>
          <li>Todas las tiendas que no sean admin ni QA</li>
          <li>Todos los usuarios registrados, excepto las 4 cuentas de prueba</li>
          <li>Pedidos, carritos y pagos asociados</li>
        </ul>
        <p className="mt-3 text-sm text-hc-text">
          Quedan: <span className="font-mono text-xs">admin@hotclick.com</span>, Emprendedor, Pyme y Negocio Plus.
        </p>
        <label className="mt-5 block text-xs font-semibold text-hc-muted" htmlFor="vaciar-frase">
          Escribí {FRASE} para confirmar
        </label>
        <input
          id="vaciar-frase"
          value={frase}
          onChange={(e) => setFrase(e.target.value)}
          autoComplete="off"
          className="mt-1.5 h-11 w-full rounded-xl border border-hc-border bg-hc-surface px-3 text-sm uppercase tracking-wide"
        />
        <div className="mt-4 flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/configuracion')}
            className="h-11 flex-1 rounded-xl border border-hc-border text-sm font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!listo || borrando}
            onClick={() => void vaciar()}
            className="h-11 flex-1 rounded-xl text-sm font-bold text-white disabled:opacity-40"
            style={{ background: listo ? '#dc2626' : 'rgba(220,38,38,0.35)' }}
          >
            {borrando ? 'Borrando…' : 'Vaciar ahora'}
          </button>
        </div>
      </div>
    </div>
  )
}

function resumenDesde(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const cuerpo = data as { message?: unknown; data?: { empresas?: unknown; usuarios?: unknown; productos?: unknown } }
  if (typeof cuerpo.message === 'string' && cuerpo.message.trim()) return cuerpo.message
  const r = cuerpo.data
  if (!r) return null
  return `Quedan ${String(r.empresas ?? '—')} tiendas, ${String(r.usuarios ?? '—')} usuarios y ${String(r.productos ?? '—')} productos.`
}
