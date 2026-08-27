import { useNavigate } from 'react-router-dom'
import { Boton, Campo, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'

/**
 * Editar perfil (Figma 64:476).
 */
export default function PerfilPage() {
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Editar Perfil" volverA={ruta('opciones')} />
      <div className="mb-6 flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-hc-primary text-xl font-bold text-white">Q</div>
        <button type="button" className="text-sm text-hc-accent">Cambiar foto de perfil</button>
      </div>
      <form onSubmit={(evento) => { evento.preventDefault(); navigate(ruta('opciones')) }}>
        <Campo etiqueta="Nombre completo" defaultValue="Quetzal Alfaro" />
        <Campo etiqueta="Nombre de tu tienda" defaultValue="QA2 Emprendedor" />
        <Campo etiqueta="Correo" defaultValue="qa2@hotclick.lat" type="email" />
        <Campo etiqueta="Teléfono" defaultValue="+506 8888-0000" type="tel" />
        <Boton type="submit">Guardar cambios</Boton>
      </form>
    </main>
  )
}
