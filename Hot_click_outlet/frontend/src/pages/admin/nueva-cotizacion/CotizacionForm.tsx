import FormHeader from './FormHeader'
import SeccionCliente from './SeccionCliente'
import SeccionDetalles from './SeccionDetalles'
import SeccionItems from './SeccionItems'
import SeccionNotas from './SeccionNotas'
import SeccionTotales from './SeccionTotales'
import type { Id } from '@/types/api'
import type { Producto } from '@/types/producto'

export type FormCotizacion = {
  clienteId: Id | ''
  fechaEmision: string
  fechaVencimiento: string
  estadoCotizacion: string
  aplicaIva: boolean
  porcentajeIva: number
  observaciones: string
  terminos: string
  moneda: string
}

export type SetFormCotizacion = <K extends keyof FormCotizacion>(k: K, v: FormCotizacion[K]) => void

export type ClienteB2B = {
  id?: Id
  nombreComercial?: string
  razonSocial?: string
  cedulaJuridica?: string
  correo?: string
  telefono?: string
  direccion?: string
  contactoPrincipal?: string
}

export type ItemCotizacionForm = {
  tipo?: string
  productoId: Id | null | undefined
  codigo: string
  nombre?: string
  descripcion: string
  imagenUrl: string
  cantidad?: number
  unidadMedida?: string
  precioUnitario?: number
  descuentoPorcentaje?: number
}

export default function CotizacionForm({
  esEdicion,
  form,
  setF,
  clientes,
  productos,
  items,
  actualizarItem,
  agregarItem,
  eliminarItem,
  onNuevoCliente,
  subtotal,
  montoIva,
  total,
  loading,
  onGuardar,
  onCancelar,
}: {
  esEdicion: boolean
  form: FormCotizacion
  setF: SetFormCotizacion
  clientes: ClienteB2B[]
  productos: Producto[]
  items: ItemCotizacionForm[]
  actualizarItem: (index: number, patch: Partial<ItemCotizacionForm>) => void
  agregarItem: () => void
  eliminarItem: (index: number) => void
  onNuevoCliente: () => void
  subtotal: number
  montoIva: number
  total: number
  loading: boolean
  onGuardar: () => void
  onCancelar: () => void
}) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <FormHeader esEdicion={esEdicion} onCancelar={onCancelar} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <SeccionCliente form={form} setF={setF} clientes={clientes} onNuevoCliente={onNuevoCliente} />
          <SeccionDetalles form={form} setF={setF} />
          <SeccionItems
            items={items}
            productos={productos}
            onChange={actualizarItem}
            onRemove={eliminarItem}
            onAgregar={agregarItem}
          />
          <SeccionNotas form={form} setF={setF} />
        </div>

        <SeccionTotales
          form={form}
          setF={setF}
          subtotal={subtotal}
          montoIva={montoIva}
          total={total}
          loading={loading}
          esEdicion={esEdicion}
          onGuardar={onGuardar}
          onCancelar={onCancelar}
        />
      </div>
    </div>
  )
}

export function mensajeErrorCotizacion(err: unknown, fallback: string): string {
  if (typeof err !== 'object' || err === null || !('response' in err)) return fallback
  const data = (err as { response?: { data?: { message?: unknown } } }).response?.data
  const message = data && typeof data === 'object' && 'message' in data ? data.message : undefined
  return typeof message === 'string' && message ? message : fallback
}
