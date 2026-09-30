import { useEffect, useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { authService } from '@/services/authService'
import { useToast } from '@/components/ui/Toast'
import { statusErrorAuth } from '../authHelpers'
import {
  CODIGO_LARGO,
  REENVIO_SEGUNDOS,
  contrasenaAceptable,
  correoDesdeEstado,
  type Paso,
} from './recuperarHelpers'

const HTTP_DEMASIADAS = 429

/**
 * Estado y acciones de "Recuperar contraseña" en 3 pasos contra
 * /api/auth/forgot-password → /verify-code → /reset-password.
 * El código verificado en el paso 2 se vuelve a mandar en el paso 3: el backend
 * lo exige para cambiar la contraseña (no alcanza con conocer el correo).
 */
export function useRecuperarContrasena() {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const { t } = useTranslation()

  const [paso, setPaso] = useState<Paso>('correo')
  const [correo, setCorreo] = useState(() => correoDesdeEstado(location.state))
  const [codigo, setCodigo] = useState('')
  const [nueva, setNueva] = useState('')
  const [repetir, setRepetir] = useState('')
  const [verContrasena, setVerContrasena] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [reenvioEn, setReenvioEn] = useState(0)

  useEffect(() => {
    if (reenvioEn <= 0) return
    const id = window.setTimeout(() => setReenvioEn(s => s - 1), 1000)
    return () => window.clearTimeout(id)
  }, [reenvioEn])

  const mensajeError = (err: unknown, porDefecto: string) =>
    statusErrorAuth(err) === HTTP_DEMASIADAS ? t('forgot.tooMany') : porDefecto

  const pedirCodigo = async () => {
    await authService.forgotPassword(correo.trim())
    setCodigo('')
    setReenvioEn(REENVIO_SEGUNDOS)
  }

  const enviarCorreo = async (e: FormEvent) => {
    e.preventDefault()
    if (!correo.trim()) return
    setError(''); setCargando(true)
    try {
      await pedirCodigo()
      setPaso('codigo')
    } catch (err: unknown) {
      setError(mensajeError(err, t('forgot.errorGeneric')))
    } finally { setCargando(false) }
  }

  const reenviar = async () => {
    if (reenvioEn > 0 || cargando) return
    setError(''); setCargando(true)
    try {
      await pedirCodigo()
      toast({ message: t('forgot.codeResent'), type: 'success' })
    } catch (err: unknown) {
      setError(mensajeError(err, t('forgot.errorGeneric')))
    } finally { setCargando(false) }
  }

  const verificar = async (e: FormEvent) => {
    e.preventDefault()
    if (codigo.length !== CODIGO_LARGO) return
    setError(''); setCargando(true)
    try {
      await authService.verifyCode(correo.trim(), codigo)
      setPaso('nueva')
    } catch (err: unknown) {
      setError(mensajeError(err, t('forgot.badCode')))
      setCodigo('')
    } finally { setCargando(false) }
  }

  const guardar = async (e: FormEvent) => {
    e.preventDefault()
    if (!contrasenaAceptable(nueva, correo)) return
    if (nueva !== repetir) { setError(t('forgot.mismatch')); return }
    setError(''); setCargando(true)
    try {
      await authService.resetPassword(correo.trim(), codigo, nueva)
      toast({ message: t('forgot.passwordChanged'), type: 'success' })
      navigate('/login', { replace: true, state: { correo: correo.trim() } })
    } catch (err: unknown) {
      setError(mensajeError(err, t('forgot.errorChange')))
    } finally { setCargando(false) }
  }

  /** Paso 1 → vuelve al login. Pasos 2 y 3 → vuelven al correo (el código ya verificado no se reutiliza). */
  const volver = () => {
    setError('')
    if (paso === 'correo') { navigate('/login', { state: { correo: correo.trim() } }); return }
    setCodigo(''); setNueva(''); setRepetir(''); setVerContrasena(false)
    setPaso('correo')
  }

  return {
    paso, correo, setCorreo, codigo, setCodigo, nueva, setNueva, repetir, setRepetir,
    verContrasena, setVerContrasena, cargando, error, reenvioEn,
    enviarCorreo, reenviar, verificar, guardar, volver,
  }
}

export type RecuperarContrasena = ReturnType<typeof useRecuperarContrasena>
