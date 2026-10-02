import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Seo from '@/components/seo/Seo'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { shoppingAssistantService } from '@/services/shoppingAssistantService'
import { formatPrice } from '@/utils/format'
import { ICONOS_CATALOGO } from '@/pages/catalogo/iconosCatalogo'
import { etiquetaParecido, leerRespuestaFoto, type RespuestaFoto } from './busquedaFoto'
import { SLUG_MARKETPLACE } from './rutasBuscar'

type Estado = 'inicio' | 'buscando' | 'listo' | 'error'

/** Buscar con una foto (Figma `27:882`): sube la imagen y muestra lo detectado y productos parecidos. */
export default function BusquedaFotoPage() {
  const { t } = useTranslation()
  const camaraRef = useRef<HTMLInputElement>(null)
  const galeriaRef = useRef<HTMLInputElement>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [estado, setEstado] = useState<Estado>('inicio')
  const [respuesta, setRespuesta] = useState<RespuestaFoto>({ categoriaDetectada: '', etiquetas: [], productos: [] })
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set())

  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista) }, [vista])

  const alElegir = async (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (!archivo) return
    setVista(URL.createObjectURL(archivo))
    setDescartadas(new Set())
    setEstado('buscando')
    try {
      const data = await shoppingAssistantService.searchByImage({ empresaSlug: SLUG_MARKETPLACE, imageFile: archivo })
      setRespuesta(leerRespuestaFoto(data))
      setEstado('listo')
    } catch {
      setEstado('error')
    }
  }

  const etiquetas = respuesta.etiquetas.filter((e) => !descartadas.has(e))

  return (
    <MainLayout variante="interna" titulo={t('search.photoTitle')} esTituloPrincipal>
      <Seo title={t('search.photoTitle')} description={t('search.photoSearchSub')} />
      <h1 className="sr-only max-lg:hidden">{t('search.photoTitle')}</h1>
      <div className="mx-auto flex w-full max-w-[480px] flex-col">
        <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={alElegir} tabIndex={-1} aria-hidden="true" />
        <input ref={galeriaRef} type="file" accept="image/*" className="sr-only" onChange={alElegir} tabIndex={-1} aria-hidden="true" />

        <div className="flex flex-col gap-3 px-4 pb-2 pt-4">
          {vista ? (
            <img src={vista} alt={t('search.photoPreviewAlt')} className="h-[260px] w-full rounded-[16px] object-cover" />
          ) : (
            <div className="flex h-[260px] flex-col items-center justify-center gap-3 rounded-[16px] border border-dashed border-hc-n-200 bg-hc-n-50 px-6 text-center">
              <IconoFigma src={ICONOS_COMPRADOR.buscarFoto} size={32} className="text-hc-blue-600" />
              <p className="text-[14px] text-hc-n-600">{t('search.photoSearchSub')}</p>
            </div>
          )}

          {estado === 'listo' && etiquetas.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12px] text-hc-n-500">{t('search.photoDetected')}</span>
              {etiquetas.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setDescartadas((prev) => new Set(prev).add(e))}
                  aria-label={t('search.photoRemoveTag', { tag: e })}
                  className="flex items-center gap-[6px] rounded-full border border-hc-n-200 bg-hc-n-0 px-[14px] py-2 text-[13px] font-medium text-hc-n-900"
                >
                  {e}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}

          <div className="flex gap-[10px]">
            <button type="button" onClick={() => camaraRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-[13px] text-[14px] font-semibold text-hc-n-900">
              <IconoFigma src={ICONOS_COMPRADOR.buscarFoto} size={18} />
              {vista ? t('search.photoAnother') : t('search.photoTake')}
            </button>
            <button type="button" onClick={() => galeriaRef.current?.click()} className="flex flex-1 items-center justify-center gap-2 rounded-[12px] border border-hc-n-200 bg-hc-n-0 px-4 py-[13px] text-[14px] font-semibold text-hc-n-900">
              <IconoFigma src={ICONOS_CATALOGO.galeria18} size={18} />
              {t('search.photoGallery')}
            </button>
          </div>
        </div>

        <section className="flex flex-col gap-3 px-4 pb-6 pt-[18px]" aria-live="polite">
          {estado === 'buscando' && <p className="text-[14px] text-hc-n-600">{t('search.photoSearching')}</p>}
          {estado === 'error' && <p className="text-[14px] text-hc-danger">{t('search.photoError')}</p>}
          {estado === 'listo' && (
            <>
              <h2 className="font-display text-[16px] font-bold text-hc-n-900">{t('search.photoSimilar')}</h2>
              {respuesta.productos.length === 0 && <p className="text-[14px] text-hc-n-600">{t('search.photoNone')}</p>}
              {respuesta.productos.map((p) => {
                const rotulo = etiquetaParecido(p, respuesta.categoriaDetectada)
                const muyParecido = rotulo === 'muyParecido'
                return (
                  <Link key={p.id} to={`/productos/${p.id}`} className="flex items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[10px]">
                    <span className="size-[72px] shrink-0 overflow-hidden rounded-[10px] bg-hc-n-100">
                      {p.imagenUrl && <img src={p.imagenUrl} alt="" className="size-full object-cover" loading="lazy" />}
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">
                      <span className={`rounded-full px-[7px] py-[2px] text-[10px] font-semibold ${muyParecido ? 'bg-hc-green-50 text-hc-green-600' : 'bg-hc-n-100 text-hc-n-600'}`}>
                        {t(`search.photo${rotulo === 'muyParecido' ? 'VerySimilar' : rotulo === 'mismaCategoria' ? 'SameCategory' : 'Related'}`)}
                      </span>
                      <span className="truncate text-[14px] font-medium text-hc-n-900">{p.nombre}</span>
                      {p.tienda && <span className="truncate text-[12px] text-hc-n-500">{p.tienda}</span>}
                    </span>
                    <span className="shrink-0 font-display text-[15px] font-bold text-hc-n-900">{formatPrice(p.precio)}</span>
                  </Link>
                )
              })}
            </>
          )}
        </section>
      </div>
    </MainLayout>
  )
}
