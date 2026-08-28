import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { RUTA_SISTEMA_MARCA } from '@/utils/rutaTienda'

type PasoEmprende = {
  tituloI18n: string
  hintI18n: string
  to: string | null
}

const PASOS_NUEVO: PasoEmprende[] = [
  { tituloI18n: 'emprende.paso1', hintI18n: 'emprende.paso1hint', to: '/registro-empresa' },
  { tituloI18n: 'emprende.paso2', hintI18n: 'emprende.paso2hint', to: null },
  { tituloI18n: 'emprende.paso3', hintI18n: 'emprende.paso3hint', to: null },
]

const PASOS_DUENIO: PasoEmprende[] = [
  { tituloI18n: 'emprende.pasoOwner1', hintI18n: 'emprende.pasoOwner1hint', to: RUTA_SISTEMA_MARCA },
  { tituloI18n: 'emprende.pasoOwner2', hintI18n: 'emprende.pasoOwner2hint', to: '/admin/productos/nuevo' },
  { tituloI18n: 'emprende.pasoOwner3', hintI18n: 'emprende.pasoOwner3hint', to: '/admin/billing/planes' },
]

const estiloPaso = {
  borderColor: 'var(--hc-border)',
  backgroundColor: 'var(--hc-surface)',
  color: 'var(--hc-text)',
}

/** Checklist de crecimiento: crear negocio o continuar en Sistema. */
export default function EmprendePasos({ yaEsDuenio }: { yaEsDuenio: boolean }) {
  const { t } = useTranslation()
  const pasos = yaEsDuenio ? PASOS_DUENIO : PASOS_NUEVO

  return (
    <ol className="flex flex-col gap-3">
      {pasos.map((paso, indice) => (
        <PasoItem
          key={paso.tituloI18n}
          indice={indice}
          title={t(paso.tituloI18n)}
          hint={t(paso.hintI18n)}
          to={paso.to}
        />
      ))}
    </ol>
  )
}

function PasoItem({ indice, title, hint, to }: { indice: number; title: string; hint: string; to: string | null }) {
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
