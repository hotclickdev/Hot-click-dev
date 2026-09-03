import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import { mensajeErrorEmpresa } from '@/pages/admin/mi-empresa/miEmpresaHelpers'
import { adminService } from '@/services/orderService'
import { empresaService } from '@/services/empresaService'
import useAuthStore from '@/store/authStore'
import type { Id } from '@/types/api'
import CampoTexto from '../ui/CampoTexto'
import EmprendedorPageFrame from '../ui/EmprendedorPageFrame'
import { RUTA_EMPRENDEDOR } from '../constants'
import { useCuentaVendedor } from '../hooks/useCuentaVendedor'
import FormularioPorPasos from '@/prototipo/compartido/FormularioPorPasos'
import type { PasoFormulario } from '@/prototipo/compartido/formularioPorPasosHelpers'

const PASOS: readonly PasoFormulario[] = [
  { id: 'persona', titulo: 'Tu nombre' },
  { id: 'tienda', titulo: 'Tu tienda' },
  { id: 'contacto', titulo: 'Contacto' },
]

/**
 * Editar Perfil (wizard).
 */
export default function PerfilPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const cuenta = useCuentaVendedor()
  const userId = useAuthStore((s) => s.userId)
  const setUserName = useAuthStore((s) => s.setUserName)
  const [paso, setPaso] = useState(0)
  const [nombre, setNombre] = useState('')
  const [tienda, setTienda] = useState('')
  const [correo, setCorreo] = useState('')
  const [telefono, setTelefono] = useState('')
  const [guardando, setGuardando] = useState(false)
  const idPaso = PASOS[paso]?.id

  useEffect(() => {
    if (cuenta.cargando) return
    setNombre(cuenta.nombre)
    setTienda(cuenta.tienda)
    setCorreo(cuenta.correo)
    setTelefono(cuenta.telefono)
  }, [cuenta])

  function validar(i: number): string | null {
    if (PASOS[i]?.id === 'persona' && !nombre.trim()) return 'El nombre es requerido'
    return null
  }

  async function guardar() {
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
        <FormularioPorPasos
          pasos={PASOS}
          pasoActual={paso}
          onPasoChange={setPaso}
          validarPaso={validar}
          onFinalizar={guardar}
          etiquetaFinal="Guardar cambios"
          enviando={guardando}
        >
          {idPaso === 'persona' ? (
            <CampoTexto etiqueta="Nombre completo" value={nombre} onChange={setNombre} />
          ) : null}
          {idPaso === 'tienda' ? (
            <CampoTexto etiqueta="Nombre de tu tienda" value={tienda} onChange={setTienda} />
          ) : null}
          {idPaso === 'contacto' ? (
            <>
              <CampoTexto etiqueta="Correo" value={correo} onChange={setCorreo} type="email" readOnly />
              <CampoTexto etiqueta="Teléfono" value={telefono} onChange={setTelefono} type="tel" />
            </>
          ) : null}
        </FormularioPorPasos>
      ) : null}
    </EmprendedorPageFrame>
  )
}
