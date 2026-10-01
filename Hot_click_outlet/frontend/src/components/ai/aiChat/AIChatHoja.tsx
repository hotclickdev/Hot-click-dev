import { useState, type Dispatch, type KeyboardEvent, type MouseEvent, type RefObject, type SetStateAction } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import IconoFigma from '@/components/comprador/IconoFigma'
import { fotoProducto, nombreVendedor } from '@/components/comprador/productCardHelpers'
import { getOptimizedUrl } from '@/utils/imageUtils'
import { ICONOS_CHAT } from '../iconosChat'
import { etiquetaPrecioChat, requiereFichaEncargo } from '../chatProductoPrecio'
import { MarkdownSpan } from './MarkdownSpan'
import type { AiChatMensaje, AiChatProducto } from './aiChatHelpers'
import type { Producto } from '@/types/producto'

/** Producto recomendado en la hoja del asistente (Figma `8:261`): foto 64, nombre, tienda, precio y Agregar. */
function ProductoRecomendado({ producto, onAdd }: { producto: AiChatProducto; onAdd: (producto: Producto) => void }) {
  const { t } = useTranslation()
  const [agregado, setAgregado] = useState(false)
  const encargo = requiereFichaEncargo(producto)
  const sinStock = producto.stock === 0 && !encargo
  const foto = fotoProducto(producto)
  const imagen = foto ? getOptimizedUrl(foto, { width: 160, quality: 80 }) : null
  const destino = `/productos/${producto.id}`

  const agregar = (e: MouseEvent<HTMLButtonElement>) => {
    e.preventDefault()
    if (agregado || sinStock) return
    onAdd(producto)
    setAgregado(true)
    setTimeout(() => setAgregado(false), 2000)
  }

  const claseBoton = 'flex shrink-0 items-center gap-1 rounded-[10px] py-2 pl-[10px] pr-3 text-[12px] font-semibold leading-[normal]'

  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[10px]">
      <Link to={destino} className="size-16 shrink-0 overflow-hidden rounded-[10px] bg-hc-n-100" tabIndex={-1} aria-hidden="true">
        {imagen && <img src={imagen} alt="" className="size-full object-cover" loading="lazy" />}
      </Link>
      <Link to={destino} className="flex min-w-0 flex-1 flex-col gap-[2px]">
        <span className="line-clamp-2 text-[13px] font-medium leading-[17px] text-hc-n-900">{producto.nombre}</span>
        <span className="truncate text-[11px] leading-[normal] text-hc-n-500">{nombreVendedor(producto)}</span>
        <span className="flex items-center gap-[6px] leading-[normal]">
          <span className="font-display text-[14px] font-bold text-hc-n-900">{etiquetaPrecioChat(producto)}</span>
          {producto.esPersonalizado && (
            <span className="rounded-full bg-hc-warning-bg px-[6px] py-[2px] text-[10px] font-semibold text-hc-warning">
              {t('comprador.tarjeta.hechoAPedido')}
            </span>
          )}
        </span>
      </Link>
      {encargo ? (
        <Link to={destino} className={`${claseBoton} bg-hc-red-500 text-hc-n-0`}>
          {t('chat.quote')}
        </Link>
      ) : (
        <button
          type="button"
          onClick={agregar}
          disabled={sinStock}
          className={`${claseBoton} ${agregado ? 'bg-hc-green-50 text-hc-green-600' : sinStock ? 'bg-hc-n-100 text-hc-n-500' : 'bg-hc-red-500 text-hc-n-0'}`}
        >
          {!agregado && !sinStock && <IconoFigma src={ICONOS_CHAT.agregar14} size={14} />}
          {agregado ? t('chat.added') : sinStock ? t('chat.outOfStock') : t('chat.add')}
        </button>
      )}
    </div>
  )
}

type MensajesHojaProps = {
  mensajes: AiChatMensaje[]
  enviar: (mensajeDirecto?: string) => void
  setMensajes: Dispatch<SetStateAction<AiChatMensaje[]>>
  removeMsg: (msg: AiChatMensaje) => (list: AiChatMensaje[]) => AiChatMensaje[]
  handleAdd: (producto: Producto) => void
}

