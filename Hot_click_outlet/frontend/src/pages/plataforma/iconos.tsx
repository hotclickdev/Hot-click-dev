const trazo = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  viewBox: '0 0 24 24',
  'aria-hidden': true,
}

/** Íconos de la consola. Trazo simple, currentColor, como los del manual Figma. */
export function IconoDominio({ id, className = 'size-5' }: { id: string; className?: string }) {
  if (id === 'inicio') {
    return (
      <svg className={className} {...trazo}>
        <path d="M4 11.5 12 4l8 7.5" />
        <path d="M7 10.5V20h10v-9.5" />
      </svg>
    )
  }
  if (id === 'negocios') {
    return (
      <svg className={className} {...trazo}>
        <path d="M4 20V9l8-5 8 5v11" />
        <path d="M9 20v-6h6v6" />
      </svg>
    )
  }
  if (id === 'moderacion') {
    return (
      <svg className={className} {...trazo}>
        <path d="M8 4h8l1 3H7l1-3z" />
        <path d="M6 7h12v11a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7z" />
        <path d="m9 13 2 2 4-4" />
      </svg>
    )
  }
  if (id === 'dinero') {
    return (
      <svg className={className} {...trazo}>
        <rect x="3" y="6" width="18" height="12" rx="2" />
        <path d="M3 10h18" />
      </svg>
    )
  }
  if (id === 'operacion') {
    return (
      <svg className={className} {...trazo}>
        <path d="M14.5 6.5 17 4l3 3-2.5 2.5" />
        <path d="m13 8-8 8v3h3l8-8" />
      </svg>
    )
  }
  if (id === 'seguridad') {
    return (
      <svg className={className} {...trazo}>
        <path d="M12 3 5 6v6c0 4.5 3 7 7 8 4-1 7-3.5 7-8V6l-7-3z" />
      </svg>
    )
  }
  if (id === 'ia') {
    return (
      <svg className={className} {...trazo}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M18.4 5.6 17 7M7 17l-1.4 1.4" />
      </svg>
    )
  }
  if (id === 'reglas') {
    return (
      <svg className={className} {...trazo}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 3v2.2M12 18.8V21M3 12h2.2M18.8 12H21" />
      </svg>
    )
  }
  return (
    <svg className={className} {...trazo}>
      <path d="M5 7h14M5 12h14M5 17h14" />
    </svg>
  )
}
