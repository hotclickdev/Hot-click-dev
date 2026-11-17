import { useEffect, useState } from 'react'
import { useToast } from '@/components/ui/Toast'
import { empresaService } from '@/services/empresaService'
import useAuthStore from '@/store/authStore'
import CertificadoFirmaCard from '@/pages/admin/mi-empresa/CertificadoFirmaCard'
import { mensajeErrorEmpresa, unwrapEmpresa } from '@/pages/admin/mi-empresa/miEmpresaHelpers'
import { puedeGestionarCertificado } from '@/pages/admin/mi-empresa/pinCert'

/**
 * Certificado de firma (.p12) y PIN para Hacienda. No es información pública:
 * va aparte del wizard de «Datos de tu negocio». Solo PROPIETARIO o ADMIN de plataforma editan.
 */
export function CertificadoNegocioSeccion() {
  const toast = useToast()
  const userRole = useAuthStore((s) => s.userRole)
  const rolEquipo = useAuthStore((s) => s.rolEquipo)
  const [tieneCert, setTieneCert] = useState(false)
  const [tienePin, setTienePin] = useState(false)

  const [version, setVersion] = useState(0)

  useEffect(() => {
    let activo = true
    empresaService
      .getPerfil()
      .then(({ data }) => {
        if (!activo) return
        const perfil = unwrapEmpresa(data)
        setTieneCert(perfil?.tieneCertP12 === true)
        setTienePin(perfil?.tienePinCert === true)
      })
      .catch(() => {
        /* sin estado del certificado: la tarjeta muestra "falta" y el wizard ya avisa del error de carga */
      })
    return () => {
      activo = false
    }
  }, [version])

  async function subirCert(file: File) {
    try {
      const fd = new FormData()
      fd.append('file', file)
      await empresaService.uploadCertP12(fd)
      // El backend puede limpiar el PIN al cambiar el archivo: se relee el estado.
      setVersion((v) => v + 1)
      toast({ message: 'Certificado subido. Ingrese el PIN para terminar.', type: 'success' })
    } catch (err: unknown) {
      toast({ message: mensajeErrorEmpresa(err, 'No pudimos subir el certificado'), type: 'error' })
    }
  }

  async function guardarPin(pin: string): Promise<boolean> {
    try {
      await empresaService.guardarPinCert(pin)
      setTienePin(true)
      toast({ message: 'PIN del certificado guardado', type: 'success' })
      return true
    } catch (err: unknown) {
      toast({ message: mensajeErrorEmpresa(err, 'No pudimos guardar el PIN'), type: 'error' })
      return false
    }
  }

  return (
    <div className="mt-6">
      <CertificadoFirmaCard
        tieneCert={tieneCert}
        tienePin={tienePin}
        canEdit={puedeGestionarCertificado(userRole, rolEquipo)}
        onSubirCert={subirCert}
        onGuardarPin={guardarPin}
      />
    </div>
  )
}
