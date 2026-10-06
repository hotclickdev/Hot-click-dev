import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import {
  descripcionVisible,
  mensajeErrorEmpresa,
  unwrapEmpresa,
} from '@/pages/admin/mi-empresa/miEmpresaHelpers'
import { empresaService } from '@/services/empresaService'
import { armarDescripcion } from './datosNegocioHelpers'
import { urlSubida } from './vitrinaUrl'

export type Vitrina = {
  nombre: string
  tagline: string
  descripcion: string
  logoUrl: string
  portadaUrl: string
  descRaw: string
  inicial: string
}

type Imagen = 'logo' | 'portada'

/** Textos e imágenes de la vitrina que ve el comprador. */
export function useVitrinaEditable() {
  const toast = useToast()
  const [vitrina, setVitrina] = useState<Vitrina | null>(null)
  const [errorCarga, setErrorCarga] = useState('')
  const [subiendo, setSubiendo] = useState<Imagen | ''>('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    let vivo = true
    empresaService.getPerfil()
      .then(({ data }) => {
        if (!vivo) return
        const empresa = unwrapEmpresa(data)
        if (!empresa?.id) { setErrorCarga('No se encontró el negocio.'); return }
        setVitrina(vitrinaDesde(empresa.nombreComercial || empresa.nombreEmpresa || '', empresa))
      })
      .catch((err: unknown) => {
        console.error('[vitrina]', err)
        if (vivo) setErrorCarga('No se pudo cargar tu tienda.')
      })
    return () => { vivo = false }
  }, [])

  function cambiar(campo: 'nombre' | 'tagline' | 'descripcion', valor: string) {
    setVitrina((prev) => (prev ? { ...prev, [campo]: valor } : prev))
  }

  async function guardarTextos() {
    if (!vitrina) return
    if (!vitrina.nombre.trim()) {
      toast({ message: 'El nombre de la tienda es requerido', type: 'error' })
      return
    }
    const descripcion = armarDescripcion(vitrina.descripcion, vitrina.descRaw)
    setGuardando(true)
    try {
      await empresaService.updatePerfil({
        nombreComercial: vitrina.nombre.trim(),
        tagline: vitrina.tagline.trim(),
        descripcion,
      })
      setVitrina({ ...vitrina, nombre: vitrina.nombre.trim(), descRaw: descripcion, inicial: inicialDe(vitrina.nombre) })
      toast({ message: 'Textos de la tienda guardados', type: 'success' })
    } catch (err: unknown) {
      toast({ message: mensajeErrorEmpresa(err, 'No se pudieron guardar los textos'), type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  async function subirImagen(tipo: Imagen, file?: File) {
    if (!file) return
    setSubiendo(tipo)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const { data } = tipo === 'logo'
        ? await empresaService.uploadLogo(fd)
        : await empresaService.uploadPortada(fd)
      const url = urlSubida(data)
      if (!url) throw new Error('sin url')
      const campo = tipo === 'logo' ? 'logoUrl' : 'portadaUrl'
      setVitrina((prev) => (prev ? { ...prev, [campo]: url } : prev))
      toast({ message: tipo === 'logo' ? 'Logo actualizado' : 'Portada actualizada', type: 'success' })
    } catch (err: unknown) {
      toast({ message: mensajeErrorEmpresa(err, 'No se pudo subir la imagen'), type: 'error' })
    } finally {
      setSubiendo('')
    }
  }

  async function quitarPortada() {
    setGuardando(true)
    try {
      await empresaService.updatePerfil({ ogImagenUrl: '' })
      setVitrina((prev) => (prev ? { ...prev, portadaUrl: '' } : prev))
    } catch (err: unknown) {
      toast({ message: mensajeErrorEmpresa(err, 'No se pudo quitar la portada'), type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  return { vitrina, errorCarga, subiendo, guardando, cambiar, guardarTextos, subirImagen, quitarPortada }
}

function inicialDe(nombre: string): string {
  return (nombre.trim() || 'T').slice(0, 1).toUpperCase()
}

function vitrinaDesde(nombre: string, empresa: { tagline?: string | null; descripcion?: string; logoUrl?: string | null; ogImagenUrl?: string | null }): Vitrina {
  return {
    nombre,
    tagline: empresa.tagline ?? '',
    descripcion: descripcionVisible(empresa.descripcion),
    logoUrl: empresa.logoUrl ?? '',
    portadaUrl: empresa.ogImagenUrl ?? '',
    descRaw: empresa.descripcion ?? '',
    inicial: inicialDe(nombre),
  }
}
