import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import EstadoVacio from '@/components/comprador/estados/EstadoVacio'
import { testimonioService } from '@/services/testimonioService'
import useImageUpload from '../useImageUpload'
import { mensajeErrorApi } from '../perfilHelpers'
import { fechaCorta, productosPendientesDeOpinar, type OpinionEnviada, type ProductoPorOpinar } from './cuentaHelpers'
import { EstrellaCalificacion, IcoEstrella } from './iconosCuenta'
import { Miniatura } from './piezasCuenta'
import type { PedidoCliente } from '../../pedidos/pedidoHelpers'

type CuentaOpinionesProps = {
  porOpinar: ProductoPorOpinar[]
  pedidos: PedidoCliente[]
  opiniones: OpinionEnviada[]
  onEnviada: () => void
}

/** Tienda y fecha de entrega del producto, sacadas del pedido que ya se cargó (el endpoint solo manda `pedidoId`). */
function origenDelProducto(p: ProductoPorOpinar, pedidos: PedidoCliente[]) {
  const pedido = pedidos.find((o) => String(o.id) === String(p.pedidoId))
  const item = pedido?.items?.find((i) => String(i.producto?.id ?? i.productoId) === String(p.productoId))
  return {
    tienda: item?.producto?.empresaNombre ?? pedido?.nombreEmpresa ?? null,
    entrega: pedido?.fechaEntregaReal ?? pedido?.fechaPedido ?? null,
  }
}

function Estrellas({ valor, tam, onElegir, etiqueta }: { valor: number; tam: number; onElegir?: (n: number) => void; etiqueta: string }) {
  return (
    <div className={`flex items-start ${tam >= 32 ? 'gap-1' : 'gap-1'}`} role={onElegir ? 'radiogroup' : 'img'} aria-label={etiqueta}>
      {[1, 2, 3, 4, 5].map((n) => onElegir ? (
        <button key={n} type="button" role="radio" aria-checked={valor === n} aria-label={`${n}`} onClick={() => onElegir(n)} className="flex">
          <EstrellaCalificacion llena={n <= valor} size={tam} />
        </button>
      ) : <EstrellaCalificacion key={n} llena={n <= valor} size={tam} />)}
    </div>
  )
}

/** Formulario común a la opinión de un producto y al testimonio de la tienda (Figma `30:1335`). */
function FormularioOpinion({ conCalificacion, onEnviar, sinFoto = false, placeholder }: {
  conCalificacion: boolean
  onEnviar: (datos: { comentario: string; calificacion: number; imagenUrl: string | null }) => Promise<void>
  sinFoto?: boolean
  placeholder: string
}) {
  const { t } = useTranslation()
  const toast = useToast()
  const img = useImageUpload(toast)
  const [calificacion, setCalificacion] = useState(0)
  const [comentario, setComentario] = useState('')
  const [enviando, setEnviando] = useState(false)

  const listo = comentario.trim().length > 0 && (!conCalificacion || calificacion > 0) && !img.uploading

  const enviar = async (e: FormEvent) => {
    e.preventDefault()
    if (!listo || enviando) return
    setEnviando(true)
    try {
      await onEnviar({ comentario: comentario.trim(), calificacion, imagenUrl: img.imagenUrl })
    } finally {
      setEnviando(false)
    }
  }

  return (
    <form onSubmit={enviar} className="flex flex-col gap-3">
      {conCalificacion && (
        <>
          <p className="text-[13px] font-medium leading-[normal] text-hc-n-600">{t('cuenta.opiniones.pregunta')}</p>
          <Estrellas valor={calificacion} tam={32} onElegir={setCalificacion} etiqueta={t('cuenta.opiniones.calificacion')} />
        </>
      )}
      <textarea
        value={comentario}
        onChange={(e) => setComentario(e.target.value)}
        maxLength={500}
        rows={1}
        placeholder={placeholder}
        aria-label={placeholder}
        className="hc-input-libre min-h-[41px] w-full resize-none rounded-[10px] border border-hc-n-200 bg-hc-n-50 p-3 text-[13px] leading-[normal] text-hc-n-900 [field-sizing:content] placeholder:text-hc-n-400 focus:border-hc-blue-600 focus:outline-none"
      />
      {img.preview && (
        <span className="flex items-center gap-2 text-[12px] text-hc-n-600">
          <img src={img.preview} alt="" className="size-10 rounded-[8px] object-cover" />
          <button type="button" onClick={img.reset} className="font-semibold text-hc-blue-600">{t('cuenta.opiniones.quitarFoto')}</button>
        </span>
      )}
      <div className="flex items-center justify-between">
        {sinFoto ? <span /> : (
          <label className="cursor-pointer text-[13px] font-semibold leading-[normal] text-hc-blue-600">
            {img.uploading ? t('cuenta.opiniones.subiendoFoto') : t('cuenta.opiniones.agregarFoto')}
            <input type="file" accept="image/*" className="sr-only" onChange={img.handleFile} disabled={img.uploading} />
          </label>
        )}
        <button type="submit" disabled={!listo || enviando}
          className="flex items-center justify-center rounded-[12px] bg-hc-red-500 px-[14px] py-[11px] text-[14px] font-semibold leading-[normal] text-hc-n-0 hover:bg-hc-red-600 disabled:cursor-not-allowed disabled:opacity-60">
          {t('cuenta.opiniones.publicar')}
        </button>
      </div>
    </form>
  )
}

