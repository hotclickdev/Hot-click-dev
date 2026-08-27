import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { productoPorId } from './mock'
import { Boton, Campo, Chip, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import iconCamara from './assets/icon-camara.svg'

const CATEGORIAS = ['Tecnología', 'Ropa', 'Otro'] as const
type CategoriaForm = (typeof CATEGORIAS)[number]

/**
 * Alta / edición de producto (Figma 61:231 / 61:422).
 */
export default function ProductoFormPage() {
  const { id } = useParams()
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const existente = id ? productoPorId(id) : undefined
  const [categoria, setCategoria] = useState<CategoriaForm>(existente?.categoria ?? 'Tecnología')
  const [estado, setEstado] = useState(existente?.estado ?? 'Publicado')
  const editar = Boolean(existente)

  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo={editar ? 'Editar Producto' : 'Nuevo Producto'} volverA={ruta('productos')} />
      <ZonaFoto editar={editar} nombre={existente?.nombre} />
      <form
        onSubmit={(evento) => {
          evento.preventDefault()
          navigate(ruta('productos'))
        }}
      >
        <Campo etiqueta="Nombre del producto" defaultValue={existente?.nombre} placeholder="Ej: Camiseta Oversize Negra" />
        <Campo etiqueta="Precio de compra" defaultValue={existente ? String(existente.precioCompra) : ''} placeholder="₡ 0.00" />
        <Campo etiqueta="Precio de venta" defaultValue={existente ? String(existente.precio) : ''} placeholder="₡ 0.00" />
        <Campo etiqueta="Descripción" defaultValue={existente?.descripcion} placeholder="Ej: Auriculares con estuche de carga..." />
        <Campo etiqueta="Stock disponible" defaultValue={existente ? String(existente.stock) : ''} placeholder="Ej: 10" />
        <p className="mb-2 text-xs font-medium text-hc-muted">Categoría</p>
        <div className="mb-4 flex gap-2">
          {CATEGORIAS.map((item) => (
            <Chip key={item} activo={categoria === item} onClick={() => setCategoria(item)}>{item}</Chip>
          ))}
        </div>
        {editar ? (
          <>
            <p className="mb-2 text-xs font-medium text-hc-muted">Estado</p>
            <div className="mb-6 flex gap-2">
              <Chip activo={estado === 'Publicado'} onClick={() => setEstado('Publicado')}>Publicado</Chip>
              <Chip activo={estado === 'Pausado'} onClick={() => setEstado('Pausado')}>Pausado</Chip>
            </div>
          </>
        ) : null}
        <Boton type="submit">{editar ? 'Guardar cambios' : 'Publicar producto'}</Boton>
        {editar && id ? (
          <div className="mt-3">
            <Boton variante="suave" to={ruta(`productos/${id}/eliminar`)}>Eliminar producto</Boton>
          </div>
        ) : null}
      </form>
    </main>
  )
}

function ZonaFoto({ editar, nombre }: { editar: boolean; nombre?: string }) {
  return (
    <div className="mb-6 flex h-[118px] flex-col items-center justify-center rounded-xl bg-hc-surface-2">
      {editar ? (
        <>
          <p className="text-xs text-hc-muted">{nombre}.jpg</p>
          <span className="mt-2 rounded-full border border-hc-border px-3 py-1 text-xs">Cambiar foto</span>
        </>
      ) : (
        <>
          <span className="relative mb-2 block size-[26px] overflow-clip">
            <img src={iconCamara} alt="" width={26} height={26} className="size-full" />
          </span>
          <p className="text-sm text-hc-muted">Agregar foto</p>
        </>
      )}
    </div>
  )
}
