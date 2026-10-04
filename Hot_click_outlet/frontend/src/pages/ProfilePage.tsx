import { useState, useEffect, useMemo, useRef } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import MainLayout from '@/layouts/MainLayout'
import useAuthStore from '@/store/authStore'
import useWishlistStore from '@/store/wishlistStore'
import { useToast } from '@/components/ui/Toast'
import { orderService, adminService } from '@/services/orderService'
import { authService } from '@/services/authService'
import { servicioService } from '@/services/servicioService'
import { testimonioService } from '@/services/testimonioService'
import AdminWebAuthnSetup from '@/components/admin/AdminWebAuthnSetup'
import { useEsDesktop } from '@/pages/checkout/useEsDesktop'
import EmpresaCard from './perfil/EmpresaCard'
import ProfileDatosCard from './perfil/ProfileDatosCard'
import ChangePasswordModal from './perfil/ChangePasswordModal'
import TwoFAModal from './perfil/TwoFAModal'
import CuentaResumen from './perfil/cuenta/CuentaResumen'
import CuentaOpiniones from './perfil/cuenta/CuentaOpiniones'
import CuentaSeguridad from './perfil/cuenta/CuentaSeguridad'
import MenuLateralCuenta, { type SeccionCuenta } from './perfil/cuenta/MenuLateralCuenta'
import { construirEventos, pedidoEnCurso, type OpinionEnviada, type ProductoPorOpinar } from './perfil/cuenta/cuentaHelpers'
import { listaPedidosDesdeRespuesta, flagCampoApi } from './perfil/perfilHelpers'
import type { SolicitudBusqueda } from './servicios/serviciosHelpers'
import type { PedidoCliente } from './pedidos/pedidoHelpers'

type Vista = 'resumen' | 'opiniones' | 'seguridad'

/** El interceptor de `api` ya desenvuelve `{ success, data }`: la lista llega directa; se acepta también el sobre. */
function extraerLista<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data
    if (Array.isArray(inner)) return inner as T[]
  }
  return []
}

function textoDe(data: unknown, campo: string): string | null {
  if (!data || typeof data !== 'object') return null
  const raiz = 'data' in data ? (data as { data: unknown }).data : data
  if (!raiz || typeof raiz !== 'object') return null
  const valor = (raiz as Record<string, unknown>)[campo]
  return typeof valor === 'string' && valor.trim() ? valor : null
}

/** `/perfil` (Mi cuenta): resumen, y por `?vista=` las subpantallas de Figma sin tocar `AppRoutes`. */
function vistaDesdeUrl(busqueda: URLSearchParams, hash: string): Vista {
  const vista = busqueda.get('vista')
  if (vista === 'opiniones' || hash === '#opinion') return 'opiniones'
  if (vista === 'seguridad' || hash === '#seguridad') return 'seguridad'
  return 'resumen'
}

