import { useEffect, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import Seo from '@/components/seo/Seo'
import IconoFigma from '@/components/comprador/IconoFigma'
import { ICONOS_COMPRADOR } from '@/components/comprador/iconosComprador'
import { shoppingAssistantService } from '@/services/shoppingAssistantService'
import useAuthStore from '@/store/authStore'
import { formatPrice } from '@/utils/format'
import { ICONOS_CATALOGO } from '@/pages/catalogo/iconosCatalogo'
import { etiquetaParecido, leerRespuestaFoto, validarFoto, type RespuestaFoto } from './busquedaFoto'
import PreguntaResultadoFoto, { type PasoResultadoFoto } from './PreguntaResultadoFoto'
import { descripcionSolicitudFoto } from './solicitudDesdeFoto'
import { SLUG_MARKETPLACE } from './rutasBuscar'

type Estado = 'inicio' | 'buscando' | 'listo' | 'error' | 'formato' | 'pesada'

const BOTON = 'flex h-12 flex-1 items-center justify-center gap-2 rounded-[12px] px-4 text-[14px] font-semibold leading-[normal] transition-colors focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--hc-blue-100)]'
const BOTON_PRIMARIO = `${BOTON} bg-hc-red-500 text-hc-n-0 hover:bg-hc-red-600`
const BOTON_SECUNDARIO = `${BOTON} border border-hc-n-200 bg-hc-n-0 text-hc-n-900 hover:border-hc-n-400`

/**
 * Buscar con una foto (Figma `27:882`, móvil): sube la imagen y muestra lo detectado y productos parecidos.
 * Antes de la primera foto, la pantalla explica qué hace (título, 3 pasos, consejos y nota de privacidad,
 * derivados del manual de marca); en escritorio esa explicación va en una columna al lado de la zona de carga.
 */
export default function BusquedaFotoPage() {
  const { t } = useTranslation()
  const userName = useAuthStore((s) => s.userName)
  const tieneSesion = useAuthStore((s) => Boolean(s.token))
  const camaraRef = useRef<HTMLInputElement>(null)
  const galeriaRef = useRef<HTMLInputElement>(null)
  const archivoRef = useRef<File | null>(null)
  const [vista, setVista] = useState<string | null>(null)
  const [estado, setEstado] = useState<Estado>('inicio')
  const [arrastrando, setArrastrando] = useState(false)
  const [respuesta, setRespuesta] = useState<RespuestaFoto>({ categoriaDetectada: '', etiquetas: [], productos: [] })
  const [descartadas, setDescartadas] = useState<Set<string>>(new Set())
  const [paso, setPaso] = useState<PasoResultadoFoto>('cerrada')

  useEffect(() => () => { if (vista) URL.revokeObjectURL(vista) }, [vista])

  const buscar = async (archivo: File) => {
    const valida = validarFoto(archivo)
    if (valida !== 'ok') {
      setEstado(valida)
      return
    }
    archivoRef.current = archivo
    setVista(URL.createObjectURL(archivo))
    setDescartadas(new Set())
    setRespuesta({ categoriaDetectada: '', etiquetas: [], productos: [] })
    setPaso('cerrada')
    setEstado('buscando')
    try {
      const data = await shoppingAssistantService.searchByImage({ empresaSlug: SLUG_MARKETPLACE, imageFile: archivo })
      const leida = leerRespuestaFoto(data)
      setRespuesta(leida)
      setPaso(leida.productos.length > 0 ? 'producto' : 'solicitud')
      setEstado('listo')
    } catch {
      setPaso('solicitud')
      setEstado('error')
    }
  }

  const alElegir = (e: ChangeEvent<HTMLInputElement>) => {
    const archivo = e.target.files?.[0]
    e.target.value = ''
    if (archivo) void buscar(archivo)
  }

  const alSoltar = (e: DragEvent<HTMLElement>) => {
    e.preventDefault()
    setArrastrando(false)
    const archivo = e.dataTransfer.files?.[0]
    if (archivo) void buscar(archivo)
  }

  const etiquetas = respuesta.etiquetas.filter((e) => !descartadas.has(e))
  const conFoto = vista != null
  const avisoArchivo = estado === 'formato' || estado === 'pesada' ? t(estado === 'formato' ? 'search.photoBadType' : 'search.photoTooBig') : null

  return (
    <MainLayout variante="interna" titulo={t('search.photoTitle')} esTituloPrincipal>
      <Seo title={t('search.photoTitle')} description={t('search.photoSearchSub')} />
      <input ref={camaraRef} type="file" accept="image/*" capture="environment" className="sr-only" onChange={alElegir} tabIndex={-1} aria-hidden="true" />
      <input ref={galeriaRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="sr-only" onChange={alElegir} tabIndex={-1} aria-hidden="true" />

      <div className="mx-auto grid w-full max-w-[480px] gap-x-10 leading-[normal] lg:max-w-[1040px] lg:grid-cols-[minmax(0,1fr)_360px] lg:px-8 lg:pb-12 lg:pt-8">
        <div className="flex min-w-0 flex-col">
          <div className="flex flex-col gap-4 px-4 pb-2 pt-4 lg:px-0 lg:pt-0">
            {!conFoto && (
              <header className="flex flex-col gap-[6px] bg-transparent">
                <h1 className="hidden font-display text-[28px] font-bold leading-[34px] text-hc-n-900 lg:block">{t('search.photoHeroTitle')}</h1>
                <h2 className="font-display text-[20px] font-bold leading-[26px] text-hc-n-900 lg:hidden">{t('search.photoHeroTitle')}</h2>
                <p className="text-[14px] leading-[20px] text-hc-n-600 lg:text-[15px] lg:leading-[22px]">{t('search.photoHeroSub')}</p>
              </header>
            )}

            {conFoto ? (
              <img src={vista} alt={t('search.photoPreviewAlt')} className="h-[260px] w-full rounded-[16px] object-cover lg:h-[360px]" />
            ) : (
              <button
                type="button"
                onClick={() => galeriaRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setArrastrando(true) }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={alSoltar}
                aria-describedby="foto-formatos"
                className={`flex h-[220px] w-full flex-col items-center justify-center gap-3 rounded-[16px] border-[1.5px] border-dashed px-6 text-center transition-colors focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_var(--hc-blue-100)] lg:h-[300px] ${
                  arrastrando ? 'border-hc-blue-600 bg-hc-blue-50' : 'border-hc-n-400 bg-hc-n-0 hover:border-hc-blue-600'
                }`}
              >
                <span className="flex size-16 items-center justify-center rounded-full bg-hc-blue-50 text-hc-blue-600">
                  <IconoFigma src={ICONOS_COMPRADOR.buscarFoto} size={28} />
                </span>
                <span className="text-[15px] font-semibold text-hc-n-900">
                  <span className="lg:hidden">{t('search.photoDropMobile')}</span>
                  <span className="hidden lg:inline">{t('search.photoDrop')}</span>
                </span>
                <span id="foto-formatos" className="text-[12px] text-hc-n-600">{t('search.photoFormats')}</span>
              </button>
            )}

            {estado === 'listo' && etiquetas.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[12px] text-hc-n-600">{t('search.photoDetected')}</span>
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

            {conFoto ? (
              <div className="flex gap-[10px]">
                <button type="button" onClick={() => camaraRef.current?.click()} className={`${BOTON_SECUNDARIO} lg:hidden`}>
                  <IconoFigma src={ICONOS_COMPRADOR.buscarFoto} size={18} />
                  {t('search.photoAnother')}
                </button>
                <button type="button" onClick={() => galeriaRef.current?.click()} className={BOTON_SECUNDARIO}>
                  <IconoFigma src={ICONOS_CATALOGO.galeria18} size={18} />
                  <span className="lg:hidden">{t('search.photoGallery')}</span>
                  <span className="hidden lg:inline">{t('search.photoChooseAnother')}</span>
                </button>
              </div>
            ) : (
              <div className="flex gap-[10px]">
                <button type="button" onClick={() => camaraRef.current?.click()} className={`${BOTON_PRIMARIO} lg:hidden`}>
                  <IconoFigma src={ICONOS_COMPRADOR.buscarFoto} size={18} />
                  {t('search.photoTake')}
                </button>
                <button type="button" onClick={() => galeriaRef.current?.click()} className={`${BOTON_SECUNDARIO} lg:hidden`}>
                  <IconoFigma src={ICONOS_CATALOGO.galeria18} size={18} />
                  {t('search.photoGallery')}
                </button>
                <button type="button" onClick={() => galeriaRef.current?.click()} className={`${BOTON_PRIMARIO} hidden lg:flex`}>
                  <IconoFigma src={ICONOS_CATALOGO.galeria18} size={18} />
                  {t('search.photoChoose')}
                </button>
                <Link to="/productos" className={`${BOTON_SECUNDARIO} hidden lg:flex`}>
                  {t('search.photoExplore')}
                </Link>
              </div>
            )}
          </div>

          <section className={`flex flex-col gap-3 px-4 lg:px-0 ${estado === 'inicio' ? 'pb-2' : 'pb-6 pt-[18px]'}`} aria-live="polite">
            {avisoArchivo && <p className="rounded-[12px] bg-hc-danger-bg px-3 py-[10px] text-[13px] text-hc-danger">{avisoArchivo}</p>}
            {estado === 'buscando' && (
              <>
                <p className="text-[14px] text-hc-n-600">{t('search.photoSearching')}</p>
                {[0, 1].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[10px]" aria-hidden="true">
                    <span className="size-[72px] shrink-0 animate-pulse rounded-[10px] bg-hc-n-100" />
                    <span className="flex flex-1 flex-col gap-2">
                      <span className="h-3 w-1/3 animate-pulse rounded-full bg-hc-n-100" />
                      <span className="h-3 w-2/3 animate-pulse rounded-full bg-hc-n-100" />
                    </span>
                  </div>
                ))}
              </>
            )}
            {estado === 'error' && <p className="rounded-[12px] bg-hc-danger-bg px-3 py-[10px] text-[13px] text-hc-danger">{t('search.photoError')}</p>}
            {(estado === 'listo' || estado === 'error') && (
              <>
                {respuesta.productos.length > 0 && (
                  <h2 className="font-display text-[16px] font-bold text-hc-n-900">{t('search.photoSimilar')}</h2>
                )}
                {respuesta.productos.map((p) => {
                  const rotulo = etiquetaParecido(p, respuesta.categoriaDetectada)
                  const muyParecido = rotulo === 'muyParecido'
                  return (
                    <Link key={p.id} to={`/productos/${p.id}`} className="flex items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-[10px]">
                      <span className="size-[72px] shrink-0 overflow-hidden rounded-[10px] bg-hc-n-100">
                        {p.imagenUrl && <img src={p.imagenUrl} alt="" className="size-full object-cover" loading="lazy" />}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col items-start gap-[3px]">
                        <span className={`rounded-full px-[7px] py-[2px] text-[10px] font-semibold ${muyParecido ? 'bg-hc-green-50 text-hc-success-text' : 'bg-hc-n-100 text-hc-n-600'}`}>
                          {t(`search.photo${rotulo === 'muyParecido' ? 'VerySimilar' : rotulo === 'mismaCategoria' ? 'SameCategory' : 'Related'}`)}
                        </span>
                        <span className="truncate text-[14px] font-medium text-hc-n-900">{p.nombre}</span>
                        {p.tienda && <span className="truncate text-[12px] text-hc-n-600">{p.tienda}</span>}
                      </span>
                      <span className="shrink-0 font-display text-[15px] font-bold text-hc-n-900">{formatPrice(p.precio)}</span>
                    </Link>
                  )
                })}
                <PreguntaResultadoFoto
                  paso={paso}
                  sinParecidos={estado === 'error' || respuesta.productos.length === 0}
                  analisisFallo={estado === 'error'}
                  archivo={archivoRef.current}
                  descripcion={descripcionSolicitudFoto(etiquetas, respuesta.productos.length > 0, estado === 'error')}
                  nombre={userName}
                  tieneSesion={tieneSesion}
                  onPaso={setPaso}
                />
                <div className="h-52 lg:hidden" aria-hidden="true" />
              </>
            )}
          </section>
        </div>

        {(estado !== 'listo' && estado !== 'buscando') && <ComoFuncionaFoto />}
        {(estado === 'listo' || estado === 'buscando') && (
          <div className="hidden lg:block"><ComoFuncionaFoto /></div>
        )}
      </div>
    </MainLayout>
  )
}

/** Explicación de la búsqueda por foto: 3 pasos, consejos y privacidad (manual de marca: tarjetas radio 14/16). */
function ComoFuncionaFoto() {
  const { t } = useTranslation()
  const pasos = [
    { icono: ICONOS_COMPRADOR.buscarFoto, texto: t('search.photoStep1') },
    { icono: ICONOS_COMPRADOR.consultaDestello, texto: t('search.photoStep2') },
    { icono: ICONOS_COMPRADOR.navCategorias, texto: t('search.photoStep3') },
  ]
  const consejos = [t('search.photoTip1'), t('search.photoTip2'), t('search.photoTip3')]

  return (
    <aside className="flex flex-col gap-3 bg-transparent px-4 pb-8 lg:px-0 lg:pb-0" aria-labelledby="foto-como-funciona">
      <section className="flex flex-col gap-3 rounded-[16px] border border-hc-n-200 bg-hc-n-0 p-4">
        <h2 id="foto-como-funciona" className="font-display text-[15px] font-bold text-hc-n-900">{t('search.photoStepsTitle')}</h2>
        <ol className="m-0 grid list-none grid-cols-3 gap-2 p-0 lg:grid-cols-1 lg:gap-3">
          {pasos.map((p, i) => (
            <li key={p.texto} className="flex flex-col items-center gap-2 text-center lg:flex-row lg:text-left">
              <span className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-hc-blue-50 text-hc-blue-600">
                <IconoFigma src={p.icono} size={20} />
                <span aria-hidden="true" className="absolute -right-1 -top-1 flex size-[18px] items-center justify-center rounded-full bg-hc-blue-600 text-[10px] font-bold text-hc-n-0">
                  {i + 1}
                </span>
              </span>
              <span className="text-[12px] font-medium leading-[16px] text-hc-n-900 lg:text-[13px] lg:leading-[18px]">{p.texto}</span>
            </li>
          ))}
        </ol>
      </section>

      <section className="flex flex-col gap-[10px] rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-4" aria-labelledby="foto-consejos">
        <h2 id="foto-consejos" className="text-[13px] font-semibold text-hc-n-900">{t('search.photoTipsTitle')}</h2>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {consejos.map((c) => (
            <li key={c} className="flex items-start gap-2 text-[13px] leading-[18px] text-hc-n-600">
              <IconoFigma src={ICONOS_COMPRADOR.codigoCheck} size={16} className="mt-[1px] text-hc-success" />
              {c}
            </li>
          ))}
        </ul>
      </section>

      <p className="flex items-start gap-2 px-1 text-[12px] leading-[17px] text-hc-n-600">
        <IconoFigma src={ICONOS_COMPRADOR.compraSeguraCandado} size={14} className="mt-[1px] text-hc-n-500" />
        {t('search.photoPrivacy')}
      </p>
    </aside>
  )
}
