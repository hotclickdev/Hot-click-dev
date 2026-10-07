import { useEffect, useState, type FormEvent, type ReactNode } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { HotClickMark } from '@/components/ui/BrandLogo'
import useAuthStore from '@/store/authStore'
import { moderacionService } from '@/services/moderacionService'
import { consolaService } from './consola'
import { IconoDominio } from './iconos'

const NAV = [
  { id: 'inicio', label: 'Inicio', to: '/plataforma', exact: true },
  { id: 'negocios', label: 'Tiendas', to: '/plataforma/negocios' },
  { id: 'operacion', label: 'Pedidos', to: '/plataforma/pedidos' },
  { id: 'dinero', label: 'Quincena', to: '/plataforma/dinero', badge: 'dinero' },
  { id: 'moderacion', label: 'Revisar', to: '/plataforma/moderacion', badge: 'moderacion' },
  { id: 'negocios', label: 'CRM', to: '/plataforma/crm' },
  { id: 'inicio', label: 'Control', to: '/plataforma/control' },
  { id: 'operacion', label: 'Campo', to: '/plataforma/operacion', badge: 'operacion' },
  { id: 'seguridad', label: 'Acceso', to: '/plataforma/seguridad' },
  { id: 'ia', label: 'IA', to: '/plataforma/ia' },
  { id: 'reglas', label: 'Reglas', to: '/plataforma/reglas' },
] as const

/** Cascarón denso: riel azul, trabajo en cuadros y la cuenta arriba a la derecha. */
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

  async function buscar(event: FormEvent) {
    event.preventDefault()
    const q = consulta.trim()
    if (!q) {
      navigate('/plataforma/negocios')
      return
    }
    try {
      const respuesta = await consolaService.buscar(q)
      const data = respuesta.data
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const fila = data as { tipo?: string; id?: number }
        if (fila.tipo === 'pedido' && fila.id) {
          navigate(`/plataforma/pedidos/${fila.id}`)
          return
        }
        if (fila.tipo === 'tienda' && fila.id) {
          navigate(`/plataforma/negocios/${fila.id}`)
          return
        }
        if (fila.tipo === 'comprador' && fila.id) {
          navigate(`/plataforma/compradores/${fila.id}`)
          return
        }
      }
    } catch (err) {
      console.error(err)
    }
    navigate(`/plataforma/negocios?q=${encodeURIComponent(q)}`)
  }

  return (
    <div className="min-h-dvh bg-hc-n-100 text-hc-n-900">
      <Helmet><meta name="robots" content="noindex, nofollow" /></Helmet>
      <div className="flex min-h-dvh">
        <nav aria-label="Dominios de HotClick" className="sticky top-0 hidden h-dvh w-[232px] shrink-0 flex-col bg-hc-blue-600 px-3 py-4 text-white md:flex">
          <div className="mb-5 flex items-center gap-2 px-2">
            <span className="grid size-9 place-items-center rounded-xl bg-white">
              <HotClickMark size={22} />
            </span>
            <span className="font-display text-sm font-extrabold leading-4">HotClick<br />Admin</span>
          </div>
          <div className="flex flex-1 flex-col gap-1 overflow-y-auto">
            {NAV.map((item) => (
              <ItemNav key={item.to} item={item} cuenta={'badge' in item ? cuentas[item.badge] : undefined} />
            ))}
          </div>
        </nav>
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-hc-n-200 bg-white px-4">
            <span className="md:hidden"><HotClickMark size={26} /></span>
            <form onSubmit={buscar} className="min-w-0 flex-1">
              <label className="sr-only" htmlFor="buscar-negocio">Buscar tienda</label>
              <input
                id="buscar-negocio"
                value={consulta}
                onChange={(e) => setConsulta(e.target.value)}
                placeholder="Buscar tienda, pedido, comprador o cédula"
                className="h-11 w-full max-w-xl rounded-xl border border-hc-n-200 bg-hc-n-50 px-3 text-sm outline-none focus:border-hc-blue-600 focus:shadow-[0_0_0_3px_var(--hc-blue-100)]"
              />
            </form>
            <CuentaUsuario />
          </header>
          <nav aria-label="Dominios, vista compacta" className="flex gap-1 overflow-x-auto border-b border-hc-n-200 bg-white px-3 py-2 md:hidden">
            {NAV.map((item) => (
              <ItemNav key={`m-${item.to}`} item={item} cuenta={'badge' in item ? cuentas[item.badge] : undefined} compacto />
            ))}
          </nav>
          <main className="flex-1 px-4 py-4 md:px-6 md:py-5">{children}</main>
        </div>
      </div>
    </div>
  )
}

function ItemNav({
  item,
  cuenta,
  compacto = false,
}: {
  item: (typeof NAV)[number]
  cuenta?: number
  compacto?: boolean
}) {
  const pendiente = cuenta != null && cuenta > 0
  return (
    <NavLink
      to={item.to}
      end={'exact' in item && item.exact}
      className={({ isActive }) => `flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold ${
        compacto
          ? isActive ? 'bg-hc-blue-50 text-hc-blue-600' : 'text-hc-n-600'
          : isActive ? 'bg-white text-hc-blue-600' : 'text-white/85 hover:bg-white/10'
      }`}
    >
      <IconoDominio id={item.id} className="size-4 shrink-0" />
      <span className="truncate">{item.label}</span>
      {pendiente && (
        <span className={`ml-auto rounded-full px-1.5 text-[10px] font-bold ${compacto ? 'bg-hc-blue-600 text-white' : 'bg-hc-primary text-white'}`}>{cuenta}</span>
      )}
    </NavLink>
  )
}

function CuentaUsuario() {
  const navigate = useNavigate()
  const nombre = useAuthStore((s) => s.userName)
  const correo = useAuthStore((s) => s.userEmail)
  const logout = useAuthStore((s) => s.logout)
  const [abierta, setAbierta] = useState(false)
  const visible = nombre?.trim() || correo || 'Administrador'
  const inicial = visible.slice(0, 1).toUpperCase()

  function salir() {
    logout()
    navigate('/login')
  }

  return (
    <div className="relative">
      <button
        type="button"
        aria-expanded={abierta}
        aria-haspopup="menu"
        onClick={() => setAbierta((v) => !v)}
        className="flex h-11 items-center gap-2 rounded-xl border border-hc-n-200 bg-white pl-1.5 pr-3"
      >
        <span className="grid size-8 place-items-center rounded-lg bg-hc-blue-600 font-display text-sm font-bold text-white">{inicial}</span>
        <span className="hidden text-left sm:block">
          <span className="block max-w-36 truncate text-sm font-semibold leading-4">{visible}</span>
          <span className="block text-[11px] font-medium text-hc-n-600">Administrador</span>
        </span>
      </button>
      {abierta && (
        <div role="menu" className="absolute right-0 top-12 z-30 w-64 rounded-[14px] border border-hc-n-200 bg-white p-3">
          <p className="font-display text-base font-bold">{visible}</p>
          <p className="truncate text-xs text-hc-n-600">{correo}</p>
          <p className="mt-2 text-xs font-semibold text-hc-blue-600">Usted es el administrador, no un vendedor.</p>
          <button type="button" className="mt-3 h-10 w-full rounded-xl bg-hc-n-100 text-sm font-semibold" onClick={() => { setAbierta(false); navigate('/plataforma/cuenta') }}>
            Ver la cuenta
          </button>
          <button type="button" className="mt-2 h-10 w-full rounded-xl bg-hc-primary text-sm font-semibold text-white" onClick={salir}>
            Salir
          </button>
        </div>
      )}
    </div>
  )
}
