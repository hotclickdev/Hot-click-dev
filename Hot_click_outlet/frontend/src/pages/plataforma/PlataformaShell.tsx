import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { Helmet } from 'react-helmet-async'
import { NavLink, useNavigate } from 'react-router-dom'
import { HotClickMark } from '@/components/ui/BrandLogo'
import ThemeToggle from '@/components/ui/ThemeToggle'
import { moderacionService } from '@/services/moderacionService'

const DOMINIOS = [
  { id: 'inicio', label: 'Inicio', to: '/plataforma', exact: true },
  { id: 'negocios', label: 'Negocios', to: '/plataforma/negocios' },
  { id: 'moderacion', label: 'Moderación', to: '/plataforma/moderacion' },
  { id: 'dinero', label: 'Dinero', to: '/plataforma/dinero' },
  { id: 'operacion', label: 'Operación', to: '/plataforma/operacion' },
  { id: 'seguridad', label: 'Seguridad', to: '/plataforma/seguridad' },
  { id: 'ia', label: 'IA', to: '/plataforma/ia' },
  { id: 'reglas', label: 'Plataforma', to: '/plataforma/reglas' },
] as const

const BARRA = ['inicio', 'negocios', 'moderacion', 'dinero'] as const

/** Shell de la consola. Derivado del manual Figma 4:2 (tarjetas, chips, segmentado) y de la arquitectura de ocho dominios. */
export default function PlataformaShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [consulta, setConsulta] = useState('')
  const [hoja, setHoja] = useState(false)
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
    <div className="hc-superadmin-theme min-h-dvh bg-hc-n-50 text-hc-n-900">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <aside className="hc-admin-sidebar fixed inset-y-0 left-0 z-20 hidden w-[230px] flex-col border-r border-hc-n-200 bg-white md:flex">
        <Marca />
        <nav aria-label="Dominios de HotClick" className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 pb-4">
          {DOMINIOS.map((dominio) => (
            <ItemNav key={dominio.id} {...dominio} cuenta={cuentas[dominio.id]} />
          ))}
        </nav>
      </aside>
      <div className="md:pl-[230px]">
        <header className="flex items-center gap-3 border-b border-hc-n-200 bg-white px-4 py-3">
          <form onSubmit={buscar} className="min-w-0 flex-1">
            <label className="sr-only" htmlFor="buscar-negocio">Buscar negocio</label>
            <input
              id="buscar-negocio"
              value={consulta}
              onChange={(e) => setConsulta(e.target.value)}
              placeholder="Buscar negocio por nombre o slug"
              className="h-12 w-full rounded-xl border border-hc-n-200 bg-hc-n-50 px-3 text-sm outline-none focus:border-hc-blue-600 focus:shadow-[0_0_0_3px_var(--hc-blue-100)]"
            />
          </form>
          <div className="md:hidden"><ThemeToggle className="min-h-11 min-w-11" /></div>
        </header>
        <main className="px-4 py-4 pb-24 md:pb-8">{children}</main>
      </div>
      <nav aria-label="Colas del día" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-hc-n-200 bg-white md:hidden">
        {DOMINIOS.filter((d) => (BARRA as readonly string[]).includes(d.id)).map((dominio) => (
          <ItemNav key={dominio.id} {...dominio} cuenta={cuentas[dominio.id]} compacto />
        ))}
        <button type="button" className="flex-1 py-2 text-xs font-semibold text-hc-n-600" onClick={() => setHoja(true)}>
          Dominios
        </button>
      </nav>
      {hoja && (
        <div className="fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setHoja(false)}>
          <div className="absolute inset-x-0 bottom-0 rounded-t-2xl bg-white p-4" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Dominios">
            {DOMINIOS.filter((d) => !(BARRA as readonly string[]).includes(d.id)).map((dominio) => (
              <ItemNav key={dominio.id} {...dominio} cuenta={cuentas[dominio.id]} onPick={() => setHoja(false)} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function Marca() {
  return (
    <div className="flex items-center justify-between px-3 pb-3 pt-[18px]">
      <div className="flex items-center gap-2">
        <HotClickMark size={28} />
        <span className="font-display text-sm font-bold text-hc-n-900">Consola</span>
      </div>
      <ThemeToggle className="min-h-11 min-w-11" />
    </div>
  )
}

function ItemNav({ to, label, exact, cuenta, compacto, onPick }: {
  to: string
  label: string
  exact?: boolean
  cuenta?: number
  compacto?: boolean
  onPick?: () => void
}) {
  return (
    <NavLink
      to={to}
      end={exact}
      onClick={onPick}
      className={({ isActive }) => `${compacto ? 'flex-1 py-2 text-center text-[11px]' : 'flex items-center justify-between rounded-xl px-3 py-2 text-sm'} font-semibold ${isActive ? 'bg-hc-blue-50 text-hc-blue-600' : 'text-hc-n-600'}`}
    >
      <span>{label}</span>
      {cuenta != null && cuenta > 0 && (
        <span className="ml-2 rounded-full bg-hc-red-50 px-2 py-0.5 text-[11px] text-hc-primary-text">{cuenta}</span>
      )}
    </NavLink>
  )
}
