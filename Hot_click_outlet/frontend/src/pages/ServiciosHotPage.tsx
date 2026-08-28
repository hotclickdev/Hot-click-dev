import { useState, useRef, type ChangeEvent, type FormEvent } from 'react'
import { AnimatePresence } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import useAuthStore from '@/store/authStore'
import { servicioService } from '@/services/servicioService'
import { garantiaService } from '@/services/garantiaService'
import { testimonioService } from '@/services/testimonioService'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import ServiciosInicio, { ServiciosHero } from './servicios/ServiciosInicio'
import VistaBusqueda from './servicios/VistaBusqueda'
import VistaGarantia from './servicios/VistaGarantia'
import VistaTestimonio from './servicios/VistaTestimonio'
import {
  SITE_URL, serviciosJsonLd, FOTO_MAX_BYTES, MAX_FOTOS,
  type FormBusqueda, type FotoSolicitud, type GarantiaItem, type ProductoParaResena,
  type TabBusqueda, type VistaServicios,
} from './servicios/serviciosHelpers'

function extraerLista<T>(data: unknown): T[] {
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

export default function ServiciosHotPage() {
  const { t } = useTranslation()
  const { token } = useAuthStore()
  const qc = useQueryClient()
  const contenidoRef = useRef<HTMLDivElement>(null)

  const [vista, setVista] = useState<VistaServicios>('inicio')
  const [tabBusqueda, setTabBusqueda] = useState<TabBusqueda>('solicitar')

  const [fotos, setFotos] = useState<FotoSolicitud[]>([])
  const [uploading, setUploading] = useState(false)
  const [sending, setSending] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)
  const [phone, setPhone] = useState('')
  const [form, setForm] = useState<FormBusqueda>({ descripcion: '', presupuesto: '', nombreContacto: '' })

  const { data: misSolicitudes, isLoading: loadingMias, refetch: refetchMias } = useQuery({
    queryKey: ['mis-solicitudes-servicio'],
    queryFn: () => servicioService.misSolicitudes().then(r => r.data),
    enabled: !!token && vista === 'busqueda' && tabBusqueda === 'mis-solicitudes',
    refetchInterval: 30000,
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

  const irA = (destino: VistaServicios) => {
    setVista(destino)
    setError('')
    setTimeout(() => contenidoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
  }

  const volver = () => {
    setVista('inicio')
    setSuccess(false)
    setTimeout(() => contenidoRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 60)
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
      await servicioService.crear({
        ...form, telefonoContacto: phone,
        fotosUrls: fotos.length ? JSON.stringify(fotos.map(f => f.url)) : null,
      })
      setSuccess(true)
      setForm({ descripcion: '', presupuesto: '', nombreContacto: '' })
      setPhone(''); setFotos([])
    } catch { setError(t('serviciosPage.sendErrorFull')) }
    finally { setSending(false) }
  }

  return (
    <MainLayout>
      <Helmet>
        <title>Servicios HotClick — Búsqueda de productos y garantías en Costa Rica</title>
        <meta name="description" content="Solicitá búsqueda de cualquier producto o gestioná la garantía de tu compra. Servicios gratuitos para clientes de HotClick en Costa Rica." />
        <link rel="canonical" href={`${SITE_URL}/servicios`} />
        <link rel="alternate" hrefLang="es-CR" href={`${SITE_URL}/servicios`} />
        <link rel="alternate" hrefLang="es"    href={`${SITE_URL}/servicios`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Servicios HotClick — Búsqueda y garantías en Costa Rica" />
        <meta property="og:description" content="Te buscamos el producto que necesitás y gestionamos garantías. Gratis para todos los clientes de HotClick." />
        <meta property="og:url" content={`${SITE_URL}/servicios`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="es_CR" />
        <meta property="og:site_name" content="HotClick" />
        <script type="application/ld+json">{JSON.stringify(serviciosJsonLd)}</script>
      </Helmet>

      <ServiciosHero />

      <div ref={contenidoRef} className="px-4 pb-8 max-w-2xl mx-auto">
        <AnimatePresence mode="wait">
          {vista === 'inicio' && <ServiciosInicio irA={irA} />}
          {vista === 'busqueda' && (
            <VistaBusqueda
              token={token}
              tabBusqueda={tabBusqueda}
              setTabBusqueda={setTabBusqueda}
              success={success}
              setSuccess={setSuccess}
              form={form}
              setForm={setForm}
              phone={phone}
              setPhone={setPhone}
              fotos={fotos}
              setFotos={setFotos}
              uploading={uploading}
              sending={sending}
              error={error}
              fileRef={fileRef}
              handleEnviar={handleEnviar}
              handleFotoChange={handleFotoChange}
              volver={volver}
              misSolicitudes={misSolicitudes}
              loadingMias={loadingMias}
              refetchMias={refetchMias}
            />
          )}
          {vista === 'garantia' && (
            <VistaGarantia
              token={token}
              volver={volver}
              misGarantias={misGarantias}
              loadingGarantias={loadingGarantias}
              onReportado={() => qc.invalidateQueries({ queryKey: ['mis-garantias-solicitudes'] })}
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
        </AnimatePresence>
      </div>
    </MainLayout>
  )
}
