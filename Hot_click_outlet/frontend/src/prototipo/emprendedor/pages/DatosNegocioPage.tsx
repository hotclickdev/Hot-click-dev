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
import CabeceraAtras from '../ui/CabeceraAtras'
import CampoTexto from '../ui/CampoTexto'
import { RUTA_EMPRENDEDOR } from '../constants'
import { leerExtrasLocal, limpiarExtrasLocal } from '../data/negocioExtras'
import FormularioPorPasos from '@/prototipo/compartido/FormularioPorPasos'
import type { PasoFormulario } from '@/prototipo/compartido/formularioPorPasosHelpers'

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
  categoria: '',
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
 * Datos de tu negocio (wizard). Persiste nombre, descripción, WhatsApp,
 * categoría, Instagram y zona vía API de perfil empresa.
 */
export default function DatosNegocioPage() {
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
      navigate(`${RUTA_EMPRENDEDOR}/opciones`)
    } catch {
      toast({ message: 'No se pudieron guardar los datos', type: 'error' })
    } finally {
      setGuardando(false)
    }
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
              <CampoTexto etiqueta="Nombre del negocio" value={form.nombre} onChange={setCampo('nombre')} />
              <CampoTexto etiqueta="Categoría principal" value={form.categoria} onChange={setCampo('categoria')} />
            </>
          ) : null}
          {idPaso === 'contacto' ? (
            <>
              <CampoTexto
                etiqueta="WhatsApp de contacto"
                value={form.whatsapp}
                onChange={setCampo('whatsapp')}
                type="tel"
              />
              <CampoTexto etiqueta="Instagram (opcional)" value={form.instagram} onChange={setCampo('instagram')} />
            </>
          ) : null}
          {idPaso === 'publico' ? (
            <>
              <CampoTexto etiqueta="Descripción corta" value={form.descripcion} onChange={setCampo('descripcion')} />
              <CampoTexto etiqueta="Zona de envío" value={form.zona} onChange={setCampo('zona')} />
            </>
          ) : null}
        </FormularioPorPasos>
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
