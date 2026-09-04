import Modal from '@/components/ui/Modal'
import { formatoColon } from '@/theme/formatoColon'
import { etiquetaLimiteAi, formatoTokens, type UsoTenantFila } from './usoTenantHelpers'

export default function UsoTenantDetalle({ fila, loading, onClose }: {
  fila: UsoTenantFila | null
  loading: boolean
  onClose: () => void
}) {
  const abierto = loading || fila != null
  return (
    <Modal open={abierto} onClose={onClose} title={fila?.nombre ?? 'Uso del tenant'} size="lg">
      {loading && !fila && (
        <div className="px-6 py-8 text-sm text-gray-400">Cargando detalle…</div>
      )}
      {fila && (
        <div className="space-y-4 px-6 py-5">
          <p className="text-xs text-gray-400">
            {fila.plan} · {fila.estadoEmpresa} · {fila.slug} · período {fila.mes}/{fila.anio}
          </p>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <Dato label="GMV histórico" valor={formatoColon(fila.gmv)} />
            <Dato label="GMV del mes" valor={formatoColon(fila.gmvMes)} />
            <Dato label="Pedidos" valor={String(fila.pedidos)} />
            <Dato label="Pedidos del mes" valor={String(fila.pedidosMes)} />
            <Dato label="Llamadas IA" valor={`${fila.llamadasAi} / ${etiquetaLimiteAi(fila.limiteAi)}`} />
            <Dato
              label="Créditos restantes"
              valor={fila.creditosRestantes != null && fila.creditosRestantes < 0
                ? 'Ilimitado'
                : String(fila.creditosRestantes ?? '—')}
            />
            <Dato label="Tokens mes" valor={formatoTokens(fila.tokensMes)} />
            <Dato label="Costo IA USD" valor={`$${(fila.costoAiUsd ?? 0).toFixed(4)}`} />
            <Dato label="Productos" valor={String(fila.productos)} />
            <Dato label="Imágenes (proxy)" valor={String(fila.imagenes)} />
          </dl>
          {fila.notaAlmacenamiento && (
            <p className="text-xs text-gray-400">{fila.notaAlmacenamiento}</p>
          )}
        </div>
      )}
    </Modal>
  )
}

function Dato({ label, valor }: { label: string; valor: string }) {
  return (
    <div className="rounded-xl border border-gray-100 p-3 dark:border-gray-800">
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="mt-1 text-sm font-semibold text-gray-900 dark:text-white">{valor}</dd>
    </div>
  )
}
