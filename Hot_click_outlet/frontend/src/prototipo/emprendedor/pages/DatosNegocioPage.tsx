import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BotonPrimario from '../ui/BotonPrimario'
import CabeceraAtras from '../ui/CabeceraAtras'
import CampoTexto from '../ui/CampoTexto'
import FilaChips from '../ui/FilaChips'
import { CUENTA_DEMO, RUTA_EMPRENDEDOR } from '../constants'

const CATEGORIAS = ['Tecnología', 'Ropa', 'Hogar'] as const

/**
 * Datos de tu negocio (Figma 136:128).
 */
export default function DatosNegocioPage() {
  const navigate = useNavigate()
  const [nombre, setNombre] = useState<string>(CUENTA_DEMO.tienda)
  const [descripcion, setDescripcion] = useState('Tecnología y accesorios con envío a todo el país')
  const [categoria, setCategoria] = useState<string>('Tecnología')
  const [whatsapp, setWhatsapp] = useState<string>(CUENTA_DEMO.telefono)
  const [instagram, setInstagram] = useState<string>(CUENTA_DEMO.instagram)
  const [zona, setZona] = useState('Todo Costa Rica')

  return (
    <main className="flex flex-col gap-5 px-5 pb-10 pt-8">
      <CabeceraAtras titulo="Datos de tu Negocio" to={`${RUTA_EMPRENDEDOR}/opciones`} />
      <p className="text-[11px] text-hc-muted">
        Esta información es la que ven los compradores en tu perfil público. Mantenela actualizada.
      </p>
      <form
        className="flex flex-col gap-5"
        onSubmit={(evento) => {
          evento.preventDefault()
          navigate(`${RUTA_EMPRENDEDOR}/opciones`)
        }}
      >
        <CampoTexto etiqueta="Nombre del negocio" value={nombre} onChange={setNombre} />
        <CampoTexto etiqueta="Descripción corta" value={descripcion} onChange={setDescripcion} />
        <div>
          <p className="mb-2 text-xs font-medium text-hc-muted">Categoría principal</p>
          <FilaChips valor={categoria} opciones={CATEGORIAS} onChange={setCategoria} />
        </div>
        <CampoArchivo etiqueta="Logo del negocio" archivo="logo-qa2.png" />
        <CampoArchivo etiqueta="Banner de portada" archivo="banner-qa2.jpg" />
        <CampoTexto etiqueta="WhatsApp de contacto" value={whatsapp} onChange={setWhatsapp} />
        <CampoTexto etiqueta="Instagram (opcional)" value={instagram} onChange={setInstagram} />
        <CampoTexto etiqueta="Zona de envío" value={zona} onChange={setZona} />
        <BotonPrimario type="submit">Guardar datos</BotonPrimario>
      </form>
    </main>
  )
}

function CampoArchivo({ etiqueta, archivo }: { etiqueta: string; archivo: string }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-hc-muted">{etiqueta}</p>
      <div className="flex items-center gap-2.5 rounded-xl border border-dashed border-hc-border bg-[var(--hc-n-50)] p-3.5">
        <span className="size-5 rounded-md border-[1.5px] border-hc-primary" aria-hidden />
        <span className="text-xs text-hc-muted">{archivo}</span>
      </div>
    </div>
  )
}
