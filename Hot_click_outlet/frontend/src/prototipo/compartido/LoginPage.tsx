import { Link, useNavigate } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'
import { BadgePlan, Boton, Campo } from './ui'
import { useSellerPlan, useSellerRuta } from './SellerPlanContext'

/**
 * Login de vendedor (Figma 151:576 / 151:663).
 *
 * CÓDIGO MUERTO: no importado ni montado en ningún Route. `SellerRoutes` y
 * `EmprendedorRoutes` redirigen `{base}/login` → `/login` (auth real).
 * Conservado como referencia Figma; no añadir wizard aquí salvo que vuelva a montarse.
 */
export default function LoginPage() {
  const plan = useSellerPlan()
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  return (
    <main className="flex min-h-dvh flex-col items-center px-6 pt-[120px]">
      <BrandLogo size={50} wordmarkSize={26} />
      <div className="mt-3">
        <BadgePlan texto={plan.badge} />
      </div>
      <p className="mt-4 text-center text-[13px] text-hc-muted">Iniciá sesión en tu cuenta de vendedor</p>
      <form
        className="mt-6 w-full"
        onSubmit={(evento) => {
          evento.preventDefault()
          navigate(ruta())
        }}
      >
        <Campo etiqueta="Usuario o correo" placeholder="usuario" />
        <Campo etiqueta="Contraseña" type="password" placeholder="••••••••" />
        <Boton type="submit">Iniciar sesión</Boton>
      </form>
      <p className="mt-5 text-center text-xs text-hc-muted">
        ¿No tenés cuenta?{' '}
        <Link to={ruta('registro')} className="font-bold text-hc-primary">Registrate</Link>
      </p>
    </main>
  )
}
