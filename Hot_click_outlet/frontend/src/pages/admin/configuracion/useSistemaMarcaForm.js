import { useEffect, useState } from 'react'
import { empresaService } from '@/services/empresaService'
import { useToast } from '@/components/ui/Toast'
import { unwrapEmpresa } from '@/pages/admin/mi-empresa/miEmpresaHelpers'
import { cuerpoMarca, marcaDesdeEmpresa, MARCA_VACIA, validarMarca } from './sistemaMarcaHelpers'

/** Carga y guarda la marca pública en el perfil de empresa. */
export function useSistemaMarcaForm() {
  const toast = useToast()
  const [form, setForm] = useState(MARCA_VACIA)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [errors, setErrors] = useState({})

  async function cargar() {
    setLoading(true)
    setLoadError(false)
    try {
      const { data } = await empresaService.getPerfil()
      const empresa = unwrapEmpresa(data)
      if (!empresa?.id) throw new Error('sin empresa')
      setForm(marcaDesdeEmpresa(empresa))
    } catch (err) {
      console.error('[SistemaMarcaForm] perfil', err)
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { cargar() }, [])

  async function guardar(ev) {
    ev.preventDefault()
    const errs = validarMarca(form)
    if (Object.keys(errs).length) { setErrors(errs); return }
    setErrors({})
    setSaving(true)
    try {
      await empresaService.updatePerfil(cuerpoMarca(form))
      toast({ message: 'Así te ven en tu tienda', type: 'success' })
    } catch (err) {
      console.error('[SistemaMarcaForm] guardar', err)
      toast({
        message: err?.response?.data?.message ?? 'No se pudo guardar la marca',
        type: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  async function onLogoFile(file) {
    if (!file) return
    setUploading(true)
    try {
      const url = await subirLogo(file)
      setForm((s) => ({ ...s, logoUrl: url }))
      toast({ message: 'Logo subido', type: 'success' })
    } catch (err) {
      console.error('[SistemaMarcaForm] logo', err)
      toast({
        message: err?.response?.data?.message ?? 'No se pudo subir el logo',
        type: 'error',
      })
    } finally {
      setUploading(false)
    }
  }

  function onQuitarLogo() {
    setForm((s) => ({ ...s, logoUrl: '' }))
  }

  return {
    form, setForm, loading, loadError, saving, uploading, errors,
    cargar, guardar, onLogoFile, onQuitarLogo,
  }
}

async function subirLogo(file) {
  const fd = new FormData()
  fd.append('file', file)
  const { data } = await empresaService.uploadLogo(fd)
  const url = typeof data === 'string' ? data : (data?.data ?? data)
  if (typeof url !== 'string' || !url) throw new Error('sin url')
  return url
}
