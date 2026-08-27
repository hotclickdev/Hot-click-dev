import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { HotClickMark } from '@/components/ui/BrandLogo'
import BotonPrimario from '../ui/BotonPrimario'
import CabeceraAtras from '../ui/CabeceraAtras'
import CampoTexto from '../ui/CampoTexto'
import { RUTA_EMPRENDEDOR } from '../constants'

/**
 * Paso 0b Registro (Figma 59:171).
 */
export default function RegistroPage() {
  const navigate = useNavigate()
  const [tienda, setTienda] = useState('')
  const [correo, setCorreo] = useState('')
  const [clave, setClave] = useState('')

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-[18px] px-6 pb-10 pt-14">
      <CabeceraAtras
        titulo="Creá tu cuenta"
        to={`${RUTA_EMPRENDEDOR}/login`}
        extra={<HotClickMark className="" size={26} />}
      />
      <p className="text-xs text-hc-muted">Empezá a vender en HotClick Outlet & Marketplace</p>
      <form
        className="flex flex-col gap-5"
        onSubmit={(evento) => {
          evento.preventDefault()
          navigate(RUTA_EMPRENDEDOR)
        }}
      >
        <CampoTexto etiqueta="Nombre de tu tienda" value={tienda} onChange={setTienda} placeholder="Ej: TechZone CR" />
        <CampoTexto etiqueta="Correo" value={correo} onChange={setCorreo} type="email" placeholder="vos@ejemplo.com" />
        <CampoTexto etiqueta="Contraseña" value={clave} onChange={setClave} type="password" />
        <BotonPrimario type="submit">Crear cuenta</BotonPrimario>
      </form>
    </main>
  )
}
