const PASOS = [
  ['visita', 'Visita'],
  ['producto', 'Vio producto'],
  ['carrito', 'Agregó al carrito'],
  ['checkout', 'Abrió checkout'],
  ['pagoIntento', 'Intentó pagar'],
  ['pedidosPagados', 'Pedido pagado'],
] as const

type Conteos = {
  visita: number
  producto: number
  carrito: number
  checkout: number
  pagoIntento: number
  pedidosPagados: number
}

export default function EmbudoBarras({ conteos }: { conteos: Conteos }) {
  const maximo = Math.max(1, ...PASOS.map(([clave]) => conteos[clave]))
  return (
    <ol className="space-y-3">
      {PASOS.map(([clave, etiqueta]) => (
        <li key={clave}>
          <div className="flex justify-between text-sm text-hc-text mb-1">
            <span>{etiqueta}</span>
            <span className="font-semibold">{conteos[clave]}</span>
          </div>
          <div className="h-2 rounded-full bg-hc-border overflow-hidden">
            <div
              className="h-full rounded-full bg-hc-accent"
              style={{ width: `${Math.round((conteos[clave] / maximo) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  )
}
