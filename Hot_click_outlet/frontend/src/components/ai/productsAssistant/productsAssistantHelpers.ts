import type { Id } from '@/types/api'
import { etiquetaPrecioChat, requiereFichaEncargo, type ProductoPrecioChat } from '../chatProductoPrecio'

export type ProductoSugerido = ProductoPrecioChat & {
  id?: Id
  nombre?: string
  sku?: string | null
  imagenUrl?: string | null
}

export type MensajeAsistenteProductos = {
  rol: 'user' | 'assistant'
  texto?: string
  typing?: boolean
  productos?: ProductoSugerido[]
  categorias?: string[]
}

export { etiquetaPrecioChat, requiereFichaEncargo }

export const fmt = (n?: number | null) => new Intl.NumberFormat('es-CR').format(n ?? 0)

export const PANEL_CSS_ID = 'hc-panel-css'
export const PANEL_CSS = `
  @keyframes hc-sa-dot { 0%,60%,100%{transform:translateY(0);opacity:.35} 30%{transform:translateY(-5px);opacity:1} }
`

if (typeof document !== 'undefined' && !document.getElementById(PANEL_CSS_ID)) {
  const s = document.createElement('style')
  s.id = PANEL_CSS_ID
  s.textContent = PANEL_CSS
  document.head.appendChild(s)
}
