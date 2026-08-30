import { useState, useEffect, useRef, useCallback, useMemo, type FormEvent } from 'react'
import { empresaService } from '@/services/empresaService'
import useAuthStore from '@/store/authStore'
import { useToast } from '@/components/ui/Toast'
import EmpresaHeader from './mi-empresa/EmpresaHeader'
import VisibilidadCard from './mi-empresa/VisibilidadCard'
import PerfilForm from './mi-empresa/PerfilForm'
import {
  MAX_FOTOS,
  CAMPOS_DIRTY,
  FORMULARIO_VACIO,
  unwrapEmpresa,
  formularioDesdeEmpresa,
  fotosDesdeDescripcion,
  descripcionSinTagFotos,
  validarPerfil,
  mensajeErrorEmpresa,
  type EmpresaPerfil,
  type ErroresPerfil,
  type FormularioEmpresa,
} from './mi-empresa/miEmpresaHelpers'

export default function AdminMiEmpresa() {
  const toast = useToast()
  const userRole = useAuthStore(s => s.userRole)
  const [empresa, setEmpresa] = useState<EmpresaPerfil | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const savedFormRef = useRef<FormularioEmpresa | null>(null)
  const [form, setForm] = useState<FormularioEmpresa>(FORMULARIO_VACIO)
  const [fotos, setFotos] = useState<string[]>([])
  const [uploadingFoto, setUploadingFoto] = useState(false)
  // logoUrl se maneja separado del PUT — se actualiza via POST /logo directamente
  const [errors, setErrors] = useState<ErroresPerfil>({})

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/exhaustive-deps -- montaje único

  async function cargar() {
    try {
      setLoading(true)
      const { data } = await empresaService.getPerfil()
      // El interceptor de Axios ya hace unwrap de ResponseDTO → data ES la empresa directamente
      const e = unwrapEmpresa(data)
      if (!e?.id) { toast({ message: 'No se encontró el negocio', type: 'error' }); return }
      setEmpresa(e)
      const initialForm = formularioDesdeEmpresa(e)
      setForm(initialForm)
      savedFormRef.current = initialForm
      setFotos(fotosDesdeDescripcion(e.descripcion ?? ''))
    } catch {
      toast({ message: 'Error al cargar perfil del negocio', type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  const handleLogoFile = useCallback(async (file?: File) => {
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await empresaService.uploadLogo(fd)
      const url = (data as { data?: string })?.data ?? (data as string)
      setForm(s => ({ ...s, logoUrl: url }))
      toast({ message: 'Logo subido correctamente', type: 'success' })
    } catch (err: unknown) {
      toast({ message: mensajeErrorEmpresa(err, 'Error al subir el logo'), type: 'error' })
    } finally {
      setUploading(false)
    }
  }, [toast])

  async function guardar(ev: FormEvent) {
    ev.preventDefault()
    const errs = validarPerfil(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      // Serializar fotos dentro de la descripción
      const fotosTag = fotos.length
        ? `\n[FOTOS]${JSON.stringify(fotos)}[/FOTOS]`
        : ''
      const descClean = descripcionSinTagFotos(form.descripcion)
      await empresaService.updatePerfil({
        nombreComercial: form.nombreComercial.trim(),
        descripcion:     descClean + fotosTag,
        telefonoEmpresa: form.telefonoEmpresa.trim(),
        correoEmpresa:   form.correoEmpresa.trim(),
        numeroWhatsapp:  form.numeroWhatsapp.trim(),
        colorPrimario:   form.colorPrimario,
        colorSecundario: form.colorSecundario,
      })
      savedFormRef.current = { ...form }
      toast({ message: 'Perfil del negocio actualizado', type: 'success' })
      cargar()
    } catch {
      toast({ message: 'Error al guardar cambios', type: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleFotoFile = useCallback(async (file?: File) => {
    if (!file) return
    if (fotos.length >= MAX_FOTOS) { toast({ message: `Máximo ${MAX_FOTOS} fotos permitidas`, type: 'error' }); return }
    setUploadingFoto(true)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = await empresaService.uploadLogo(fd)
      const url = (data as { data?: string })?.data ?? (data as string)
      const nuevasFotos = [...fotos, url]
      setFotos(nuevasFotos)

      // Auto-guardar la descripción con las nuevas fotos
      const descClean = descripcionSinTagFotos(form.descripcion)
      await empresaService.updatePerfil({
        nombreComercial: form.nombreComercial || empresa?.nombreComercial || '',
        descripcion: descClean + `\n[FOTOS]${JSON.stringify(nuevasFotos)}[/FOTOS]`,
        telefonoEmpresa: form.telefonoEmpresa,
        correoEmpresa:   form.correoEmpresa,
        numeroWhatsapp:  form.numeroWhatsapp,
        colorPrimario:   form.colorPrimario,
        colorSecundario: form.colorSecundario,
      })
      toast({ message: 'Foto agregada y guardada', type: 'success' })
    } catch {
      toast({ message: 'Error al subir la foto', type: 'error' })
    } finally {
      setUploadingFoto(false)
    }
  }, [fotos, form, empresa, toast])

  async function eliminarFoto(i: number) {
    const nuevasFotos = fotos.filter((_, j) => j !== i)
    setFotos(nuevasFotos)
    const descClean = descripcionSinTagFotos(form.descripcion)
    try {
      await empresaService.updatePerfil({
        nombreComercial: form.nombreComercial || empresa?.nombreComercial || '',
        descripcion: descClean + (nuevasFotos.length ? `\n[FOTOS]${JSON.stringify(nuevasFotos)}[/FOTOS]` : ''),
        telefonoEmpresa: form.telefonoEmpresa, correoEmpresa: form.correoEmpresa,
        numeroWhatsapp: form.numeroWhatsapp, colorPrimario: form.colorPrimario, colorSecundario: form.colorSecundario,
      })
      toast({ message: 'Foto eliminada', type: 'success' })
    } catch { toast({ message: 'Error al eliminar foto', type: 'error' }) }
  }

  async function cambiarVisibilidad(val: boolean) {
    try {
      const { data } = await empresaService.setVisibilidad(val)
      const updated = unwrapEmpresa(data)
      setEmpresa(e => ({ ...e!, visibilidadPublica: val }))
      toast({ message: val ? 'Negocio visible al público' : 'Negocio en modo invisible', type: 'success' })
      // Refrescar el estado global del layout
      if (updated) setEmpresa(e => ({ ...e!, ...updated }))
    } catch (err: unknown) {
      toast({ message: mensajeErrorEmpresa(err, 'Error al cambiar visibilidad'), type: 'error' })
    }
  }

  const isDirty = useMemo(() => {
    if (!savedFormRef.current) return false
    const saved = savedFormRef.current
    return CAMPOS_DIRTY.some(k => form[k] !== saved[k])
  }, [form])

  // Bloquear recarga de página con cambios sin guardar
  useEffect(() => {
    if (!isDirty) return
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = '' }
    globalThis.addEventListener('beforeunload', handler)
    return () => globalThis.removeEventListener('beforeunload', handler)
  }, [isDirty])

  const canEdit = userRole === 'EMPRENDEDOR' || userRole === 'ADMIN'

  if (loading) {
    return (
      <>
        <div className="py-20 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>Cargando…</div>
      </>
    )
  }

  if (!empresa) {
    return (
      <>
        <div className="py-20 text-center text-sm" style={{ color: 'var(--hc-muted)' }}>No se encontró el negocio asociado a tu cuenta.</div>
      </>
    )
  }

  return (
    <>
      <div className="max-w-2xl space-y-6">
        <EmpresaHeader empresa={empresa} isDirty={isDirty} canEdit={canEdit} form={form} />
        {empresa.estadoEmpresa === 'ACTIVO' && (
          <VisibilidadCard
            visible={empresa.visibilidadPublica !== false}
            onChange={cambiarVisibilidad}
          />
        )}
        <PerfilForm
          form={form}
          setForm={setForm}
          errors={errors}
          canEdit={canEdit}
          saving={saving}
          onSubmit={guardar}
          logo={{
            uploading,
            onFile: handleLogoFile,
            onQuitar: () => setForm(s => ({ ...s, logoUrl: '' })),
          }}
          gallery={{
            fotos,
            uploadingFoto,
            onFile: handleFotoFile,
            onEliminar: eliminarFoto,
          }}
        />
      </div>
    </>
  )
}
