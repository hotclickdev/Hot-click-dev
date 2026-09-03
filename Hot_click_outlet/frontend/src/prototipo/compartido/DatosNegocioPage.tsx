import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import { empresaService } from '@/services/empresaService'
import {
  descripcionSinTagFotos,
  descripcionVisible,
  fotosDesdeDescripcion,
  unwrapEmpresa,
  type EmpresaPerfil,
} from '@/pages/admin/mi-empresa/miEmpresaHelpers'
import { leerExtrasLocal, limpiarExtrasLocal } from '@/prototipo/emprendedor/data/negocioExtras'
import FormularioPorPasos from './FormularioPorPasos'
import type { PasoFormulario } from './formularioPorPasosHelpers'
import { Campo, Chip, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import iconCamara from './assets/icon-camara.svg'

const CATEGORIAS = ['Tecnología', 'Ropa', 'Hogar'] as const

type FormNegocio = {
  nombre: string
  descripcion: string
  categoria: string
  whatsapp: string
  instagram: string
  zona: string
}

const FORM_INICIAL: FormNegocio = {
  nombre: '',
  descripcion: '',
  categoria: CATEGORIAS[0],
  whatsapp: '',
  instagram: '',
  zona: '',
}

const PASOS: readonly PasoFormulario[] = [
  { id: 'identidad', titulo: 'Identidad del negocio' },
  { id: 'contacto', titulo: 'Contacto' },
  { id: 'publico', titulo: 'Cómo te ven los compradores' },
]

/**
 * Datos públicos del negocio (Figma 136:408) — wizard con persistencia en API.
 */
export default function DatosNegocioPage() {
  const ruta = useSellerRuta()
  const navigate = useNavigate()
  const toast = useToast()
  const [paso, setPaso] = useState(0)
  const [form, setForm] = useState<FormNegocio>(FORM_INICIAL)
  const [descRaw, setDescRaw] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const idPaso = PASOS[paso]?.id

  useEffect(() => {
    void cargarPerfil(setForm, setDescRaw, setCargando, toast)
  }, [toast])

  function setCampo(campo: keyof FormNegocio) {
    return (valor: string) => setForm((prev) => ({ ...prev, [campo]: valor }))
  }

  function validar(i: number): string | null {
    const id = PASOS[i]?.id
    if (id === 'identidad' && !form.nombre.trim()) return 'El nombre del negocio es requerido'
    return null
  }

  async function guardar() {
    setGuardando(true)
    try {
      await empresaService.updatePerfil({
        nombreComercial: form.nombre.trim(),
        descripcion: armarDescripcion(form.descripcion, descRaw),
        numeroWhatsapp: form.whatsapp.trim(),
        categoriaNegocio: form.categoria.trim(),
        instagram: form.instagram.trim(),
        zonaEnvio: form.zona.trim(),
      })
      limpiarExtrasLocal()
      toast({ message: 'Datos del negocio guardados', type: 'success' })
      navigate(ruta('opciones'))
    } catch {
      toast({ message: 'No se pudieron guardar los datos', type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <main className="px-5 pb-8 pt-[60px] md:max-w-[760px] md:px-12 md:py-12 md:pt-12">
      <EncabezadoPagina titulo="Datos de tu Negocio" volverA={ruta('opciones')} />
      <p className="mb-4 text-sm text-hc-muted">
        Esta información es la que ven los compradores en tu perfil público. Mantenela actualizada.
      </p>
      {cargando ? <p className="text-sm text-hc-muted">Cargando datos…</p> : null}
      {!cargando ? (
        <FormularioPorPasos
          pasos={PASOS}
          pasoActual={paso}
          onPasoChange={setPaso}
          validarPaso={validar}
          onFinalizar={guardar}
          etiquetaFinal="Guardar datos"
          enviando={guardando}
        >
          {idPaso === 'identidad' ? (
            <>
              <Campo etiqueta="Nombre del negocio" value={form.nombre} onChange={setCampo('nombre')} />
              <p className="mb-2 text-xs font-medium text-hc-muted">Categoría principal</p>
              <div className="mb-4 flex flex-wrap gap-2">
                {CATEGORIAS.map((item) => (
                  <Chip
                    key={item}
                    activo={form.categoria === item}
                    onClick={() => setCampo('categoria')(item)}
                  >
                    {item}
                  </Chip>
                ))}
              </div>
              <Archivo etiqueta="Logo del negocio" nombre="logo-qa2.png" />
              <Archivo etiqueta="Banner de portada" nombre="banner-qa2.jpg" />
            </>
          ) : null}
          {idPaso === 'contacto' ? (
            <>
              <Campo
                etiqueta="WhatsApp de contacto"
                value={form.whatsapp}
                onChange={setCampo('whatsapp')}
                type="tel"
              />
              <Campo
                etiqueta="Instagram (opcional)"
                value={form.instagram}
                onChange={setCampo('instagram')}
              />
            </>
          ) : null}
          {idPaso === 'publico' ? (
            <>
              <Campo
                etiqueta="Descripción corta"
                value={form.descripcion}
                onChange={setCampo('descripcion')}
              />
              <Campo etiqueta="Zona de envío" value={form.zona} onChange={setCampo('zona')} />
            </>
          ) : null}
        </FormularioPorPasos>
      ) : null}
    </main>
  )
}

function Archivo({ etiqueta, nombre }: { etiqueta: string; nombre: string }) {
  return (
    <div className="mb-4">
      <p className="mb-2 text-xs font-medium text-hc-muted">{etiqueta}</p>
      <div className="flex min-h-12 items-center gap-3 rounded-xl bg-hc-surface-2 px-3.5 text-sm">
        <span className="relative block size-[20px] overflow-clip">
          <img src={iconCamara} alt="" width={20} height={20} className="size-full" />
        </span>
        {nombre}
      </div>
    </div>
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
  try {
    const { data } = await empresaService.getPerfil()
    const empresa = unwrapEmpresa(data)
    if (!empresa?.id) {
      setForm({ ...FORM_INICIAL, ...extrasDesdeApiOLocal(null) })
      return
    }
    setDescRaw(empresa.descripcion ?? '')
    setForm(formDesdeEmpresa(empresa))
  } catch {
    setForm({ ...FORM_INICIAL, ...extrasDesdeApiOLocal(null) })
    toast({ message: 'No se pudo cargar el perfil del negocio', type: 'error' })
  } finally {
    setCargando(false)
  }
}

function formDesdeEmpresa(empresa: EmpresaPerfil): FormNegocio {
  const extras = extrasDesdeApiOLocal(empresa)
  return {
    nombre: empresa.nombreComercial ?? FORM_INICIAL.nombre,
    descripcion: descripcionVisible(empresa.descripcion) || FORM_INICIAL.descripcion,
    categoria: extras.categoria,
    whatsapp: empresa.numeroWhatsapp || FORM_INICIAL.whatsapp,
    instagram: extras.instagram,
    zona: extras.zona,
  }
}

/** Prefiere API; si vacío, usa localStorage legacy como seed temporal. */
function extrasDesdeApiOLocal(empresa: EmpresaPerfil | null): Pick<FormNegocio, 'categoria' | 'instagram' | 'zona'> {
  const apiCategoria = empresa?.categoriaNegocio?.trim() ?? ''
  const apiInstagram = empresa?.instagram?.trim() ?? ''
  const apiZona = empresa?.zonaEnvio?.trim() ?? ''
  if (apiCategoria || apiInstagram || apiZona) {
    return {
      categoria: apiCategoria || FORM_INICIAL.categoria,
      instagram: apiInstagram || FORM_INICIAL.instagram,
      zona: apiZona || FORM_INICIAL.zona,
    }
  }
  const local = leerExtrasLocal()
  return {
    categoria: local.categoria || FORM_INICIAL.categoria,
    instagram: local.instagram || FORM_INICIAL.instagram,
    zona: local.zona || FORM_INICIAL.zona,
  }
}
