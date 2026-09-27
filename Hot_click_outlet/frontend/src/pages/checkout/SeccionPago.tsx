import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import ConsentimientoDatos from './ConsentimientoDatos'
import InstruccionesSinpe from './InstruccionesSinpe'
import MetodosPago from './MetodosPago'
import ResumenPago from './ResumenPago'
import SeccionCompra from './SeccionCompra'
import type { FormularioCompra } from './useFormularioCompra'

type SeccionPagoProps = {
  form: FormularioCompra
  visibleEnMovil: boolean
  /** Aviso de pago rechazado; va al final del paso para que se vea junto al botón. */
  avisoError: ReactNode
}

/** Paso 3 · Pago: móvil `29:1344`, tarjeta «Pago» de desktop `30:2467`. */
export default function SeccionPago({ form, visibleEnMovil, avisoError }: SeccionPagoProps) {
  const { t } = useTranslation()
  const instrucciones = (
    <InstruccionesSinpe
      monto={form.totales.total}
      comprobante={form.comprobante}
      onComprobante={form.elegirComprobante}
      error={form.errores.comprobante}
    />
  )

  return (
    <SeccionCompra
      numero={3}
      titulo={t('compra.pago.tituloDesktop')}
      visibleEnMovil={visibleEnMovil}
      className="gap-[12px] pb-[18px] pt-[18px] lg:pb-[20px]"
    >
      <h2 className="font-display text-[18px] font-bold text-hc-n-900 lg:hidden">{t('compra.pago.titulo')}</h2>
      <MetodosPago
        elegido={form.metodoPago}
        onElegir={form.setMetodoPago}
        efectivoDisponible={form.efectivoDisponible}
        instruccionesSinpe={instrucciones}
      />
      <div className="flex flex-col gap-[12px] lg:hidden">
        <ResumenPago form={form} />
        <ConsentimientoDatos acepta={form.aceptaDatos} onCambiar={form.setAceptaDatos} />
      </div>
      {avisoError}
    </SeccionCompra>
  )
}