export default function ProfilePage() {
  const navigate = useNavigate()
  const toast = useToast()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { hash } = useLocation()
  const [busqueda] = useSearchParams()
  const vista = vistaDesdeUrl(busqueda, hash)
  const esDesktop = useEsDesktop()

  const userId = useAuthStore((s) => s.userId)
  const userName = useAuthStore((s) => s.userName)
  const userEmail = useAuthStore((s) => s.userEmail)
  const userRole = useAuthStore((s) => s.userRole)
  const empresaNombre = useAuthStore((s) => s.empresaNombre)
  const empresaSlug = useAuthStore((s) => s.empresaSlug)
  const logout = useAuthStore((s) => s.logout)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const favoritos = useWishlistStore((s) => s.items.length)

  const [orders, setOrders] = useState<PedidoCliente[]>([])
  const [twoFAEnabled, setTwoFAEnabled] = useState(false)
  const [show2FASetup, setShow2FASetup] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)

  useEffect(() => {
    if (!userId) return
    orderService.getByUser(userId)
      .then(({ data }) => setOrders(listaPedidosDesdeRespuesta(data && typeof data === 'object' && 'data' in data ? (data as { data: unknown }).data : data)))
      .catch(() => toast({ message: t('cuenta.errorPedidos'), type: 'error' }))
  }, [userId]) // eslint-disable-line react-hooks/exhaustive-deps -- montaje por userId

  useEffect(() => {
    authService.get2FAStatus()
      .then(({ data }) => setTwoFAEnabled(flagCampoApi(data, 'enabled') ?? false))
      .catch(() => toast({ message: t('cuenta.error2FA'), type: 'error' }))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps -- montaje único

  // Mismos datos que ya cargan Servicios HOT y las opiniones: sin endpoint nuevo.
  const { data: solicitudes = [] } = useQuery({
    queryKey: ['mis-solicitudes-servicio'],
    queryFn: () => servicioService.misSolicitudes().then((r) => extraerLista<SolicitudBusqueda>(r.data)),
    enabled: !!userId,
  })
  const { data: porOpinar = [] } = useQuery({
    queryKey: ['productos-para-resenar'],
    queryFn: () => testimonioService.getProductosParaResenar().then((r) => extraerLista<ProductoPorOpinar>(r.data)),
    enabled: !!userId,
  })
  const { data: opiniones = [] } = useQuery({
    queryKey: ['mis-testimonios'],
    queryFn: () => testimonioService.getMisTestimonios().then((r) => extraerLista<OpinionEnviada>(r.data)),
    enabled: !!userId && vista === 'opiniones',
  })
  const { data: telefono = null } = useQuery({
    queryKey: ['usuario-telefono', userId],
    queryFn: () => adminService.getUsuario(userId as number).then((r) => textoDe(r.data, 'telefono')),
    enabled: !!userId && vista === 'seguridad',
  })

  // La sesión se limpia al salir de /perfil: si se limpiara antes, la ruta protegida redirigiría a /login con retorno a /perfil.
  const cerrandoSesion = useRef(false)
  useEffect(() => () => { if (cerrandoSesion.current) logout() }, [logout])

  const handleLogout = () => {
    authService.logout().catch(() => { /* ok */ })
    toast({ message: t('profile.loggedOut'), type: 'info' })
    cerrandoSesion.current = true
    navigate('/', { replace: true })
  }

  const enCurso = useMemo(() => pedidoEnCurso(orders), [orders])
  const eventos = useMemo(() => construirEventos(orders, solicitudes, porOpinar), [orders, solicitudes, porOpinar])
  const alEnviarOpinion = () => {
    void queryClient.invalidateQueries({ queryKey: ['mis-testimonios'] })
    void queryClient.invalidateQueries({ queryKey: ['productos-para-resenar'] })
  }

  const cerrarCuenta = () => {
    authService.logout().catch(() => { /* ok */ })
    logout()
    toast({ message: t('profile.arcoCloseOk'), type: 'info' })
    navigate('/')
  }

  const extraResumen = userRole === 'EMPRENDEDOR' && empresaNombre
    ? <div className="px-4 pb-5 lg:px-0"><EmpresaCard empresaNombre={empresaNombre} empresaSlug={empresaSlug} /></div>
    : null

  const tarjetaArco = vista === 'resumen'
    ? <ProfileDatosCard onCerrada={cerrarCuenta} />
    : null

  const contenido = vista === 'opiniones'
    ? <CuentaOpiniones porOpinar={porOpinar} pedidos={orders} opiniones={opiniones} onEnviada={alEnviarOpinion} />
    : vista === 'seguridad'
      ? (
        <CuentaSeguridad
          nombre={userName}
          correo={userEmail}
          telefono={telefono}
          twoFAActiva={twoFAEnabled}
          puedeCambiar2FA={isAdmin()}
          onCambiarContrasena={() => setShowChangePassword(true)}
          onCambiar2FA={() => setShow2FASetup(true)}
          onCerrarSesion={handleLogout}
          extra={userRole === 'ADMIN' ? <AdminWebAuthnSetup /> : null}
        />
      )
      : (
        <CuentaResumen
          nombre={userName}
          correo={userEmail}
          esDesktop={esDesktop}
          pedidos={orders}
          pedidoEnCurso={enCurso}
          solicitudes={solicitudes}
          porOpinar={porOpinar}
          favoritos={favoritos}
          twoFAActiva={twoFAEnabled}
          eventos={eventos}
        />
      )

  const titulo = vista === 'opiniones' ? t('cuenta.menu.opiniones') : vista === 'seguridad' ? t('cuenta.menu.seguridad') : t('cuenta.menu.resumen')
  const seccion: SeccionCuenta = vista
  const modales = (
    <>
      <ChangePasswordModal open={showChangePassword} onClose={() => setShowChangePassword(false)} refreshToken={null} figma={userRole === 'USUARIO_FINAL'} />
      {isAdmin() && (
        <TwoFAModal open={show2FASetup} onClose={() => setShow2FASetup(false)} enabled={twoFAEnabled} onToggle={(val) => setTwoFAEnabled(val)} figma={userRole === 'USUARIO_FINAL'} />
      )}
    </>
  )

  if (esDesktop) {
    return (
      <MainLayout encabezadoEscritorio="compacto">
        <div className="mx-auto flex w-[calc(100%-4rem)] max-w-[1200px] items-start gap-10 pb-10 pt-8">
          <MenuLateralCuenta activa={seccion} nombre={userName} correo={userEmail} onCerrarSesion={handleLogout} />
          <div className="flex min-w-0 flex-1 flex-col gap-5">
            {vista !== 'resumen' && <h1 className="font-display text-[28px] font-bold leading-[normal] text-hc-n-900">{titulo}</h1>}
            {contenido}
            {tarjetaArco}
            {vista === 'resumen' && extraResumen}
          </div>
        </div>
        {modales}
      </MainLayout>
    )
  }

  return vista === 'resumen' ? (
    <MainLayout variante="propia">
      {contenido}
      {tarjetaArco}
      {extraResumen}
      {modales}
    </MainLayout>
  ) : (
    <MainLayout variante="interna" titulo={titulo} esTituloPrincipal atras="/perfil">
      {contenido}
      {modales}
    </MainLayout>
  )
}
