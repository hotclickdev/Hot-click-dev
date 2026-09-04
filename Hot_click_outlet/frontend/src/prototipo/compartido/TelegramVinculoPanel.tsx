import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { PaperAirplaneIcon } from '@heroicons/react/24/outline'
import { useToast } from '@/components/ui/Toast'
import { telegramService } from '@/services/telegramService'
import { Boton } from './ui'
import TelegramQr from './TelegramQr'
import {
  fechaVinculoCorta,
  mostrarUsername,
  parseEquipoTelegram,
  parseEstadoTelegram,
  parseLinkTelegram,
  type TelegramEstadoUi,
  type TelegramLinkUi,
  type TelegramMiembroUi,
} from './telegramVinculoHelpers'

const POLL_MS = 4000

/**
 * Vincular el Telegram del negocio al bot de HotClick (API /telegram).
 */
export default function TelegramVinculoPanel() {
  const toast = useToast()
  const [estado, setEstado] = useState<TelegramEstadoUi | null>(null)
  const [link, setLink] = useState<TelegramLinkUi | null>(null)
  const [equipo, setEquipo] = useState<TelegramMiembroUi[]>([])
  const [puedeEquipo, setPuedeEquipo] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [errorCarga, setErrorCarga] = useState(false)
  const [generando, setGenerando] = useState(false)

  const cargar = useCallback(async () => {
    try {
      const { data } = await telegramService.estado()
      setEstado(parseEstadoTelegram(data))
      setErrorCarga(false)
    } catch {
      setEstado(null)
      setErrorCarga(true)
    }
    try {
      const { data } = await telegramService.equipo()
      setEquipo(parseEquipoTelegram(data))
      setPuedeEquipo(true)
    } catch {
      setPuedeEquipo(false)
      setEquipo([])
    }
    setCargando(false)
  }, [])

  useEffect(() => { void cargar() }, [cargar])

  useEffect(() => {
    if (!link || estado?.vinculado) return
    const id = window.setInterval(() => { void cargar() }, POLL_MS)
    return () => window.clearInterval(id)
  }, [link, estado?.vinculado, cargar])

  useEffect(() => {
    if (estado?.vinculado && link) {
      setLink(null)
      toast({ message: 'Telegram vinculado a este negocio', type: 'success' })
    }
  }, [estado?.vinculado, link, toast])

  async function conectar() {
    setGenerando(true)
    try {
      const { data } = await telegramService.vincular()
      const parsed = parseLinkTelegram(data)
      if (!parsed) {
        toast({ message: 'No se pudo armar el enlace de Telegram', type: 'error' })
        return
      }
      setLink(parsed)
    } catch {
      toast({ message: 'No se pudo generar el código de vinculación', type: 'error' })
    } finally {
      setGenerando(false)
    }
  }

  async function desconectar() {
    try {
      await telegramService.desvincular()
      setLink(null)
      toast({ message: 'Telegram desvinculado', type: 'success' })
      await cargar()
    } catch {
      toast({ message: 'No se pudo desvincular', type: 'error' })
    }
  }

  async function revocar(usuarioId: string) {
    try {
      await telegramService.revocarMiembro(usuarioId)
      toast({ message: 'Acceso de Telegram revocado', type: 'success' })
      await cargar()
    } catch {
      toast({ message: 'No se pudo revocar el acceso', type: 'error' })
    }
  }

  if (cargando) {
    return <p className="text-[13px] text-hc-muted">Cargando Telegram…</p>
  }
  if (errorCarga && !estado) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-hc-muted">No se pudo cargar el estado de Telegram.</p>
        <Boton variante="contorno" onClick={() => { setCargando(true); void cargar() }}>Reintentar</Boton>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="rounded-xl bg-[var(--hc-info-bg)] px-4 py-3 text-[13px] leading-5 text-[var(--hc-info)]">
        Vinculá Telegram de este negocio para avisos de ventas, stock y cambios de cuenta de cobro.
      </p>
      <CuerpoEstado
        estado={estado}
        link={link}
        generando={generando}
        onConectar={conectar}
        onDesconectar={desconectar}
        onRefrescar={() => { void cargar() }}
      />
      {puedeEquipo && equipo.length > 0 ? (
        <EquipoTelegram miembros={equipo} onRevocar={revocar} />
      ) : null}
    </div>
  )
}

