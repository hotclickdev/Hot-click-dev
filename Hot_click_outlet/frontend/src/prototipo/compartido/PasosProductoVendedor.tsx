import CampoTexto from '@/prototipo/emprendedor/ui/CampoTexto'
import FilaChips from '@/prototipo/emprendedor/ui/FilaChips'
import CamposPersonalizadoProducto from './CamposPersonalizadoProducto'
import ChipsCategoriaVendedor from './ChipsCategoriaVendedor'
import ZonaFotoProducto from './ZonaFotoProducto'
import type { ModoPrecioPersonalizado } from './personalizadoProductoHelpers'

const ESTADOS = ['Publicado', 'Pausado'] as const

type Props = Readonly<{
  idPaso: string | undefined
  personalizado: boolean
  editar: boolean
  idPrefijo: string
  nombre: string
  onNombreChange: (v: string) => void
  compra: string
  onCompraChange: (v: string) => void
  venta: string
  onVentaChange: (v: string) => void
  descripcion: string
  onDescripcionChange: (v: string) => void
  stock: string
  onStockChange: (v: string) => void
  categoriaId: string
  onCategoriaChange: (id: string, nombre: string) => void
  estado: string
  onEstadoChange: (v: string) => void
  instrucciones: string
  onInstruccionesChange: (v: string) => void
  modoPrecio: ModoPrecioPersonalizado
  onModoChange: (v: ModoPrecioPersonalizado) => void
  precioMin: string
  onPrecioMinChange: (v: string) => void
  precioMax: string
  onPrecioMaxChange: (v: string) => void
  imagenUrl: string
  onImagenChange: (v: string) => void
  errorSubmit: string | null
}>

/**
 * Contenido de cada paso del wizard de producto (crear / editar).
 */
export default function PasosProductoVendedor({
  idPaso,
  personalizado,
  editar,
  idPrefijo,
  nombre,
  onNombreChange,
  compra,
  onCompraChange,
  venta,
  onVentaChange,
  descripcion,
  onDescripcionChange,
  stock,
  onStockChange,
  categoriaId,
  onCategoriaChange,
  estado,
  onEstadoChange,
  instrucciones,
  onInstruccionesChange,
  modoPrecio,
  onModoChange,
  precioMin,
  onPrecioMinChange,
  precioMax,
  onPrecioMaxChange,
  imagenUrl,
  onImagenChange,
  errorSubmit,
}: Props) {
  return (
    <>
      {idPaso === 'foto' ? (
        <ZonaFotoProducto imagenUrl={imagenUrl} onImagenChange={onImagenChange} bordeDiscontinuo />
      ) : null}
      {idPaso === 'identidad' ? (
        <>
          <CampoTexto
            etiqueta="Nombre del producto"
            value={nombre}
            onChange={onNombreChange}
            placeholder={editar ? undefined : 'Ej: Camiseta Oversize Negra'}
          />
          <div>
            <p className="mb-2 text-xs font-medium text-hc-muted">Categoría</p>
            <ChipsCategoriaVendedor categoriaId={categoriaId} onChange={onCategoriaChange} />
          </div>
        </>
      ) : null}
      {idPaso === 'precios' ? (
        <>
          <CampoTexto
            etiqueta="Precio de compra"
            value={compra}
            onChange={onCompraChange}
            type="number"
            placeholder={editar ? undefined : '₡ 0'}
          />
          <CampoTexto
            etiqueta="Precio de venta"
            value={venta}
            onChange={onVentaChange}
            type="number"
            placeholder={editar ? undefined : '₡ 0'}
          />
        </>
      ) : null}
      {idPaso === 'cobro' ? (
        <CamposPersonalizadoProducto
          idPrefijo={idPrefijo}
          instrucciones={instrucciones}
          onInstruccionesChange={onInstruccionesChange}
          modoPrecio={modoPrecio}
          onModoChange={onModoChange}
          precioMin={precioMin}
          onPrecioMinChange={onPrecioMinChange}
          precioMax={precioMax}
          onPrecioMaxChange={onPrecioMaxChange}
          compra={compra}
          onCompraChange={onCompraChange}
          venta={venta}
          onVentaChange={onVentaChange}
        />
      ) : null}
      {idPaso === 'detalle' ? (
        <>
          <CampoTexto
            etiqueta="Descripción"
            value={descripcion}
            onChange={onDescripcionChange}
            placeholder={editar ? undefined : 'Ej: Auriculares con estuche de carga…'}
          />
          {!personalizado ? (
            <CampoTexto
              etiqueta="Stock disponible"
              value={stock}
              onChange={onStockChange}
              type="number"
              placeholder={editar ? undefined : 'Ej: 10'}
            />
          ) : (
            !editar ? (
              <p className="text-sm text-hc-muted">
                En productos personalizados el stock se gestiona al cotizar cada encargo.
              </p>
            ) : null
          )}
        </>
      ) : null}
      {idPaso === 'estado' ? (
        <div>
          <p className="mb-2 text-xs font-medium text-hc-muted">Estado</p>
          <FilaChips valor={estado} opciones={ESTADOS} onChange={onEstadoChange} />
        </div>
      ) : null}
      {errorSubmit ? <p className="text-sm text-hc-danger">{errorSubmit}</p> : null}
    </>
  )
}
