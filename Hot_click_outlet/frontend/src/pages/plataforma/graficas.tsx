export function cifra(valor: number | null | undefined): string {
  if (valor == null) return '—'
  return new Intl.NumberFormat('es-CR').format(valor)
}

export function GraficaBarras({
  titulo,
  detalle,
  serie,
}: {
  titulo: string
  detalle: string
  serie: Array<{ etiqueta: string; valor: number }>
}) {
  const maximo = Math.max(...serie.map((punto) => punto.valor), 1)
  return (
    <section className="flex h-full flex-col rounded-[14px] border border-hc-n-200 bg-white p-4">
      <h2 className="font-display text-[17px] font-bold text-hc-n-900">{titulo}</h2>
      <p className="mt-1 text-xs text-hc-n-600">{detalle}</p>
      <div className="mt-4 flex min-h-44 flex-1 items-end gap-2">
        {serie.map((punto) => (
          <div key={punto.etiqueta} className="flex h-full min-w-0 flex-1 flex-col justify-end gap-2">
            <span className="text-center text-[11px] font-semibold text-hc-n-900">{cifra(punto.valor)}</span>
            <div className="flex h-32 items-end">
              <div
                className="w-full rounded-t-lg bg-hc-blue-600"
                style={{ height: punto.valor === 0 ? '2px' : `${Math.max(12, (punto.valor / maximo) * 100)}%` }}
              />
            </div>
            <span className="truncate text-center text-[10px] font-semibold uppercase tracking-wide text-hc-n-600">{punto.etiqueta}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

export function GraficaFilas({
  titulo,
  detalle,
  serie,
}: {
  titulo: string
  detalle: string
  serie: Array<{ etiqueta: string; valor: number; tono?: 'azul' | 'rojo' | 'verde' }>
}) {
  const maximo = Math.max(...serie.map((punto) => punto.valor), 1)
  return (
    <section className="rounded-[14px] border border-hc-n-200 bg-white p-4">
      <h2 className="font-display text-[17px] font-bold text-hc-n-900">{titulo}</h2>
      <p className="mt-1 text-xs text-hc-n-600">{detalle}</p>
      <ul className="mt-4 flex flex-col gap-3">
        {serie.map((punto) => (
          <li key={punto.etiqueta}>
            <div className="mb-1 flex items-baseline justify-between gap-3 text-sm">
              <span className="font-semibold text-hc-n-900">{punto.etiqueta}</span>
              <span className="tabular-nums text-hc-n-600">{cifra(punto.valor)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-hc-n-100">
              <div
                className={`h-full rounded-full ${punto.tono === 'rojo' ? 'bg-hc-primary' : punto.tono === 'verde' ? 'bg-hc-success' : 'bg-hc-blue-600'}`}
                style={{ width: `${Math.max(4, (punto.valor / maximo) * 100)}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
