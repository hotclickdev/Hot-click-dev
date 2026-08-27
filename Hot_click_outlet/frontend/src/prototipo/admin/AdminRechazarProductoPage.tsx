import { useNavigate, useSearchParams } from 'react-router-dom'
import type { FormEvent } from 'react'
import { productoPorId } from './adminData'
import { AdminDangerButton, AdminField, AdminSecondaryButton, fieldClass } from './AdminUi'

/**
 * Admin 09 — Rechazar producto (Figma 48:235).
 */
export default function AdminRechazarProductoPage() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const producto = productoPorId(params.get('producto') ?? '')

  function confirmar(e: FormEvent) {
    e.preventDefault()
    navigate('/prototipo/admin/moderacion')
  }

  return (
    <main className="mx-auto max-w-md px-5 pb-10 pt-14">
      <h1 className="font-display text-xl font-bold">Rechazar producto</h1>
      <p className="mt-3 text-sm text-hc-muted">
        Este motivo se le va a enviar al vendedor para que corrija la publicación.
        {producto ? ` (${producto.nombre})` : ''}
      </p>
      <form onSubmit={confirmar} className="mt-6">
        <AdminField id="motivo-rechazo" label="Motivo del rechazo">
          <textarea
            id="motivo-rechazo"
            name="motivo"
            required
            rows={3}
            placeholder="Ej: Las fotos no coinciden con la descripción del producto."
            className={`${fieldClass} min-h-[68px] py-3`}
          />
        </AdminField>
        <div className="mt-8 flex flex-col gap-3">
          <AdminDangerButton type="submit">Confirmar rechazo</AdminDangerButton>
          <AdminSecondaryButton to="/prototipo/admin/moderacion">Cancelar</AdminSecondaryButton>
        </div>
      </form>
    </main>
  )
}
