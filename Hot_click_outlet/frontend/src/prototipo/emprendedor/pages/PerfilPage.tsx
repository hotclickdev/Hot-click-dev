import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import BotonPrimario from '../ui/BotonPrimario'
import CampoTexto from '../ui/CampoTexto'
import EmprendedorPageFrame, { EmprendedorCard } from '../ui/EmprendedorPageFrame'
import { CUENTA_DEMO, RUTA_EMPRENDEDOR } from '../constants'

/**
 * Editar Perfil (Figma 64:128 / 352:4626).
 */
export default function PerfilPage() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState(CUENTA_DEMO.nombre)
  const [tienda, setTienda] = useState(CUENTA_DEMO.tienda)
  const [correo, setCorreo] = useState(CUENTA_DEMO.correo)
  const [telefono, setTelefono] = useState(CUENTA_DEMO.telefono)

  function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    navigate(`${RUTA_EMPRENDEDOR}/opciones`)
  }

  return (
    <EmprendedorPageFrame titulo="Editar Perfil" volverA={`${RUTA_EMPRENDEDOR}/opciones`}>
      <form className="flex flex-col gap-4" onSubmit={onSubmit}>
        <EmprendedorCard className="flex flex-col gap-4">
          <CampoTexto etiqueta="Nombre completo" value={nombre} onChange={setNombre} />
          <CampoTexto etiqueta="Nombre de tu tienda" value={tienda} onChange={setTienda} />
          <CampoTexto etiqueta="Correo" value={correo} onChange={setCorreo} type="email" />
          <CampoTexto etiqueta="Teléfono" value={telefono} onChange={setTelefono} type="tel" />
        </EmprendedorCard>
        <BotonPrimario type="submit">Guardar cambios</BotonPrimario>
      </form>
    </EmprendedorPageFrame>
  )
}
