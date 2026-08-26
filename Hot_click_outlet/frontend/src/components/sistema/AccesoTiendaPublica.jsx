import { Link } from 'react-router-dom'
import { useTiendaPublica } from '@/hooks/useTiendaPublica'
import { puedePublicarTienda, RUTA_SISTEMA_VISIBILIDAD } from '@/utils/rutaTienda'
import CopiarLinkTienda from '@/components/sistema/CopiarLinkTienda'

const CHIP = {
  backgroundColor: 'var(--hc-surface)',
  color: 'var(--hc-text)',
  border: '1px solid var(--hc-border)',
}

/**
 * Link público de la tienda, o el siguiente paso real si todavía no responde.
 * @param {{ variante?: 'fila' | 'enlace' | 'muted', conCopiar?: boolean }} props
 */
export default function AccesoTiendaPublica({ variante = 'fila', conCopiar = true }) {
  const { tiendaPublica, rutaTienda, estadoEmpresa, visibilidadPublica } = useTiendaPublica()

  if (tiendaPublica && rutaTienda) {
    return <LinksPublicos ruta={rutaTienda} variante={variante} conCopiar={conCopiar} />
  }
  if (puedePublicarTienda({ estadoEmpresa, visibilidadPublica })) {
    return <LinkPublicar variante={variante} />
  }
  if (estadoEmpresa === 'PENDIENTE_APROBACION') {
    return <span className={claseTexto(variante)} style={estiloMuted(variante)}>
      Tu tienda se publica cuando HotClick apruebe el negocio
    </span>
  }
  return null
}

function LinksPublicos({ ruta, variante, conCopiar }) {
  return (
    <>
      <Link to={ruta} className={claseLink(variante)} style={estiloLink(variante)}>
        Ver mi tienda
      </Link>
      {conCopiar && <CopiarLinkTienda ruta={ruta} />}
    </>
  )
}

function LinkPublicar({ variante }) {
  return (
    <Link to={RUTA_SISTEMA_VISIBILIDAD} className={claseLink(variante)} style={estiloLink(variante)}>
      Publicá tu tienda
    </Link>
  )
}

function claseLink(variante) {
  if (variante === 'fila') {
    return 'flex items-center justify-center px-5 py-3.5 rounded-xl text-sm font-semibold transition-colors min-h-11'
  }
  if (variante === 'enlace') {
    return 'text-sm font-semibold min-h-11 inline-flex items-center'
  }
  return 'text-sm font-semibold hover:underline min-h-11 inline-flex items-center'
}

function estiloLink(variante) {
  if (variante === 'fila') return CHIP
  if (variante === 'enlace') return { color: 'var(--hc-accent)' }
  return { color: 'var(--hc-muted)' }
}

function claseTexto(variante) {
  if (variante === 'fila') {
    return 'inline-flex items-center px-5 py-3.5 rounded-xl text-sm min-h-11'
  }
  return 'text-sm'
}

function estiloMuted(variante) {
  if (variante === 'fila') return { ...CHIP, color: 'var(--hc-muted)' }
  return { color: 'var(--hc-muted)' }
}
