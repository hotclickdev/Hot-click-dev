import { useNavigate } from 'react-router-dom'
import type { FormEvent } from 'react'
import BrandLogo from '@/components/ui/BrandLogo'
import { AdminField, AdminPrimaryButton, fieldClass } from './AdminUi'

/**
 * Admin 00 — Login (Figma 59:294).
 */
export default function AdminLoginPage() {
  const navigate = useNavigate()

  function entrar(e: FormEvent) {
    e.preventDefault()
    navigate('/prototipo/admin/dashboard')
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center bg-hc-surface px-6 pt-28">
      <BrandLogo size={38} wordmarkSize={30} />
      <p className="mt-4 rounded-full bg-hc-text px-2.5 py-1 text-[10px] font-bold tracking-wide text-hc-surface">
        PANEL ADMINISTRADOR
      </p>
      <p className="mt-4 text-center text-[13px] text-hc-muted">
        Acceso exclusivo para el equipo de HotClick
      </p>
      <form onSubmit={entrar} className="mt-6 flex w-full flex-col gap-6">
        <AdminField id="admin-correo" label="Correo corporativo">
          <input
            id="admin-correo"
            type="email"
            name="correo"
            defaultValue="admin@hotclick.lat"
            autoComplete="username"
            className={fieldClass}
          />
        </AdminField>
        <AdminField id="admin-clave" label="Contraseña">
          <input
            id="admin-clave"
            type="password"
            name="clave"
            defaultValue="prototipo"
            autoComplete="current-password"
            className={fieldClass}
          />
        </AdminField>
        <AdminPrimaryButton type="submit">Iniciar sesión</AdminPrimaryButton>
      </form>
    </main>
  )
}
