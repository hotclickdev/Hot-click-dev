import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import isotipo from '@/assets/figma/comprador/isotipo.png'

type MarcaCompradorProps = {
  /** `pequena`: logo de 28px de las barras de solo marca (Figma `45:2200`). */
  tamano: 'centrada' | 'pequena' | 'movil' | 'escritorio'
}

const MEDIDAS = {
  /** Logo de 26px de la barra centrada del pago exitoso (Figma `29:1932`). */
  centrada: { isotipo: 'size-[26px]', texto: 'text-[17px]' },
  pequena: { isotipo: 'size-[28px]', texto: 'text-[18px]' },
  movil: { isotipo: 'size-[30px]', texto: 'text-[19px]' },
  escritorio: { isotipo: 'size-[34px]', texto: 'text-[22px]' },
} as const

/** Isotipo + wordmark bicolor del header (Figma `7:5` / `9:174`). */
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
