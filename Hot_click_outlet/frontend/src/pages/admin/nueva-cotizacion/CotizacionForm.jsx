import FormHeader from './FormHeader'
import SeccionCliente from './SeccionCliente'
import SeccionDetalles from './SeccionDetalles'
import SeccionItems from './SeccionItems'
import SeccionNotas from './SeccionNotas'
import SeccionTotales from './SeccionTotales'

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
