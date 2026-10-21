import { useEffect, useState, type ReactNode } from 'react'
import { formatPrice } from '@/utils/format'
import { MONTO_POR_DEFINIR, POR_DEFINIR, enviosApi, textoContraEntrega, textoCosto, type TarifasEnvio } from './enviosApi'

/**
 * S6-21 · Tarifas de /envios (DIS-3 opción A, pendiente de S4-04). Lámina: diseno/sprint6/S6-21.
 * Mientras el backend no publique tarifas (o si falla), se muestra `respaldo` (la lista actual, sin montos fijos).
 */
export default function TarifasPorNegocio({ respaldo }: { respaldo: ReactNode }) {
  const [tarifas, setTarifas] = useState<TarifasEnvio | null>(null)

  useEffect(() => {
    let vivo = true
    enviosApi.tarifas().then((t) => { if (vivo) setTarifas(t) }).catch(() => { if (vivo) setTarifas(null) })
    return () => { vivo = false }
  }, [])

  const cargo = tarifas?.contraEntrega.cargo ?? null
  return (
    <div className="flex flex-col gap-3">
      <p className="rounded-[12px] px-4 py-3 text-[13px] text-hc-n-900" style={{ background: 'var(--hc-info-bg)', border: '1px solid var(--hc-border)' }}>
        <strong>El envío se cobra por pedido y por negocio.</strong> Si comprás en 2 negocios, pagás 2 envíos.
      </p>

      {tarifas && tarifas.opciones.length > 0 ? (
        <div className="overflow-x-auto rounded-[16px] border border-hc-n-200 bg-hc-n-0">
          <table className="w-full min-w-[560px] text-left text-[13px]">
            <caption className="sr-only">Opciones de envío, costo, tiempo y si aceptan contra entrega</caption>
            <thead className="text-[12px] text-hc-n-600">
              <tr>{['Opción', 'Dónde', 'Costo', 'Tiempo', 'Contra entrega'].map((h) => <th key={h} scope="col" className="p-3 font-medium">{h}</th>)}</tr>
            </thead>
            <tbody>
              {tarifas.opciones.map((o) => (
                <tr key={o.clave} className="border-t border-hc-n-200">
                  <th scope="row" className="p-3 font-semibold">{o.nombre}</th>
                  <td className="p-3">{o.donde}</td>
                  <td className="p-3">{textoCosto(o, formatPrice)}</td>
                  <td className="p-3">{o.tiempo ?? POR_DEFINIR}</td>
                  <td className="p-3">{textoContraEntrega(o.contraEntrega)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : respaldo}

      <section aria-labelledby="envios-contra-entrega" className="rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4 text-[13px]">
        <h3 id="envios-contra-entrega" className="font-semibold text-hc-n-900">Contra entrega</h3>
        <p className="mt-1 text-hc-n-600">
          Pagás en efectivo al recibir. Cargo: {cargo !== null ? formatPrice(cargo) : MONTO_POR_DEFINIR.toLowerCase()}. Solo con envío normal y si todos los negocios de tu carrito la aceptan
          {tarifas?.contraEntrega.montoMinimoOpcional ? '; cada negocio puede pedir un monto mínimo.' : '.'}
        </p>
      </section>
    </div>
  )
}
