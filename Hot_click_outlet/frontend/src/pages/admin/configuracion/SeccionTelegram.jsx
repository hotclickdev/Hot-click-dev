import { useState, useEffect } from 'react'
import Spinner from '@/components/ui/Spinner'
import QRCode from 'qrcode'
import { telegramService } from '@/services/telegramService'
import {
  F, Block, SectionHeader, ShoppingIcon, AlertIcon, RefreshIcon, DBIcon, CheckIcon, SendIcon,
} from './configUi'

export default function SeccionTelegram({ toast }) {
  const [estado, setEstado] = useState(null)
  const [link, setLink] = useState(null)
  const [qr, setQr] = useState(null)
  const [equipo, setEquipo] = useState([])
  const [puedeGestionar, setPuedeGestionar] = useState(false)
  const [cargando, setCargando] = useState(true)
  const [generando, setGenerando] = useState(false)

  const cargar = async () => {
    try {
      const { data } = await telegramService.estado()
      setEstado(data)
    } catch { setEstado({ configurado: false, vinculado: false }) }
    try {
      const { data } = await telegramService.equipo()
      setEquipo(Array.isArray(data) ? data : [])
      setPuedeGestionar(true)
    } catch { setPuedeGestionar(false) }
    setCargando(false)
  }

  useEffect(() => { cargar() }, []) // eslint-disable-line react-hooks/set-state-in-effect -- estado Telegram al montar

  const conectar = async () => {
    setGenerando(true)
    try {
      const { data } = await telegramService.vincular()
      setLink(data)
      try { setQr(await QRCode.toDataURL(data.deepLink, { margin: 1, width: 180 })) } catch { setQr(null) }
    } catch (e) {
      toast({ message: e?.response?.data?.error || 'No se pudo generar el código de vinculación', type: 'error' })
    }
    setGenerando(false)
  }

  const desconectar = async () => {
    try {
      await telegramService.desvincular()
      setLink(null); setQr(null)
      toast({ message: 'Telegram desvinculado', type: 'success' })
      cargar()
    } catch { toast({ message: 'No se pudo desvincular', type: 'error' }) }
  }

  const revocar = async (usuarioId) => {
    try {
      await telegramService.revocarMiembro(usuarioId)
      toast({ message: 'Acceso revocado', type: 'success' })
      cargar()
    } catch { toast({ message: 'No se pudo revocar', type: 'error' }) }
  }

  if (cargando) return <div style={{ padding: '40px', textAlign: 'center' }}><Spinner /></div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <SectionHeader title="Telegram" desc="Consultá inventario, ventas y finanzas desde Telegram, y recibí avisos automáticos de tu negocio." />

      <Block>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { icon: ShoppingIcon, texto: 'Aviso al instante por cada venta en la tienda o el punto de venta' },
            { icon: AlertIcon,    texto: 'Alerta cuando un producto se queda con poco stock o se agota' },
            { icon: RefreshIcon,  texto: 'Chequeo semanal de inventario: confirmás o corregís existencias desde el chat' },
            { icon: DBIcon,       texto: 'Consultas con botones y preguntas libres respondidas con los datos reales' },
          ].map(({ icon: Icon, texto }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '30px', height: '30px', borderRadius: '8px', background: 'var(--hc-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Icon style={{ width: '14px', height: '14px', color: 'var(--hc-muted)' }} />
              </div>
              <p style={{ fontSize: '12.5px', color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{texto}</p>
            </div>
          ))}
        </div>
      </Block>

      {!estado?.configurado ? (
        <Block label="No disponible todavía">
          <p style={{ fontSize: '13px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>
            El bot de Telegram aún no está habilitado en el servidor. Escribinos si querés activarlo para tu negocio.
          </p>
        </Block>
      ) : estado?.vinculado ? (
        <Block label="Cuenta vinculada" sublabel="Tu Telegram está conectado a HotClick">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--hc-surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <CheckIcon style={{ width: '16px', height: '16px', color: 'var(--hc-success, #22c55e)' }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>
                {estado.telegramUsername ? `@${estado.telegramUsername}` : 'Telegram conectado'}
              </p>
              {estado.fechaVinculacion && (
                <p style={{ fontSize: '11.5px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.body }}>
                  Vinculado el {new Date(estado.fechaVinculacion).toLocaleDateString('es-CR')}
                </p>
              )}
            </div>
            <button type="button" className="cfg-btn" onClick={desconectar}
              style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-danger)', border: '1px solid var(--hc-border)' }}>
              Desvincular
            </button>
          </div>
        </Block>
      ) : (
        <Block label="Conectar Telegram" sublabel="Un solo toque desde tu teléfono — sin números ni contraseñas">
          {!link ? (
            <button type="button" className="cfg-btn cfg-btn-primary" onClick={conectar} disabled={generando}>
              <SendIcon style={{ width: '14px', height: '14px' }} />
              {generando ? 'Generando…' : 'Conectar Telegram'}
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '20px', alignItems: 'center', flexWrap: 'wrap' }}>
              {qr && (
                <img src={qr} alt="QR para abrir el bot de Telegram"
                  style={{ width: '140px', height: '140px', borderRadius: '12px', border: '1px solid var(--hc-border)', background: '#fff', padding: '6px' }} />
              )}
              <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <p style={{ fontSize: '13px', color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>
                  Escaneá el QR con tu teléfono o tocá el botón. Cuando se abra el chat, presioná <strong>Iniciar</strong> y listo.
                </p>
                <a className="cfg-btn cfg-btn-primary" href={link.deepLink} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', alignSelf: 'flex-start' }}>
                  <SendIcon style={{ width: '14px', height: '14px' }} />
                  Abrir en Telegram
                </a>
                <p style={{ fontSize: '11.5px', color: 'var(--hc-muted)', fontFamily: F.body, margin: 0 }}>
                  El enlace vence en {link.expiraEnMin} minutos. Si expira, generá uno nuevo.
                </p>
              </div>
            </div>
          )}
        </Block>
      )}

      {puedeGestionar && equipo.length > 0 && (
        <Block label="Equipo con Telegram" sublabel="Miembros del negocio que reciben avisos — podés revocar el acceso de cualquiera">
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {equipo.map((m, idx) => (
              <div key={m.usuarioId}>
                {idx > 0 && <hr className="cfg-divider" />}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 0' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--hc-text)', fontFamily: F.body, margin: 0 }}>{m.nombre}</p>
                    <p style={{ fontSize: '11.5px', color: 'var(--hc-muted)', marginTop: '2px', fontFamily: F.mono }}>
                      {m.telegramUsername ? `@${m.telegramUsername}` : m.correo}
                    </p>
                  </div>
                  <button type="button" className="cfg-btn" onClick={() => revocar(m.usuarioId)}
                    style={{ background: 'var(--hc-surface-2)', color: 'var(--hc-danger)', border: '1px solid var(--hc-border)', padding: '6px 12px', fontSize: '12px' }}>
                    Revocar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Block>
      )}
    </div>
  )
}
