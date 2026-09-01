import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import { mensajeErrorEmpresa } from '@/pages/admin/mi-empresa/miEmpresaHelpers'
import { adminService } from '@/services/orderService'
import { empresaService } from '@/services/empresaService'
import useAuthStore from '@/store/authStore'
import type { Id } from '@/types/api'
import BotonPrimario from '../ui/BotonPrimario'
import CampoTexto from '../ui/CampoTexto'
import EmprendedorPageFrame, { EmprendedorCard } from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useCuentaVendedor } from '../hooks/useCuentaVendedor'

/**
 * Editar Perfil (Figma 64:128 / 352:4626).
 */
export default function PerfilPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const cuenta = useCuentaVendedor()
  const userId = useAuthStore((s) => s.userId)
  const setUserName = useAuthStore((s) => s.setUserName)
  const [nombre, setNombre] = useState('')
  const [tienda, setTienda] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (cuenta.cargando) return
    setNombre(cuenta.nombre)
    setTienda(cuenta.tienda)
    setCorreo(cuenta.correo)
    setTelefono(cuenta.telefono)
  }, [cuenta])

  async function onSubmit(evento: FormEvent) {
    evento.preventDefault()
    if (!nombre.trim()) {
      toast({ message: 'El nombre es requerido', type: 'error' })
      return
    }
    setGuardando(true)
    try {
      await empresaService.updatePerfil({
        nombreComercial: tienda.trim(),
        numeroWhatsapp: telefono.trim(),
      })
      if (userId) {
        await adminService.updateUsuario(userId as Id, { nombre: nombre.trim() })
        setUserName(nombre.trim())
      }
      toast({ message: 'Perfil actualizado', type: 'success' })
      navigate(`${RUTA_EMPRENDEDOR}/opciones`)
    } catch (err: unknown) {
      toast({ message: mensajeErrorEmpresa(err, 'No se pudo guardar el perfil'), type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <EmprendedorPageFrame titulo="Editar Perfil" volverA={`${RUTA_EMPRENDEDOR}/opciones`}>
      {cuenta.cargando ? <p className="text-sm text-hc-muted">Cargando perfil…</p> : null}
      {!cuenta.cargando ? (
        <form className="flex flex-col gap-4" onSubmit={onSubmit}>
          <EmprendedorCard className="flex flex-col gap-4">
            <CampoTexto etiqueta="Nombre completo" value={nombre} onChange={setNombre} />
            <CampoTexto etiqueta="Nombre de tu tienda" value={tienda} onChange={setTienda} />
            <CampoTexto etiqueta="Correo" value={correo} onChange={setCorreo} type="email" readOnly />
            <CampoTexto etiqueta="Teléfono" value={telefono} onChange={setTelefono} type="tel" />
          </EmprendedorCard>
          <BotonPrimario type="submit">{guardando ? 'Guardando…' : 'Guardar cambios'}</BotonPrimario>
        </form>
      ) : null}
    </EmprendedorPageFrame>
  )
}
