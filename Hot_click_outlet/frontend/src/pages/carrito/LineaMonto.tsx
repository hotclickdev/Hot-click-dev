type LineaMontoProps = {
  etiqueta: string
  monto: string
  className?: string
}

/** Línea «etiqueta · monto» de los resúmenes de carrito y pago. */
export default function LineaMonto({ etiqueta, monto, className = '' }: LineaMontoProps) {
  return (
    <div className={`flex items-center justify-between text-[13px] ${className}`}>
      <p className="font-medium text-hc-n-600">{etiqueta}</p>
      <p className="font-semibold text-hc-n-900">{monto}</p>
    </div>
  )
}
