import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import BrandLogo from '@/components/ui/BrandLogo'
import BotonPrimario from '../ui/BotonPrimario'
import CampoTexto from '../ui/CampoTexto'
import { CUENTA_DEMO, RUTA_EMPRENDEDOR } from '../constants'

/**
 * Paso 0 Login (Figma 59:152).
 */
export default function LoginPage() {
  const navigate = useNavigate()
  const [usuario, setUsuario] = useState<string>(CUENTA_DEMO.usuario)
  const [clave, setClave] = useState<string>('••••••••')

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center gap-6 px-6 pt-[120px]">
      <BrandLogo size={38} wordmarkSize={30} />
      <p className="text-center text-[13px] text-hc-muted">Iniciá sesión en tu cuenta de vendedor</p>
      <form
        className="flex w-full flex-col gap-6"
        onSubmit={(evento) => {
          evento.preventDefault()
          navigate(RUTA_EMPRENDEDOR)
        }}
      >
        <CampoTexto etiqueta="Usuario o correo" value={usuario} onChange={setUsuario} autoComplete="username" />
        <CampoTexto etiqueta="Contraseña" value={clave} onChange={setClave} type="password" autoComplete="current-password" />
        <BotonPrimario type="submit">Iniciar sesión</BotonPrimario>
      </form>
      <p className="text-center text-xs text-hc-muted">
        ¿No tenés cuenta?{' '}
        <Link to={`${RUTA_EMPRENDEDOR}/registro`} className="font-bold text-hc-primary">
          Registrate
        </Link>
      </p>
    </main>
  )
}
