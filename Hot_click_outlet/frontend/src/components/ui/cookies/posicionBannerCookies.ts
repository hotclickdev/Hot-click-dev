/**
 * Alto de la barra inferior (67) + 8 px; si hay una CTA fija (dock), el banner se apila 8 px encima de ella
 * (`--hc-dock-alto`, ver `useDockInferior`). Nunca tapa la CTA ni la barra.
 */
export const BOTTOM_BANNER_COOKIES = 'calc(max(75px, var(--hc-dock-alto, 0px) + 8px) + env(safe-area-inset-bottom, 0px))'
