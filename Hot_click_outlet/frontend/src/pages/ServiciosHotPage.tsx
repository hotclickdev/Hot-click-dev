import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import useAuthStore from '@/store/authStore'
import { servicioService } from '@/services/servicioService'
import { garantiaService } from '@/services/garantiaService'
import { testimonioService } from '@/services/testimonioService'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useTurnstileForm } from '@/hooks/useTurnstileForm'
import { mensajeErrorApi } from '@/utils/mensajeErrorApi'
import ServiciosInicio from './servicios/ServiciosInicio'
import FormularioBusqueda from './servicios/FormularioBusqueda'
import VistaGarantia from './servicios/VistaGarantia'
import VistaTestimonio from './servicios/VistaTestimonio'
import VistaDigitalizacion from './servicios/VistaDigitalizacion'
import MisSolicitudesVista from './solicitudes/MisSolicitudesVista'
import { estadoVisual } from './solicitudes/solicitudesHelpers'
import {
  SITE_URL, serviciosJsonLd, FOTO_MAX_BYTES, MAX_FOTOS, PREFIJO_SOLICITUD_INVENTARIO, normalizarTelefono,
  type FormBusqueda, type FotoSolicitud, type GarantiaItem, type ProductoParaResena,
  type SolicitudBusqueda, type VistaServicios,
  metaDeRutaServicio,
  faqDeRutaServicio,
} from './servicios/serviciosHelpers'

function vistaDeRuta(pathname: string): VistaServicios | null {
  if (pathname.startsWith('/servicios/buscar-producto')) return 'busqueda'
  if (pathname.startsWith('/servicios/digitalizar-inventario')) return 'inventario'
  return null
}

/** El interceptor de axios ya quita el sobre `{ success, data }`: la lista llega directa o, sin sobre, dentro de `data`. */
function extraerLista<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && 'data' in data) {
    const inner = (data as { data: unknown }).data
    if (Array.isArray(inner)) return inner as T[]
  }
  return []
}

function urlFotoSubida(data: unknown): unknown {
  if (data && typeof data === 'object' && 'url' in data) return (data as { url: unknown }).url
  return data
}

/** Título de la barra interna de cada vista (Figma `28:1429`, `28:1486`, `28:1531`). */
const TITULO_VISTA: Record<VistaServicios, string> = {
  inicio: 'Servicios HOT',
  busqueda: 'Te lo conseguimos',
  garantia: 'Garantía',
  testimonio: 'Contanos tu experiencia',
  inventario: 'Digitalizá tu inventario',
}

/** En escritorio la barra interna no se dibuja y estas vistas no repiten el título (P06): el h1 queda para lectores de pantalla. */
const VISTAS_H1_OCULTO_ESCRITORIO: ReadonlySet<VistaServicios> = new Set(['busqueda', 'garantia'])

