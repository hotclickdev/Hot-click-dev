import type { ReactNode } from 'react'

/** Íconos de trazo de Mi cuenta (Figma `28:1196`, `30:1400`, `30:1479`). Heredan el color con `currentColor`. */
function Trazo({ children, size = 20, ancho = 1.8 }: { children: ReactNode; size?: number; ancho?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={ancho}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className="shrink-0">
      {children}
    </svg>
  )
}

type Tam = { size?: number }

export const IcoCasa = ({ size }: Tam) => <Trazo size={size}><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></Trazo>
export const IcoCaja = ({ size }: Tam) => <Trazo size={size}><path d="M21 8 12 3 3 8v8l9 5 9-5z" /><path d="m3 8 9 5 9-5M12 13v8" /></Trazo>
export const IcoBandeja = ({ size }: Tam) => <Trazo size={size}><path d="M22 12h-6l-2 3h-4l-2-3H2" /><path d="M5.5 5h13L22 12v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-6z" /></Trazo>
export const IcoCorazon = ({ size }: Tam) => <Trazo size={size}><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" /></Trazo>
export const IcoEstrella = ({ size }: Tam) => <Trazo size={size}><path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9z" /></Trazo>
export const IcoEscudo = ({ size }: Tam) => <Trazo size={size}><path d="M12 3 4 6v6c0 4.5 3.4 8.3 8 9 4.6-.7 8-4.5 8-9V6z" /><path d="m9 12 2 2 4-4" /></Trazo>
export const IcoCamion = ({ size }: Tam) => <Trazo size={size}><rect x="1" y="3" width="15" height="13" rx="1.5" /><path d="M16 8h4l3 5v3h-7z" /><circle cx="5.5" cy="18.5" r="2" /><circle cx="18.5" cy="18.5" r="2" /></Trazo>
export const IcoUsuario = ({ size }: Tam) => <Trazo size={size}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></Trazo>
export const IcoSobre = ({ size }: Tam) => <Trazo size={size}><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></Trazo>
export const IcoTelefono = ({ size }: Tam) => <Trazo size={size}><rect x="7" y="2" width="10" height="20" rx="2" /><path d="M11 18h2" /></Trazo>
export const IcoCandado = ({ size }: Tam) => <Trazo size={size}><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></Trazo>
export const IcoPin = ({ size }: Tam) => <Trazo size={size}><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21z" /><circle cx="12" cy="9.5" r="2.5" /></Trazo>
export const IcoMas = ({ size = 18 }: Tam) => <Trazo size={size} ancho={2}><path d="M12 5v14M5 12h14" /></Trazo>
export const IcoSalir = ({ size }: Tam) => <Trazo size={size}><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></Trazo>
export const IcoChevron = ({ size = 18 }: Tam) => <Trazo size={size} ancho={2}><path d="m9 18 6-6-6-6" /></Trazo>
export const IcoReloj = ({ size }: Tam) => <Trazo size={size}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></Trazo>
export const IcoWhatsapp = ({ size }: Tam) => <Trazo size={size}><path d="M21 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20.5l1.7-5A8.5 8.5 0 1 1 21 11.5z" /></Trazo>
export const IcoExterno = ({ size = 18 }: Tam) => <Trazo size={size} ancho={2}><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></Trazo>
export const IcoCamara = ({ size }: Tam) => <Trazo size={size}><path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" /><circle cx="12" cy="13.5" r="3.5" /></Trazo>
export const IcoInfo = ({ size }: Tam) => <Trazo size={size}><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></Trazo>
export const IcoBuscarCaja = ({ size }: Tam) => <Trazo size={size}><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></Trazo>

/** Ámbar de las estrellas de Figma (`30:1383`): no existe token equivalente. */
const COLOR_ESTRELLA = '#F2A900'

/** Estrella de calificación: contorno gris o relleno ámbar (Figma `30:1342`, `30:1383`). */
export function EstrellaCalificacion({ llena, size }: { llena: boolean; size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" className="shrink-0"
      fill={llena ? COLOR_ESTRELLA : 'none'}
      stroke={llena ? COLOR_ESTRELLA : 'var(--hc-n-400)'} strokeWidth={1.6} strokeLinejoin="round">
      <path d="m12 3 2.7 5.5 6 .9-4.3 4.2 1 6-5.4-2.9-5.4 2.9 1-6L3.3 9.4l6-.9z" />
    </svg>
  )
}
