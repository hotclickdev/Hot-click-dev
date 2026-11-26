import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import Button from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { mensajeDeConexion } from './conexionHelpers'
import { conexionService } from './conexionService'
import type { ConfigConexion, PaginaMeta, ResultadoConexion } from './conexionTypes'
import {
  cargarSdkFacebook,
  esperarSesionEmbebida,
  loginEmbeddedSignup,
  loginParaNegocios,
} from './fbSdk'

interface Props {
  /** Se llama después de conectar bien, para que el panel refresque su lista de canales. */
  onConectado?: (r: ResultadoConexion) => void
  className?: string
}

/**
 * Botones "Conectar WhatsApp" (Embedded Signup) y "Conectar Instagram y Facebook" (Facebook Login for Business).
 * Componente reutilizable: el panel del bot solo lo monta. El token de Meta vive en memoria el tiempo justo del
 * flujo y se envía al servidor, que lo guarda cifrado; nunca se guarda en el navegador.
 */
export default function ConectarCuentasMeta({ onConectado, className = '' }: Readonly<Props>) {
  const { t } = useTranslation()
  const toast = useToast()
  const [config, setConfig] = useState<ConfigConexion | null>(null)
  const [cargandoConfig, setCargandoConfig] = useState(true)
  const [ocupado, setOcupado] = useState<'wa' | 'meta' | null>(null)
  const [paginas, setPaginas] = useState<PaginaMeta[] | null>(null)
  const [tokenUsuario, setTokenUsuario] = useState('')

  useEffect(() => {
    let vivo = true
    async function cargar() {
      try {
        const c = await conexionService.config()
        if (vivo) setConfig(c)
      } catch {
        if (vivo) setConfig(null)
      } finally {
        if (vivo) setCargandoConfig(false)
      }
    }
    cargar().catch(() => setCargandoConfig(false))
    return () => {
      vivo = false
    }
  }, [])

  const pendiente = t('agenteConexion.pendiente')
  const error = (e: unknown) => toast({ message: mensajeDeConexion(e, t('agenteConexion.errorGenerico'), pendiente), type: 'error' })

  function exito(r: ResultadoConexion) {
    const aviso = r.avisos.length > 0 ? ` ${t('agenteConexion.avisoRegistro')}` : ''
    toast({ message: `${t('agenteConexion.exito')}${aviso}`, type: 'success' })
    onConectado?.(r)
  }

  async function conectarWhatsapp() {
    if (!config?.whatsappDisponible) return
    setOcupado('wa')
    const esperando = esperarSesionEmbebida()
    try {
      const fb = await cargarSdkFacebook(config.appId, config.graphVersion)
      const [login, sesion] = await Promise.allSettled([
        loginEmbeddedSignup(fb, config.whatsappConfigId),
        esperando.promesa,
      ])
      if (login.status === 'rejected' || sesion.status === 'rejected' || !login.value.code) {
        toast({ message: t('agenteConexion.cancelado'), type: 'info' })
        return
      }
      const r = await conexionService.conectarWhatsapp({
        code: login.value.code,
        phoneNumberId: sesion.value.phoneNumberId,
        wabaId: sesion.value.wabaId,
      })
      exito(r)
    } catch (e) {
      error(e)
    } finally {
      esperando.cancelar()
      setOcupado(null)
    }
  }

  async function conectarMeta() {
    if (!config?.metaLoginDisponible) return
    setOcupado('meta')
    try {
      const fb = await cargarSdkFacebook(config.appId, config.graphVersion)
      const auth = await loginParaNegocios(fb, config.loginConfigId)
      if (!auth.accessToken) {
        toast({ message: t('agenteConexion.cancelado'), type: 'info' })
        return
      }
      const lista = await conexionService.listarPaginas(auth.accessToken)
      if (lista.length === 0) {
        toast({ message: t('agenteConexion.sinPaginas'), type: 'info' })
        return
      }
      setTokenUsuario(auth.accessToken)
      setPaginas(lista)
    } catch (e) {
      error(e)
    } finally {
      setOcupado(null)
    }
  }

  async function elegirPagina(p: PaginaMeta) {
    setOcupado('meta')
    try {
      const r = await conexionService.conectarPagina(tokenUsuario, p.id)
      setPaginas(null)
      setTokenUsuario('')
      exito(r)
    } catch (e) {
      error(e)
    } finally {
      setOcupado(null)
    }
  }

  function cancelarSeleccion() {
    setPaginas(null)
    setTokenUsuario('')
  }

  const sinConfig = !cargandoConfig && !config?.whatsappDisponible && !config?.metaLoginDisponible

  return (
    <section className={`rounded-2xl border border-hc-n-200 bg-hc-n-0 p-5 ${className}`} aria-labelledby="conexion-titulo">
      <h2 id="conexion-titulo" className="font-display text-lg font-bold text-hc-n-900">
        {t('agenteConexion.titulo')}
      </h2>
      <p className="mt-1 text-sm text-hc-n-600">{t('agenteConexion.detalle')}</p>

      <div className="mt-4 flex flex-wrap gap-3">
        <Button
          variant="success"
          loading={ocupado === 'wa'}
          disabled={cargandoConfig || ocupado !== null || !config?.whatsappDisponible}
          onClick={conectarWhatsapp}
        >
          {t('agenteConexion.conectarWhatsapp')}
        </Button>
        <Button
          variant="primary"
          loading={ocupado === 'meta' && paginas === null}
          disabled={cargandoConfig || ocupado !== null || !config?.metaLoginDisponible}
          onClick={conectarMeta}
        >
          {t('agenteConexion.conectarMeta')}
        </Button>
      </div>

      {sinConfig && (
        <p role="status" className="mt-3 text-sm font-semibold text-hc-warning">
          {pendiente}
        </p>
      )}

      {paginas && (
        <div className="mt-4" role="group" aria-label={t('agenteConexion.elegirPagina')}>
          <p className="text-sm font-semibold text-hc-n-900">{t('agenteConexion.elegirPagina')}</p>
          <ul className="mt-2 space-y-2">
            {paginas.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-hc-n-200 p-3">
                <span className="text-sm text-hc-n-900">
                  <strong>{p.nombre}</strong>
                  {p.instagramUsuario ? ` · Instagram @${p.instagramUsuario}` : ` · ${t('agenteConexion.sinInstagram')}`}
                </span>
                <Button size="sm" disabled={ocupado !== null} onClick={() => elegirPagina(p)}>
                  {t('agenteConexion.conectar')}
                </Button>
              </li>
            ))}
          </ul>
          <Button variant="ghost" size="sm" className="mt-2" onClick={cancelarSeleccion}>
            {t('agenteConexion.cancelar')}
          </Button>
        </div>
      )}
    </section>
  )
}
