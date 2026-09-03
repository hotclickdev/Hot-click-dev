import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import { mensajeErrorEmpresa } from '@/pages/admin/mi-empresa/miEmpresaHelpers'
import { adminService } from '@/services/orderService'
import { empresaService } from '@/services/empresaService'
import useAuthStore from '@/store/authStore'
import type { Id } from '@/types/api'
import { useCuentaVendedor } from '@/prototipo/emprendedor/hooks/useCuentaVendedor'
import { Campo, EncabezadoPagina } from './ui'
import { useSellerRuta } from './SellerPlanContext'
import FormularioPorPasos from './FormularioPorPasos'
import type { PasoFormulario } from './formularioPorPasosHelpers'

const PASOS: readonly PasoFormulario[] = [
  { id: 'persona', titulo: 'Tu nombre' },
  { id: 'tienda', titulo: 'Tu tienda' },
  { id: 'contacto', titulo: 'Contacto' },
]

type Props = Readonly<{
  volverA: string
  rutaExito?: string
  /** Solo wizard (sin main/encabezado/avatar); para shell Emprendedor. */
  soloFormulario?: boolean
}>

/**
 * Editar perfil (Figma 64:476) — wizard conversacional.
 */
export function PerfilPage({
  volverA,
  rutaExito,
  soloFormulario = false,
}: Props) {
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
  const destino = rutaExito ?? volverA

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
      navigate(destino)
    } catch (err: unknown) {
      toast({ message: mensajeErrorEmpresa(err, 'No se pudo guardar el perfil'), type: 'error' })
    } finally {
      setGuardando(false)
    }
  }

  const wizard = (
    <>
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
            <Campo etiqueta="Nombre completo" value={nombre} onChange={setNombre} />
          ) : null}
          {idPaso === 'tienda' ? (
            <Campo etiqueta="Nombre de tu tienda" value={tienda} onChange={setTienda} />
          ) : null}
          {idPaso === 'contacto' ? (
            <>
              <Campo etiqueta="Correo" value={correo} onChange={setCorreo} type="email" />
              <Campo etiqueta="Teléfono" value={telefono} onChange={setTelefono} type="tel" />
            </>
          ) : null}
        </FormularioPorPasos>
      ) : null}
    </>
  )

  if (soloFormulario) return wizard

  return (
    <main className="px-5 pb-8 pt-[60px]">
      <EncabezadoPagina titulo="Editar Perfil" volverA={volverA} />
      <div className="mb-6 flex items-center gap-4">
        <div className="flex size-14 items-center justify-center rounded-full bg-hc-primary text-xl font-bold text-white">
          {cuenta.inicial}
        </div>
        <button type="button" className="text-sm text-hc-accent">
          Cambiar foto de perfil
        </button>
      </div>
      {wizard}
    </main>
  )
}

/** Default para SellerRoutes: resuelve rutas con useSellerRuta. */
export default function PerfilSellerPage() {
  const ruta = useSellerRuta()
  return <PerfilPage volverA={ruta('opciones')} rutaExito={ruta('opciones')} />
}
