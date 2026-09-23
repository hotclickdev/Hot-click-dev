import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AdminPageHeader from '@/prototipo/admin/AdminPageHeader'
import { AdminMenuRow } from '@/prototipo/admin/AdminUi'
import { billingService } from '@/services/billingService'
import useAuthStore from '@/store/authStore'
import { etiquetaComisionDesdePlanes, LINKS_CONFIG_ADMIN } from './superAdminConfigHelpers'

/**
 * Config Super Admin (Figma 43:128) con rutas y comisión reales.
 */
export default function SuperAdminConfig() {
  const navigate = useNavigate()
  const logout = useAuthStore((s) => s.logout)
  const [comision, setComision] = useState('—')

  useEffect(() => {
    let cancelado = false
    billingService.getPlanes()
      .then(({ data }) => {
        if (!cancelado) setComision(etiquetaComisionDesdePlanes(data))
      })
      .catch((err: unknown) => {
        console.error(err)
      })
    return () => { cancelado = true }
  }, [])

  function cerrarSesion() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="mx-auto max-w-md pb-10 md:max-w-4xl">
      <AdminPageHeader
        titulo="Configuración"
        subtitulo="Ajustes generales de la plataforma"
      />
      <div className="flex min-h-14 items-center justify-between border-b border-hc-border">
        <p className="text-sm font-medium">Comisión de la plataforma</p>
        <p className="text-[13px] text-hc-muted">{comision}</p>
      </div>
      <ul data-mm="config-menu">
        {LINKS_CONFIG_ADMIN.map((item) => (
          <li key={item.to} className="border-b border-hc-border">
            <AdminMenuRow to={item.to} label={item.label} />
          </li>
        ))}
        <li className="border-b border-hc-border">
          <AdminMenuRow label="Cerrar sesión" onClick={cerrarSesion} peligro />
        </li>
      </ul>
    </div>
  )
}
