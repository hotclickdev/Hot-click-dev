import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Boton, Campo, Chip, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import iconCamara from './assets/icon-camara.svg'

const CATEGORIAS = ['Tecnología', 'Ropa', 'Hogar'] as const

/**
 * Datos públicos del negocio (Figma 136:408).
 */
export default function DatosNegocioPage() {
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const [categoria, setCategoria] = useState<(typeof CATEGORIAS)[number]>('Tecnología')
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Datos de tu Negocio" volverA={ruta('opciones')} />
      <p className="mb-4 text-sm text-hc-muted">
        Esta información es la que ven los compradores en tu perfil público. Mantenela actualizada.
      </p>
      <form onSubmit={(evento) => { evento.preventDefault(); navigate(ruta('opciones')) }}>
        <Campo etiqueta="Nombre del negocio" defaultValue="TechZone CR" />
        <Campo etiqueta="Descripción corta" defaultValue="Tecnología y accesorios con envío a todo el país" />
        <p className="mb-2 text-xs font-medium text-hc-muted">Categoría principal</p>
        <div className="mb-4 flex gap-2">
          {CATEGORIAS.map((item) => (
            <Chip key={item} activo={categoria === item} onClick={() => setCategoria(item)}>{item}</Chip>
          ))}
        </div>
        <Archivo etiqueta="Logo del negocio" nombre="logo-qa2.png" />
        <Archivo etiqueta="Banner de portada" nombre="banner-qa2.jpg" />
        <Campo etiqueta="WhatsApp de contacto" defaultValue="+506 8888-0000" />
        <Campo etiqueta="Instagram (opcional)" defaultValue="@qa2.emprendedor" />
        <Campo etiqueta="Zona de envío" defaultValue="Todo Costa Rica" />
        <Boton type="submit">Guardar datos</Boton>
      </form>
    </main>
  )
}

function Archivo({ etiqueta, nombre }: { etiqueta: string; nombre: string }) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-medium text-hc-muted">{etiqueta}</p>
      <div className="flex min-h-12 items-center gap-3 rounded-xl bg-hc-surface-2 px-3.5 text-sm">
        <span className="relative block size-[20px] overflow-clip">
          <img src={iconCamara} alt="" width={20} height={20} className="size-full" />
        </span>
        {nombre}
      </div>
    </div>
  )
}
