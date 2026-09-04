import { useState } from 'react'
import {
  mmApagado,
  reiniciarGuiasPantalla,
  setMmApagado,
} from '@/components/ui/mentalModel/mmRegistry'
import { Block, F } from './configUi'

/**
 * Toggle de guías al entrar (Mental Model Coach) — fusionado en Perfil
 * para EMPRENDEDOR/PYME/NEGOCIO_PLUS, igual que Notificaciones (ver
 * SeccionPerfil.tsx: el mockup aprobado no tiene pestaña propia para esto).
 */
export default function SeccionGuiasAyuda() {
  const [activo, setActivo] = useState(() => !mmApagado())

  function cambiar(siguiente: boolean) {
    setMmApagado(!siguiente)
    setActivo(siguiente)
    if (siguiente) {
      reiniciarGuiasPantalla()
      globalThis.dispatchEvent(new Event('hc-open-tour'))
    }
  }

  return (
    <Block label="Guías al entrar" sublabel="Al abrir cada pantalla te explicamos paso a paso qué hacer.">
      <div data-mm="seller-opciones-guia" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
        <div>
          <p style={{ fontSize: '13px', color: 'var(--hc-text)', margin: 0, fontFamily: F.body }}>Mostrar guías de ayuda</p>
          <p style={{ fontSize: '12px', color: 'var(--hc-muted)', marginTop: '4px', fontFamily: F.body }}>
            No es un tour único: aparece cada vez que entrás a una pantalla nueva, hasta que la conocés.
          </p>
          {activo && (
            <button
              type="button"
              onClick={() => { reiniciarGuiasPantalla(); globalThis.dispatchEvent(new Event('hc-open-tour')) }}
              style={{ marginTop: '10px', fontSize: '12px', fontWeight: 600, color: 'var(--hc-accent)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: F.body }}
            >
              Volver a ver guías de esta pantalla
            </button>
          )}
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={activo}
          onClick={() => cambiar(!activo)}
          className="cfg-toggle"
          style={{ background: activo ? 'var(--hc-accent)' : 'var(--hc-border-strong)', boxShadow: activo ? '0 0 12px var(--hc-shadow)' : 'none' }}
        >
          <span className="cfg-toggle-knob" style={{ left: activo ? '23px' : '3px' }} />
        </button>
      </div>
    </Block>
  )
}
