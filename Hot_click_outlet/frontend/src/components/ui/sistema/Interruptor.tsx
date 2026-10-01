type InterruptorProps = {
  activo: boolean
  onCambio: (activo: boolean) => void
  /** Texto accesible. */
  etiqueta: string
  /**
   * `cookies`: 44 × 26 con perilla de 20 (Figma `45:2183`).
   * `ajuste`: 40 × 24 con perilla de 18 (Figma `52:2409`).
   */
  tamano?: 'cookies' | 'ajuste'
  disabled?: boolean
}

const TAMANOS = {
  cookies: { pista: 'h-[26px] w-[44px]', perilla: 'size-5', apagada: 'left-[3px]', encendida: 'left-[21px]' },
  ajuste: { pista: 'h-6 w-10', perilla: 'size-[18px]', apagada: 'left-[3px]', encendida: 'left-[19px]' },
} as const

/** Interruptor del sistema: pista n/200 apagada, azul 600 encendida, perilla blanca. */
export default function Interruptor({ activo, onCambio, etiqueta, tamano = 'ajuste', disabled = false }: InterruptorProps) {
  const t = TAMANOS[tamano]
  return (
    <button
      type="button"
      role="switch"
      aria-checked={activo}
      aria-label={etiqueta}
      disabled={disabled}
      onClick={() => onCambio(!activo)}
      className={`relative shrink-0 rounded-full transition-colors disabled:opacity-60 ${t.pista} ${activo ? 'bg-hc-blue-600' : 'bg-hc-n-200'}`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1/2 -translate-y-1/2 rounded-full bg-white transition-[left] ${t.perilla} ${activo ? t.encendida : t.apagada}`}
      />
    </button>
  )
}