/** Mis opiniones: Figma `30:1327`. Pendientes (con el formulario del primero abierto) y publicadas. */
export default function CuentaOpiniones({ porOpinar, pedidos, opiniones, onEnviada }: CuentaOpinionesProps) {
  const { t, i18n } = useTranslation()
  const toast = useToast()
  const pendientes = productosPendientesDeOpinar(porOpinar)
  const [abiertoManual, setAbiertoManual] = useState<string | null>(null)
  const abierto = abiertoManual && pendientes.some((p) => String(p.productoId) === abiertoManual)
    ? abiertoManual
    : String(pendientes[0]?.productoId ?? '')

  const publicar = async (producto: ProductoPorOpinar, d: { comentario: string; calificacion: number; imagenUrl: string | null }) => {
    try {
      await testimonioService.crearResena({ productoId: Number(producto.productoId), comentario: d.comentario, calificacion: d.calificacion, imagenUrl: d.imagenUrl })
      toast({ message: t('cuenta.opiniones.enviada'), type: 'success' })
      setAbiertoManual(null)
      onEnviada()
    } catch (err: unknown) {
      const msg = mensajeErrorApi(err)
      toast({ message: typeof msg === 'string' && msg ? msg : t('cuenta.opiniones.errorEnvio'), type: 'error' })
    }
  }

  const publicarTestimonio = async (d: { comentario: string; imagenUrl: string | null }) => {
    try {
      await testimonioService.crearTestimonio({ comentario: d.comentario, imagenUrl: d.imagenUrl })
      toast({ message: t('cuenta.opiniones.testimonioEnviado'), type: 'success' })
      onEnviada()
    } catch (err: unknown) {
      const msg = mensajeErrorApi(err)
      toast({ message: typeof msg === 'string' && msg ? msg : t('cuenta.opiniones.errorEnvio'), type: 'error' })
    }
  }

  const publicadas = opiniones.filter((o) => o.estado !== 'RECHAZADO' || o.tipo === 'RESENA')

  return (
    <div className="flex flex-col bg-hc-n-50 lg:max-w-[560px] lg:bg-transparent">
      <section className="flex flex-col gap-3 px-4 pb-2 pt-4 lg:p-0 lg:pb-5">
        <h2 className="font-display text-[16px] font-bold leading-[normal] text-hc-n-900">{t('cuenta.opiniones.pendientes')}</h2>
        {pendientes.length === 0 && publicadas.length === 0 && (
          <EstadoVacio icono={<IcoEstrella size={26} />} titulo={t('cuenta.opiniones.vacioTitulo')} texto={t('cuenta.opiniones.vacioTexto')} />
        )}
        {pendientes.length === 0 && publicadas.length > 0 && (
          <p className="text-[13px] leading-[normal] text-hc-n-600">{t('cuenta.opiniones.sinPendientes')}</p>
        )}
        {pendientes.map((p) => {
          const id = String(p.productoId)
          const { tienda, entrega } = origenDelProducto(p, pedidos)
          const subtitulo = [tienda, entrega ? t('cuenta.opiniones.entregadoEl', { fecha: fechaCorta(entrega, i18n.language) }) : null].filter(Boolean).join(' · ')
          const esAbierto = id === abierto
          return (
            <article key={id} className="flex flex-col gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
              <div className="flex items-center gap-3">
                <Miniatura src={p.imagenUrl} tam={esAbierto ? 56 : 44} />
                <div className="flex min-w-0 flex-1 flex-col gap-px leading-[normal]">
                  <p className="truncate text-[14px] font-semibold text-hc-n-900">{p.nombre}</p>
                  {subtitulo && <p className="truncate text-[12px] text-hc-n-500">{subtitulo}</p>}
                </div>
                {!esAbierto && (
                  <button type="button" onClick={() => setAbiertoManual(id)} aria-label={t('cuenta.opiniones.opinarSobre', { producto: p.nombre })} className="flex gap-1">
                    {[1, 2, 3, 4, 5].map((n) => <EstrellaCalificacion key={n} llena={false} size={18} />)}
                  </button>
                )}
              </div>
              {esAbierto && (
                <FormularioOpinion
                  key={id}
                  conCalificacion
                  placeholder={t('cuenta.opiniones.experiencia')}
                  onEnviar={(d) => publicar(p, d)}
                />
              )}
            </article>
          )
        })}
      </section>

      {publicadas.length > 0 && (
        <section className="flex flex-col gap-3 px-4 py-5 lg:p-0 lg:pb-5">
          <h2 className="font-display text-[16px] font-bold leading-[normal] text-hc-n-900">{t('cuenta.opiniones.publicadas')}</h2>
          {publicadas.map((o) => {
            const aprobada = o.estado === 'APROBADO'
            const rechazada = o.estado === 'RECHAZADO'
            return (
              <article key={String(o.id)} className="flex flex-col gap-2 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
                <div className="flex items-center gap-3">
                  <Miniatura src={o.productoImagenUrl} tam={44} />
                  <div className="flex min-w-0 flex-1 flex-col gap-[2px] leading-[normal]">
                    <p className="truncate text-[14px] font-semibold text-hc-n-900">{o.productoNombre ?? t('cuenta.opiniones.deHotclick')}</p>
                    {o.calificacion ? <Estrellas valor={o.calificacion} tam={14} etiqueta={t('cuenta.opiniones.calificacionDe', { count: o.calificacion })} /> : null}
                  </div>
                </div>
                <p className="text-[13px] leading-[19px] text-hc-n-600">“{o.comentario}”</p>
                <div className="flex items-center gap-[6px] leading-[normal]">
                  <span className={`rounded-full px-2 py-[3px] text-[11px] font-semibold ${aprobada ? 'bg-hc-green-50 text-hc-success' : rechazada ? 'bg-hc-n-100 text-hc-n-600' : 'bg-hc-warning-bg text-hc-warning'}`}>
                    {aprobada ? t('cuenta.opiniones.estadoPublicada') : rechazada ? t('cuenta.opiniones.estadoNoPublicada') : t('cuenta.opiniones.estadoRevision')}
                  </span>
                  <span className="text-[11px] text-hc-n-500">{t('cuenta.opiniones.revisada')}</span>
                </div>
              </article>
            )
          })}
        </section>
      )}

      {/* Función previa sin frame en Figma: testimonio general de la tienda. Se conserva con el mismo lenguaje visual. */}
      <section className="flex flex-col gap-3 px-4 pb-5 lg:p-0">
        <h2 className="font-display text-[16px] font-bold leading-[normal] text-hc-n-900">{t('cuenta.opiniones.testimonioTitulo')}</h2>
        <article className="rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[14px]">
          <FormularioOpinion
            conCalificacion={false}
            placeholder={t('cuenta.opiniones.testimonioPlaceholder')}
            onEnviar={(d) => publicarTestimonio(d)}
          />
        </article>
      </section>
    </div>
  )
}
