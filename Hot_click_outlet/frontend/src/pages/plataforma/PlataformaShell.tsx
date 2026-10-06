import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import { NavLink, useNavigate } from 'react-router-dom'
import { HotClickMark } from '@/components/ui/BrandLogo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { moderacionService } from '@/services/moderacionService'
import { IconoDominio } from './iconos'

const DOMINIOS = [
  { id: 'inicio', corto: 'Estadísticas', to: '/plataforma', exact: true },
  { id: 'negocios', corto: 'Tiendas', to: '/plataforma/negocios' },
  { id: 'moderacion', corto: 'Revisar', to: '/plataforma/moderacion' },
  { id: 'dinero', corto: 'Dinero', to: '/plataforma/dinero' },
  { id: 'operacion', corto: 'Campo', to: '/plataforma/operacion' },
  { id: 'seguridad', corto: 'Acceso', to: '/plataforma/seguridad' },
  { id: 'ia', corto: 'IA', to: '/plataforma/ia' },
  { id: 'reglas', corto: 'Reglas', to: '/plataforma/reglas' },
] as const

type Dominio = (typeof DOMINIOS)[number]

/** Marco claro: riel de íconos, búsqueda arriba y el trabajo en el centro. */
export default function PlataformaShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [consulta, setConsulta] = useState('')
  const [cuentas, setCuentas] = useState<Record<string, number>>({})

  useEffect(() => {
    moderacionService.resumen()
      .then((resumen) => {
        setCuentas({
          moderacion: resumen.empresas + resumen.ofertas + resumen.testimonios + resumen.cuentasCobro + resumen.reportesProducto,
          dinero: resumen.sinpe + resumen.payouts,
          operacion: resumen.recolecciones,
        })
      })
      .catch((err: unknown) => console.error(err))
  }, [])

  function buscar(event: FormEvent) {
    event.preventDefault()
    const q = consulta.trim()
    navigate(q ? `/plataforma/negocios?q=${encodeURIComponent(q)}` : '/plataforma/negocios')
  }

  return (
    <div className="hc-superadmin-theme min-h-dvh bg-hc-n-100 text-hc-n-900 md:p-3">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="flex min-h-dvh overflow-hidden bg-white md:min-h-[calc(100dvh-24px)] md:rounded-[16px] md:border md:border-hc-n-200">
        <nav aria-label="Dominios de HotClick" className="hc-admin-sidebar flex gap-1 overflow-x-auto border-b border-hc-n-200 bg-white px-2 py-2 md:w-[92px] md:flex-col md:overflow-y-auto md:border-b-0 md:border-r md:px-2 md:py-3">
          <div className="hidden justify-center pb-3 md:flex">
            <HotClickMark size={28} />
          </div>
          {DOMINIOS.map((dominio) => (
            <ItemNav key={dominio.id} dominio={dominio} cuenta={cuentas[dominio.id]} />
          ))}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col bg-hc-n-50">
          <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-hc-n-200 bg-white px-4 py-3">
            <span className="md:hidden"><HotClickMark size={28} /></span>
            <form onSubmit={buscar} className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="buscar-negocio">Buscar tienda</label>
              <input
                id="buscar-negocio"
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                placeholder="Buscar tienda"
                className="h-11 w-full rounded-xl border border-hc-n-200 bg-hc-n-50 px-3 text-sm outline-none focus:border-hc-blue-600 focus:shadow-[0_0_0_3px_var(--hc-blue-100)]"
              />
            </form>
            <ThemeToggle className="min-h-11 min-w-11" />
          </header>
          <main className="px-4 py-5 md:px-6">{children}</main>
        </div>
      </div>
    </div>
  )
}

function ItemNav({ dominio, cuenta }: { dominio: Dominio; cuenta?: number }) {
  const pendiente = cuenta != null && cuenta > 0
  return (
    <NavLink
      to={dominio.to}
      end={'exact' in dominio && dominio.exact}
      aria-label={pendiente ? `${dominio.corto}, ${cuenta} pendientes` : dominio.corto}
      className={({ isActive }) => `flex shrink-0 flex-col items-center gap-1 rounded-xl px-2 py-2 text-center text-[11px] font-semibold leading-tight md:w-full ${isActive ? 'bg-hc-blue-50 text-hc-blue-600' : 'text-hc-n-600'}`}
    >
      <span className="relative">
        <IconoDominio id={dominio.id} />
        {pendiente && (
          <span aria-hidden className="absolute -right-2 -top-1.5 min-w-4 rounded-full bg-hc-blue-600 px-1 text-center text-[10px] leading-4 text-white">
            {cuenta}
          </span>
        )}
      </span>
      {dominio.corto}
    </NavLink>
  )
}
