import { Link, useNavigate } from 'react-router-dom'
import { Boton, Campo, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'

/**
 * Registro de vendedor (Figma 154:265 / 154:416).
 *
 * CÓDIGO MUERTO: no importado ni montado en ningún Route. `SellerRoutes` y
 * `EmprendedorRoutes` redirigen `{base}/registro` → `/registro` (auth real).
 * Conservado como referencia Figma; no añadir wizard aquí salvo que vuelva a montarse.
 */
export default function RegistroPage() {
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  return (
    <main className="px-6 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Creá tu cuenta" volverA={ruta('login')} />
      <p className="mb-4 text-sm text-hc-muted">Empezá a vender en HotClick Outlet & Marketplace</p>
      <form onSubmit={(evento) => { evento.preventDefault(); navigate(ruta()) }}>
        <Campo etiqueta="Nombre de tu tienda" placeholder="Ej: TechZone CR" />
        <Campo etiqueta="Correo" placeholder="vos@ejemplo.com" type="email" />
        <Campo etiqueta="Contraseña" type="password" placeholder="••••••••" />
        <Boton type="submit">Crear cuenta</Boton>
      </form>
      <p className="mt-4 text-center text-xs">
        <Link to={ruta('login')} className="text-hc-accent">Ya tengo cuenta</Link>
      </p>
    </main>
  )
}