/** Conversación de la hoja del asistente (Figma `8:244`): burbuja azul del usuario, respuesta en texto, productos y siguientes preguntas. */
export function MensajesHoja({ mensajes, enviar, setMensajes, removeMsg, handleAdd }: MensajesHojaProps) {
  const { t } = useTranslation()
  return mensajes.map((m, i) => {
    const esUltimo = i === mensajes.length - 1
    const opciones = esUltimo && !m.typing && m.opts && m.opts.length > 0 ? m.opts.slice(0, 2) : []
    if (m.rol === 'user') {
      return (
        <div key={i} className="flex w-full justify-end">
          <p className="max-w-full whitespace-pre-wrap rounded-[16px] rounded-br-[4px] bg-hc-blue-600 px-[14px] py-[10px] text-[14px] leading-[normal] text-hc-n-0">{m.texto}</p>
        </div>
      )
    }
    return (
      <div key={i} className="flex w-full flex-col gap-3">
        {m.typing && !m.texto ? (
          <p className="text-[14px] leading-5 text-hc-n-500" role="status">{t('chat.searching')}</p>
        ) : (
          <p className={`whitespace-pre-wrap text-[14px] leading-5 ${m.failed ? 'text-hc-danger' : 'text-hc-n-900'}`}>
            <MarkdownSpan text={m.texto ?? ''} />
            {m.failed && (
              <button
                type="button"
                onClick={() => { setMensajes(removeMsg(m)); enviar(m.failedQuery) }}
                className="ml-2 text-[13px] font-semibold text-hc-blue-600"
              >
                {t('chat.retry')}
              </button>
            )}
          </p>
        )}
        {m.productos?.map((p, pi) => <ProductoRecomendado key={p.id ?? pi} producto={p} onAdd={handleAdd} />)}
        {opciones.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {opciones.map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => enviar(opt)}
                className="rounded-full border border-hc-n-200 bg-hc-n-0 px-[14px] py-2 text-[13px] font-medium leading-[normal] text-hc-n-900"
              >
                {opt}
              </button>
            ))}
          </div>
        )}
      </div>
    )
  })
}

/** Chips de arranque de la hoja del asistente, con el estilo de chip del Figma (`5:44`). */
export function ChipsHoja({ chips, enviar }: { chips: string[]; enviar: (chip: string) => void }) {
  if (chips.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((chip) => (
        <button
          key={chip}
          type="button"
          onClick={() => enviar(chip)}
          className="rounded-full border border-hc-n-200 bg-hc-n-0 px-[14px] py-2 text-[13px] font-medium leading-[normal] text-hc-n-900"
        >
          {chip}
        </button>
      ))}
    </div>
  )
}

type BarraEscribirHojaProps = {
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>
  input: string
  setInput: Dispatch<SetStateAction<string>>
  onKeyDown: (e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => void
  enviar: (mensajeDirecto?: string) => void
  cargando: boolean
  placeholder: string
  showHumanButton: boolean
  whatsappNumber: string
}

/** Barra para escribir (Figma `8:307`): campo gris de 12 px de radio y botón azul de enviar de 34. */
export function BarraEscribirHoja({
  inputRef, input, setInput, onKeyDown, enviar, cargando, placeholder, showHumanButton, whatsappNumber,
}: BarraEscribirHojaProps) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-2 rounded-[12px] bg-hc-n-100 py-[6px] pl-[14px] pr-[6px]">
      <input
        ref={inputRef as RefObject<HTMLInputElement>}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder={cargando ? t('chat.searching') : placeholder}
        aria-label={placeholder}
        disabled={cargando}
        maxLength={500}
        className="hc-input-libre min-w-0 flex-1 bg-transparent text-[14px] leading-[18px] text-hc-n-900 outline-none placeholder:text-hc-n-500 disabled:opacity-50"
      />
      {showHumanButton && (
        <a
          href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent('Hola HotClick, consulto un producto.')}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={t('chat.whatsapp')}
          title={t('chat.whatsapp')}
          className="flex size-[34px] shrink-0 items-center justify-center text-hc-n-500"
        >
          <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            <path d="M12 0C5.373 0 0 5.373 0 12c0 2.089.54 4.05 1.485 5.757L.057 23.882l6.233-1.43A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.804a9.777 9.777 0 01-4.986-1.367l-.358-.212-3.714.852.882-3.613-.23-.371A9.782 9.782 0 012.196 12C2.196 6.58 6.58 2.196 12 2.196S21.804 6.58 21.804 12 17.42 21.804 12 21.804z" />
          </svg>
        </a>
      )}
      <button
        type="button"
        onClick={() => enviar()}
        disabled={!input.trim() || cargando}
        aria-label={t('chat.send')}
        className="flex size-[34px] shrink-0 items-center justify-center rounded-[9px] bg-hc-blue-600 text-hc-n-0 disabled:opacity-40"
      >
        <IconoFigma src={ICONOS_CHAT.enviar16} size={16} />
      </button>
    </div>
  )
}
