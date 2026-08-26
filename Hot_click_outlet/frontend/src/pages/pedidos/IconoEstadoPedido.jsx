const CLASE_ICONO = 'w-5 h-5'

/** Ícono de estado de pedido. Texto del badge es el canal de lectura. */
export default function IconoEstadoPedido({ estado }) {
  return (
    <svg
      className={CLASE_ICONO}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <TrazosEstado estado={estado} />
    </svg>
  )
}

function TrazosEstado({ estado }) {
  if (estado === 'PAGADO') return <path d="M5 13l4 4L19 7" />
  if (estado === 'EN_PREPARACION') {
    return (
      <>
        <path d="M21 16V8a2 2 0 00-1-1.73l-7-4a2 2 0 00-2 0l-7 4A2 2 0 003 8v8a2 2 0 001 1.73l7 4a2 2 0 002 0l7-4A2 2 0 0021 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      </>
    )
  }
  if (estado === 'ENVIADO') {
    return (
      <>
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <path d="M16 8h4l3 5v3h-7V8z" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </>
    )
  }
  if (estado === 'ENTREGADO') {
    return (
      <>
        <path d="M3 10.5L12 3l9 7.5V20a1 1 0 01-1 1H5a1 1 0 01-1-1v-9.5z" />
        <path d="M9 21v-8h6v8" />
      </>
    )
  }
  if (estado === 'LISTO_RETIRO') {
    return (
      <>
        <path d="M3 21V10l9-7 9 7v11" />
        <path d="M9 21v-8h6v8" />
      </>
    )
  }
  if (estado === 'CANCELADO') return <path d="M6 6l12 12M18 6L6 18" />
  return (
    <>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 1.5" />
    </>
  )
}
