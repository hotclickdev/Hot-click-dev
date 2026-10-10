/** Botones de las hojas del sistema (Figma `51:2192`/`51:2194`): 12 px de radio, 13/16 px de relleno, SemiBold 14. */
const BASE_BOTON_HOJA = 'flex min-w-0 flex-1 items-center justify-center rounded-[12px] px-4 py-[13px] text-[14px] font-semibold leading-4'

export const BOTON_HOJA_SECUNDARIO = `${BASE_BOTON_HOJA} border border-hc-n-200 bg-hc-n-0 text-hc-n-900 hover:bg-hc-n-50`
export const BOTON_HOJA_PRIMARIO = `${BASE_BOTON_HOJA} bg-hc-red-500 text-hc-n-0 hover:bg-hc-red-600 disabled:opacity-60`

/** Título de hoja: ícono de 24 + Sora Bold 17 (Figma `51:2171`). */
export const TITULO_HOJA = 'font-display text-[17px] font-bold leading-[normal] tracking-normal text-hc-n-900'

/** Velo semitransparente del tema (`--hc-overlay`): la página sigue visible detrás de la hoja inferior. */
export const VELO_HOJA = 'bg-[var(--hc-overlay)]'
