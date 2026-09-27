import CamposUbicacion from '@/prototipo/compartido/CamposUbicacion'
import type { UbicacionDespachoForm } from '@/hooks/useUbicacionDespachoForm'

type Props = Readonly<{
  form: UbicacionDespachoForm
}>

/** Ubicación de despacho dentro del alta de un negocio: crea su primera bodega. */
export default function UbicacionDespachoFieldset({ form }: Props) {
  return (
    <fieldset className="min-w-0 border-0 p-0 m-0">
      <legend className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
        Ubicación de despacho *
      </legend>
      <p className="text-xs mt-1 mb-3" style={{ color: 'var(--hc-muted)', lineHeight: 1.5 }}>
        Desde acá salen tus pedidos. La necesitamos para aprobar el negocio.
      </p>
      <CamposUbicacion ubicacion={form.ubicacion} onChange={form.setUbicacion} errores={form.errores} />
    </fieldset>
  )
}
