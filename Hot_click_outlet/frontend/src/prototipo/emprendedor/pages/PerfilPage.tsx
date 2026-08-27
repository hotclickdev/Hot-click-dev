import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BotonPrimario from '../ui/BotonPrimario'
import CabeceraAtras from '../ui/CabeceraAtras'
import CampoTexto from '../ui/CampoTexto'
import { CUENTA_DEMO, RUTA_EMPRENDEDOR } from '../constants'

/**
 * Emprendimiento perfil (Figma 64:128).
 */
export default function PerfilPage() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState<string>(CUENTA_DEMO.nombre)
  const [tienda, setTienda] = useState<string>(CUENTA_DEMO.tienda)
  const [correo, setCorreo] = useState<string>(CUENTA_DEMO.correo)
  const [telefono, setTelefono] = useState<string>(CUENTA_DEMO.telefono)

  return (
    <main className="flex flex-col gap-5 px-5 pb-10 pt-8">
      <CabeceraAtras titulo="Editar Perfil" to={`${RUTA_EMPRENDEDOR}/opciones`} />
      <div className="flex items-center gap-3">
        <div className="flex size-14 items-center justify-center rounded-full bg-hc-primary text-xl font-bold text-white">
          Q
        </div>
        <button type="button" className="min-h-11 text-xs font-bold text-hc-primary">
          Cambiar foto de perfil
        </button>
      </div>
      <form
        className="flex flex-col gap-5"
        onSubmit={(evento) => {
          evento.preventDefault()
          navigate(`${RUTA_EMPRENDEDOR}/opciones`)
        }}
      >
        <CampoTexto etiqueta="Nombre completo" value={nombre} onChange={setNombre} />
        <CampoTexto etiqueta="Nombre de tu tienda" value={tienda} onChange={setTienda} />
        <CampoTexto etiqueta="Correo" value={correo} onChange={setCorreo} type="email" />
        <CampoTexto etiqueta="Teléfono" value={telefono} onChange={setTelefono} type="tel" />
        <BotonPrimario type="submit">Guardar cambios</BotonPrimario>
      </form>
    </main>
  )
}
