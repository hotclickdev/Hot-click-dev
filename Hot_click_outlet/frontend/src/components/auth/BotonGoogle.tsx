import type { MouseEventHandler } from 'react'

/** Logo «G» oficial de Google (4 colores, sin modificar), según las guías de marca de Google Sign-In. */
function LogoGoogle() {
  return (
    <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" data-logo="google">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
  )
}

/**
 * Botón secundario del manual (borde n200, fondo blanco, radio 12, alto 48, Public Sans 600/15),
 * derivado del Figma `28:1175`. No usa el rojo primario: Google pide su logo sobre fondo neutro.
 */
export function BotonGoogle({ etiqueta, cargando, onClick }: {
  etiqueta: string
  cargando: boolean
  onClick: MouseEventHandler<HTMLButtonElement>
}) {
  return (
    <button
      type="button"
      data-testid="boton-google"
      disabled={cargando}
      aria-busy={cargando}
      onClick={onClick}
      className="flex h-12 w-full items-center justify-center gap-[10px] rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 font-sans text-[15px] font-semibold leading-[normal] text-hc-n-900 hover:bg-hc-n-50 focus-visible:border-hc-blue-600 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-hc-blue-100 disabled:opacity-60"
    >
      {cargando
        ? <span aria-hidden="true" className="size-[18px] animate-spin rounded-full border-2 border-hc-n-200 border-t-hc-blue-600" />
        : <LogoGoogle />}
      <span>{etiqueta}</span>
    </button>
  )
}
