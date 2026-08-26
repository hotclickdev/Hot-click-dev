import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RUTA_SISTEMA_MARCA } from '@/utils/rutaTienda'

const PASOS_NUEVO = [
  { titleKey: 'emprende.paso1', hintKey: 'emprende.paso1hint', to: '/registro-empresa' },
  { titleKey: 'emprende.paso2', hintKey: 'emprende.paso2hint', to: null },
  { titleKey: 'emprende.paso3', hintKey: 'emprende.paso3hint', to: null },
]

const PASOS_DUENIO = [
  { titleKey: 'emprende.pasoOwner1', hintKey: 'emprende.pasoOwner1hint', to: RUTA_SISTEMA_MARCA },
  { titleKey: 'emprende.pasoOwner2', hintKey: 'emprende.pasoOwner2hint', to: '/admin/productos/nuevo' },
  { titleKey: 'emprende.pasoOwner3', hintKey: 'emprende.pasoOwner3hint', to: '/admin/billing/planes' },
]

const estiloPaso = {
  borderColor: 'var(--hc-border)',
  backgroundColor: 'var(--hc-surface)',
  color: 'var(--hc-text)',
}

/** Checklist de crecimiento: crear negocio o continuar en Sistema. */
export default function EmprendePasos({ yaEsDuenio }) {
  const { t } = useTranslation()
  const pasos = yaEsDuenio ? PASOS_DUENIO : PASOS_NUEVO

  return (
    <ol className="flex flex-col gap-3">
      {pasos.map((paso, indice) => (
        <PasoItem
          key={paso.titleKey}
          indice={indice}
          title={t(paso.titleKey)}
          hint={t(paso.hintKey)}
          to={paso.to}
        />
      ))}
    </ol>
  )
}

function PasoItem({ indice, title, hint, to }) {
  const cuerpo = (
    <>
      <span
        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
        style={{ backgroundColor: 'var(--hc-primary)', color: '#fff' }}
      >
        {indice + 1}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold">{title}</span>
        <span className="block text-xs mt-0.5" style={{ color: 'var(--hc-muted)' }}>{hint}</span>
      </span>
    </>
  )
  const clase = 'flex items-start gap-3 rounded-2xl border px-4 py-4 min-h-[44px]'
  if (!to) {
    return <li><div className={clase} style={estiloPaso}>{cuerpo}</div></li>
  }
  return (
    <li>
      <Link to={to} className={clase} style={estiloPaso}>{cuerpo}</Link>
    </li>
  )
}