function CuerpoEstado({
  estado,
  link,
  generando,
  onConectar,
  onDesconectar,
  onRefrescar,
}: {
  estado: TelegramEstadoUi | null
  link: TelegramLinkUi | null
  generando: boolean
  onConectar: () => void
  onDesconectar: () => void
  onRefrescar: () => void
}) {
  if (!estado?.configurado) {
    return (
      <Tarjeta titulo="Todavía no está activo">
        <p className="text-[13px] text-hc-muted">
          El bot de Telegram no está habilitado en el servidor. Escribinos si querés activarlo para tu negocio.
        </p>
      </Tarjeta>
    )
  }
  if (estado.vinculado) {
    const fecha = fechaVinculoCorta(estado.fechaVinculacion)
    return (
      <Tarjeta titulo="Cuenta vinculada">
        <p className="text-sm font-semibold text-hc-text">{mostrarUsername(estado.telegramUsername)}</p>
        {fecha ? <p className="mt-1 text-[12px] text-hc-muted">Vinculado el {fecha}</p> : null}
        <div className="mt-4">
          <Boton variante="contorno" onClick={onDesconectar}>Desvincular</Boton>
        </div>
      </Tarjeta>
    )
  }
  return (
    <Tarjeta titulo="Conectar Telegram">
      {!link ? (
        <Boton onClick={onConectar} disabled={generando}>
          <span className="inline-flex items-center gap-2">
            <PaperAirplaneIcon className="size-4" aria-hidden />
            {generando ? 'Generando…' : 'Vincular este negocio'}
          </span>
        </Boton>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <TelegramQr value={link.deepLink} />
          <div className="flex min-w-0 flex-1 flex-col gap-3">
            <p className="text-[13px] text-hc-text">
              Escaneá el QR o abrí el chat. En Telegram tocá <strong>Iniciar</strong> y listo.
            </p>
            <Boton to={link.deepLink}>
              <span className="inline-flex items-center gap-2">
                <PaperAirplaneIcon className="size-4" aria-hidden />
                Abrir en Telegram
              </span>
            </Boton>
            <Boton variante="contorno" onClick={onRefrescar}>Ya lo vinculé</Boton>
            <p className="text-[12px] text-hc-muted">
              El enlace vence en {link.expiraEnMin} minutos. Si expira, generá uno nuevo.
            </p>
          </div>
        </div>
      )}
    </Tarjeta>
  )
}

function EquipoTelegram({
  miembros,
  onRevocar,
}: {
  miembros: TelegramMiembroUi[]
  onRevocar: (id: string) => void
}) {
  return (
    <Tarjeta titulo="Equipo con Telegram">
      <ul className="flex flex-col">
        {miembros.map((m) => (
          <li key={m.usuarioId} className="flex items-center gap-3 border-b border-hc-border py-3 last:border-0">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-hc-text">{m.nombre}</p>
              <p className="text-[12px] text-hc-muted">{m.detalle}</p>
            </div>
            <button
              type="button"
              className="min-h-11 shrink-0 text-[13px] font-medium text-hc-danger"
              onClick={() => onRevocar(m.usuarioId)}
            >
              Revocar
            </button>
          </li>
        ))}
      </ul>
    </Tarjeta>
  )
}

function Tarjeta({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-hc-border bg-hc-surface p-4">
      <h2 className="mb-3 text-[15px] font-semibold text-hc-text">{titulo}</h2>
      {children}
    </section>
  )
}
