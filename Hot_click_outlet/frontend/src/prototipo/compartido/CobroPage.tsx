import { Boton, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'

const METODOS = [
  { id: 'sinpe', letra: 'S', nombre: 'SINPE Móvil', detalle: '8888-0000', pred: true },
  { id: 'iban', letra: 'C', nombre: 'Cuenta IBAN', detalle: 'CR21 0000 **** 4521', pred: false },
  { id: 'tarjeta', letra: 'T', nombre: 'Tarjeta de crédito', detalle: 'Visa •••• 4412', pred: false },
] as const

/**
 * Métodos de cobro (Figma 64:546).
 */
export default function CobroPage() {
  const ruta = useSellerRuta()
  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Métodos de Cobro" volverA={ruta('opciones')} />
      <ul className="space-y-3">
        {METODOS.map((item) => (
          <li key={item.id} className="flex items-center gap-3 rounded-xl bg-hc-surface-2 p-3.5">
            <span className="flex size-10 items-center justify-center rounded-full bg-hc-surface text-sm font-bold">{item.letra}</span>
            <div className="flex-1">
              <p className="text-sm font-medium">{item.nombre}</p>
              <p className="text-xs text-hc-muted">{item.detalle}</p>
            </div>
            {item.pred ? (
              <span className="rounded-full px-2.5 py-1 text-[10px]" style={{ background: 'var(--hc-success-bg)', color: 'var(--hc-success)' }}>
                Predeterminado
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Boton variante="contorno" to={ruta('proximamente')}>+ Agregar método</Boton>
      </div>
    </main>
  )
}