function ServiciosHotVistas({ vistaInicial }: { vistaInicial: VistaServicios }) {
  const { t } = useTranslation()
  const { token } = useAuthStore()
  const qc = useQueryClient()
  const location = useLocation()
  const navigate = useNavigate()
  const [vista, setVista] = useState<VistaServicios>(vistaInicial)

  const [fotos, setFotos] = useState<FotoSolicitud[]>([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [phone, setPhone] = useState('')
  const [form, setForm] = useState<FormBusqueda>({ descripcion: '', presupuesto: '', nombreContacto: '' })
  const {
    turnstileRef, turnstileToken, setTurnstileToken,
    resetTurnstile, turnstileSiteKey, turnstileBloqueaSubmit,
  } = useTurnstileForm()

  const { data: misSolicitudes } = useQuery({
    queryKey: ['mis-solicitudes-servicio'],
    queryFn: () => servicioService.misSolicitudes().then(r => r.data),
    enabled: !!token && vista === 'inicio',
    refetchOnWindowFocus: true,
  })

  const { data: misGarantias, isLoading: loadingGarantias } = useQuery({
    queryKey: ['mis-garantias'],
    queryFn: () => garantiaService.misGarantias().then(r => extraerLista<GarantiaItem>(r.data)),
    enabled: !!token && vista === 'garantia',
    refetchOnWindowFocus: true,
  })

  const { data: productosResenar, isLoading: loadingResenar, refetch: refetchResenar } = useQuery({
    queryKey: ['productos-para-resenar'],
    queryFn: () => testimonioService.getProductosParaResenar().then(r => extraerLista<ProductoParaResena>(r.data)),
    enabled: !!token && vista === 'testimonio',
    refetchOnWindowFocus: true,
  })

  const solicitudesEnCurso = Array.isArray(misSolicitudes)
    ? (misSolicitudes as SolicitudBusqueda[]).filter((s) => estadoVisual(s.estado) !== 'cerrada').length
    : 0

  const irA = (destino: VistaServicios) => {
    setError('')
    if (destino === 'busqueda') {
      navigate('/servicios/buscar-producto')
      return
    }
    if (destino === 'inventario') {
      navigate('/servicios/digitalizar-inventario')
      return
    }
    setVista(destino)
    window.scrollTo({ top: 0 })
  }

  const volver = () => {
    setSuccess(false)
    setVista('inicio')
    if (location.pathname !== '/servicios') navigate('/servicios')
    else window.scrollTo({ top: 0 })
  }

  const handleFotoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const lista = e.target.files
    if (!lista) return
    const files = Array.from(lista).slice(0, MAX_FOTOS - fotos.length)
    if (!files.length) return
    if (files.some(f => f.size > FOTO_MAX_BYTES)) { setError('Cada foto debe pesar menos de 5 MB.'); e.target.value = ''; return }
    setUploading(true); setError('')
    try {
      const nuevas = await Promise.all(files.map(async (file) => {
        const preview = URL.createObjectURL(file)
        const fd = new FormData(); fd.append('file', file)
        const res = await servicioService.subirFoto(fd)
        return { file, preview, url: urlFotoSubida(res.data) }
      }))
      setFotos(prev => [...prev, ...nuevas].slice(0, MAX_FOTOS))
    } catch { setError(t('serviciosPage.uploadErrorFull')) }
    finally { setUploading(false); e.target.value = '' }
  }

  const handleEnviar = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!form.descripcion.trim()) { setError(t('serviciosPage.errorDescRequired')); return }
    if (!phone || phone.replace(/\D/g, '').length < 7) { setError('Por favor ingresá un número de teléfono válido.'); return }
    setSending(true); setError('')
    try {
      const descripcion = vista === 'inventario'
        ? `${PREFIJO_SOLICITUD_INVENTARIO} ${form.descripcion.trim()}`
        : form.descripcion
      await servicioService.crear({
        ...form,
        descripcion,
        telefonoContacto: normalizarTelefono(phone),
        fotosUrls: fotos.length ? JSON.stringify(fotos.map(f => f.url)) : null,
        turnstileToken: turnstileToken || undefined,
      })
      setSuccess(true)
      setForm({ descripcion: '', presupuesto: '', nombreContacto: '' })
      setPhone(''); setFotos([])
      resetTurnstile()
      qc.invalidateQueries({ queryKey: ['mis-solicitudes-servicio'] })
    } catch (err: unknown) {
      setError(mensajeErrorApi(err, t('serviciosPage.sendErrorFull')))
      resetTurnstile()
    }
    finally { setSending(false) }
  }

  const meta = metaDeRutaServicio(location.pathname)
  const faq = faqDeRutaServicio(location.pathname)
  const propsFormulario = {
    token, success, setSuccess, form, setForm, phone, setPhone, fotos, setFotos,
    uploading, sending, error, fileRef, handleEnviar, handleFotoChange,
    turnstileSiteKey, turnstileRef, setTurnstileToken, turnstileBloqueaSubmit,
  }

  return (
    <MainLayout
      variante="interna"
      titulo={TITULO_VISTA[vista]}
      esTituloPrincipal={vista !== 'inicio'}
      atras={vista === 'inicio' ? '/' : volver}
    >
      <Helmet>
        <title>{meta.title}</title>
        <meta name="description" content={meta.description} />
        <link rel="canonical" href={`${SITE_URL}${meta.path}`} />
        <link rel="alternate" hrefLang="es-CR" href={`${SITE_URL}${meta.path}`} />
        <link rel="alternate" hrefLang="es" href={`${SITE_URL}${meta.path}`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content={meta.title} />
        <meta property="og:description" content={meta.description} />
        <meta property="og:url" content={`${SITE_URL}${meta.path}`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="es_CR" />
        <meta property="og:site_name" content="HotClick" />
        <script type="application/ld+json">{JSON.stringify(serviciosJsonLd)}</script>
        {faq && <script type="application/ld+json">{JSON.stringify(faq)}</script>}
      </Helmet>

      {VISTAS_H1_OCULTO_ESCRITORIO.has(vista) && <h1 className="sr-only max-lg:hidden">{TITULO_VISTA[vista]}</h1>}
      {vista === 'inicio' && <ServiciosInicio irA={irA} solicitudesEnCurso={solicitudesEnCurso} />}
      {vista === 'busqueda' && (
        <div className="lg:mx-auto lg:w-full lg:max-w-[560px]">
          <FormularioBusqueda {...propsFormulario} mostrarPasos />
        </div>
      )}
      {vista === 'garantia' && (
        <VistaGarantia
          token={token}
          volver={volver}
          misGarantias={misGarantias}
          loadingGarantias={loadingGarantias}
          onReportado={() => qc.invalidateQueries({ queryKey: ['mis-garantias'] })}
        />
      )}
      {vista === 'testimonio' && (
        <VistaTestimonio
          token={token}
          volver={volver}
          productosResenar={productosResenar}
          loadingResenar={loadingResenar}
          refetchResenar={refetchResenar}
        />
      )}
      {vista === 'inventario' && <VistaDigitalizacion {...propsFormulario} />}
    </MainLayout>
  )
}

const VISTAS_DIRECTAS: VistaServicios[] = ['busqueda', 'garantia', 'testimonio']

/**
 * `/servicios`. `?vista=solicitudes` abre "Mis solicitudes" (ACC, Figma `29:1535`); `?vista=busqueda|garantia|testimonio`
 * abre directo esa vista (enlaces desde Mi cuenta y Mis pedidos). `/servicios/buscar-producto` y
 * `/servicios/digitalizar-inventario` son las landings indexables de esos dos servicios.
 */
export default function ServiciosHotPage() {
  const [params] = useSearchParams()
  const { pathname } = useLocation()
  const vistaRuta = vistaDeRuta(pathname)
  if (!vistaRuta && params.get('vista') === 'solicitudes') return <MisSolicitudesVista />
  const inicial = vistaRuta ?? VISTAS_DIRECTAS.find((v) => v === params.get('vista')) ?? 'inicio'
  return <ServiciosHotVistas key={`${pathname}:${inicial}`} vistaInicial={inicial} />
}
