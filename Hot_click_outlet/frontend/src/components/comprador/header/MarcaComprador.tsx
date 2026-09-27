import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import isotipo from '@/assets/figma/comprador/isotipo.png'

type MarcaCompradorProps = {
  tamano: 'movil' | 'escritorio' | 'compra'
}

const MEDIDAS = {
  movil: { isotipo: 'size-[30px]', texto: 'text-[19px]' },
  escritorio: { isotipo: 'size-[34px]', texto: 'text-[22px]' },
  compra: { isotipo: 'size-[26px]', texto: 'text-[17px]' },
} as const

/** Isotipo + wordmark bicolor del header (Figma `7:5` / `9:174`; compra segura `28:1086`). */
export default function MarcaComprador({ tamano }: MarcaCompradorProps) {
  const { t } = useTranslation()
  const medidas = MEDIDAS[tamano]
  return (
    <Link to="/" aria-label={t('comprador.header.marcaAria')} className="flex shrink-0 items-center gap-2">
      <img src={isotipo} alt="" className={`${medidas.isotipo} object-contain`} />
      <span className={`font-display font-extrabold whitespace-nowrap ${medidas.texto}`}>
        <span className="text-hc-red-500">Hot</span>
        <span className="text-hc-blue-600">Click</span>
      </span>
    </Link>
  )
}
