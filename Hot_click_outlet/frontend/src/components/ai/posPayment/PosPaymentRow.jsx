/**
 * Fila etiqueta/valor de las instrucciones SINPE.
 */
export default function PosPaymentRow({ label, value, bold }) {
  return (
    <div className="flex justify-between text-xs">
      <span style={{ color: 'var(--hc-muted)' }}>{label}</span>
      <span style={{ color: 'var(--hc-text)', fontWeight: bold ? 700 : 500 }}>{value}</span>
    </div>
  )
}
