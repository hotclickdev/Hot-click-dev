import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import { empresaService } from '@/services/empresaService'
import {
  descripcionSinTagFotos,
  descripcionVisible,
  fotosDesdeDescripcion,
  unwrapEmpresa,
} from '@/pages/admin/mi-empresa/miEmpresaHelpers'
import BotonPrimario from '../ui/BotonPrimario'
import CabeceraAtras from '../ui/CabeceraAtras'
import CampoTexto from '../ui/CampoTexto'
import { CUENTA_DEMO, RUTA_EMPRENDEDOR } from '../constants'
import { leerExtrasNegocio, guardarExtrasNegocio } from '../data/negocioExtras'

type FormNegocio = {
  nombre: string
  descripcion: string
  categoria: string
  whatsapp: string
  instagram: string
  zona: string
}

const FORM_INICIAL: FormNegocio = {
  nombre: CUENTA_DEMO.tienda,
  descripcion: 'Tecnología y accesorios con envío a todo el país',
  categoria: 'Tecnología',
  whatsapp: CUENTA_DEMO.telefono,
  instagram: CUENTA_DEMO.instagram,
  zona: 'Todo Costa Rica',
}

/**
 * Datos de tu negocio (Figma 136:128 / 352:12071).
 * Persiste nombre/descripcion/WhatsApp en API; categoría/IG/zona en local.
 */
export default function DatosNegocioPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const [form, setForm] = useState<FormNegocio>(FORM_INICIAL)
  const [descRaw, setDescRaw] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    void cargarPerfil(setForm, setDescRaw, setCargando, toast)
  }, [toast])

  async function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    if (!form.nombre.trim()) {
      toast({ message: 'El nombre del negocio es requerido', type: 'error' })
      return
    }
    setGuardando(true)
    try {
      await empresaService.updatePerfil({
        nombreComercial: form.nombre.trim(),
        descripcion: armarDescripcion(form.descripcion, descRaw),
        numeroWhatsapp: form.whatsapp.trim(),
      })
      guardarExtrasNegocio({
        categoria: form.categoria.trim(),
        instagram: form.instagram.trim(),
        zona: form.zona.trim(),
      })
      toast({ message: 'Datos del negocio guardados', type: 'success' })
      navigate(`${RUTA_EMPRENDEDOR}/opciones`)
    } catch {
      toast({ message: 'No se pudieron guardar los datos', type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  function setCampo(campo: keyof FormNegocio) {
    return (valor: string) => setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  return (
    <main className="flex flex-col gap-5 px-5 pb-10 pt-8 md:max-w-[760px] md:gap-6 md:px-16 md:py-12">
      <div className="md:hidden">
        <CabeceraAtras titulo="Datos de tu Negocio" to={`${RUTA_EMPRENDEDOR}/opciones`} />
      </div>
      <header className="hidden md:block">
        <h1 className="font-display text-[28px] font-bold">Datos de tu Negocio</h1>
      </header>
      <p className="text-[11px] text-hc-muted md:hidden">
        Esta información es la que ven los compradores en tu perfil público. Mantenela actualizada.
      </p>
      {cargando ? <p className="text-sm text-hc-muted">Cargando datos…</p> : null}
      {!cargando ? (
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <div className="flex flex-col gap-4 rounded-xl border border-hc-border bg-hc-surface p-4 md:p-6">
            <CampoTexto etiqueta="Nombre del negocio" value={form.nombre} onChange={setCampo('nombre')} />
            <CampoTexto etiqueta="Descripción corta" value={form.descripcion} onChange={setCampo('descripcion')} />
            <CampoTexto etiqueta="Categoría principal" value={form.categoria} onChange={setCampo('categoria')} />
            <CampoTexto
              etiqueta="WhatsApp de contacto"
              value={form.whatsapp}
              onChange={setCampo('whatsapp')}
              type="tel"
            />
            <CampoTexto etiqueta="Instagram (opcional)" value={form.instagram} onChange={setCampo('instagram')} />
            <CampoTexto etiqueta="Zona de envío" value={form.zona} onChange={setCampo('zona')} />
          </div>
          <BotonPrimario type="submit">{guardando ? 'Guardando…' : 'Guardar datos'}</BotonPrimario>
        </form>
      ) : null}
    </main>
  )
}

function armarDescripcion(visible: string, rawAnterior: string): string {
  const fotos = fotosDesdeDescripcion(rawAnterior)
  const limpia = descripcionSinTagFotos(visible)
  if (fotos.length === 0) return limpia
  return `${limpia}\n[FOTOS]${JSON.stringify(fotos)}[/FOTOS]`
}

async function cargarPerfil(
  setForm: (f: FormNegocio) => void,
  setDescRaw: (v: string) => void,
  setCargando: (v: boolean) => void,
  toast: ReturnType<typeof useToast>,
) {
  const extras = leerExtrasNegocio()
  try {
    const { data } = await empresaService.getPerfil()
    const empresa = unwrapEmpresa(data)
    if (!empresa?.id) {
      setForm({ ...FORM_INICIAL, ...mergeExtras(extras) })
      return
    }
    setDescRaw(empresa.descripcion ?? '')
    setForm({
      nombre: empresa.nombreComercial ?? FORM_INICIAL.nombre,
      descripcion: descripcionVisible(empresa.descripcion) || FORM_INICIAL.descripcion,
      categoria: extras.categoria || FORM_INICIAL.categoria,
      whatsapp: empresa.numeroWhatsapp || FORM_INICIAL.whatsapp,
      instagram: extras.instagram || FORM_INICIAL.instagram,
      zona: extras.zona || FORM_INICIAL.zona,
    })
  } catch {
    setForm({ ...FORM_INICIAL, ...mergeExtras(extras) })
    toast({ message: 'Usando datos locales: no se pudo cargar el perfil', type: 'error' })
  } finally {
    setCargando(false)
  }
}

function mergeExtras(extras: ReturnType<typeof leerExtrasNegocio>): Partial<FormNegocio> {
  return {
    categoria: extras.categoria || undefined,
    instagram: extras.instagram || undefined,
    zona: extras.zona || undefined,
  }
}
