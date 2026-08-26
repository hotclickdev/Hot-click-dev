import { useTranslation } from 'react-i18next'

export default function PedidoTimeline({ estadoActual, esRetiro }) {
  const { t } = useTranslation()
  const estadosEnvio = [
    { key: 'PENDIENTE', label: t('orders.status.PENDIENTE') },
    { key: 'PAGADO', label: t('orders.status.PAGADO') },
    { key: 'EN_PREPARACION', label: t('orders.status.EN_PREPARACION') },
    { key: 'ENVIADO', label: t('orders.status.ENVIADO') },
    { key: 'ENTREGADO', label: t('orders.status.ENTREGADO') },
  ]
  const estadosRetiro = [
    { key: 'PENDIENTE', label: t('orders.status.PENDIENTE') },
    { key: 'PAGADO', label: t('orders.status.PAGADO') },
    { key: 'EN_PREPARACION', label: t('orders.status.EN_PREPARACION') },
    { key: 'LISTO_RETIRO', label: t('orders.status.LISTO_RETIRO') },
    { key: 'ENTREGADO', label: t('orders.status.ENTREGADO_RETIRO') },
  ]
  const estados = esRetiro ? estadosRetiro : estadosEnvio
  const idx = estados.findIndex((estado) => estado.key === estadoActual)
  const idxSafe = idx === -1 ? 0 : idx

  return (
    <div className="flex items-center gap-0 mt-4 mb-2 overflow-x-auto pb-1">
      {estados.map((estado, i) => {
        const done = i <= idxSafe
        const current = i === idxSafe
        return (
          <div key={estado.key} className="flex items-center flex-1 min-w-0">
            <div className="flex flex-col items-center gap-1 flex-shrink-0">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] transition-all duration-300"
                style={{
                  backgroundColor: done ? 'var(--hc-accent)' : 'var(--hc-surface-2)',
                  border: `2px solid ${done ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
                  boxShadow: current ? '0 0 10px rgba(23,71,168,0.4)' : 'none',
                }}
              >
                {done
                  ? (
                    <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3} aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  )
                  : (
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--hc-muted)' }} aria-hidden="true" />
                  )}
              </div>
              <span className="text-[9px] text-center leading-tight max-w-[52px]"
                style={{ color: done ? 'var(--hc-accent)' : 'var(--hc-muted)', fontWeight: done ? 600 : 400 }}>
                {estado.label}
              </span>
            </div>
            {i < estados.length - 1 && (
              <div className="h-0.5 flex-1 mx-1 rounded-full transition-all duration-300"
                style={{ backgroundColor: i < idx ? 'var(--hc-accent)' : 'var(--hc-border)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
