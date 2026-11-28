import { useEffect, useState, type FormEvent } from 'react'
import { fiscalService } from '@/services/fiscalService'
import {
  MENSAJE_CEDULA, MENSAJE_SIN_DECLARAR, TEXTO_DECLARACION, SITUACIONES, correoValido, formatoPct, leerEstadoFiscal, mensajePendiente, normalizarCedula,
  type EstadoFiscal, type SituacionFiscal,
} from '@/utils/fiscal'
import { Block, FormGroup, StyledInput, mensajeErrorConfig } from './configUi'

type Mensaje = { ok: boolean; texto: string }
type Datos = { situacion: 'INSCRITO' | 'REGIMEN_SIMPLIFICADO'; cedula: string; nombre: string; actividad: string; correo: string }
const VACIO: Datos = { situacion: 'INSCRITO', cedula: '', nombre: '', actividad: '', correo: '' }

/**
 * Comisión efectiva del negocio (plan + extra si no está inscrito en Hacienda) y el flujo "Ya me inscribí".
 * El servidor calcula todo; acá solo se muestra. Sin empresa (ADMIN sin "ver como") no se muestra nada.
 */
export default function ComisionFiscalCard() {
  const [estado, setEstado] = useState<EstadoFiscal | null>(null)
  const [abierto, setAbierto] = useState(false)
  const [datos, setDatos] = useState<Datos>(VACIO)
  const [acepta, setAcepta] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState<Mensaje | null>(null)

  useEffect(() => {
    let cancelado = false
    fiscalService.miEstado()
      .then(({ data }) => { if (!cancelado) setEstado(leerEstadoFiscal(data)) })
      .catch(() => { /* sin empresa o sin permiso: la tarjeta no aparece */ })
    return () => { cancelado = true }
  }, [])

  if (!estado) return null

  async function declarar(situacion: SituacionFiscal) {
    setEnviando(true)
    setMensaje(null)
    try {
      const { data } = await fiscalService.declarar(situacion)
      setEstado(leerEstadoFiscal(data))
    } catch (err) {
      setMensaje({ ok: false, texto: mensajeErrorConfig(err, 'No se pudo guardar. Intentá de nuevo.') })
    } finally {
      setEnviando(false)
    }
  }

  function error(): string | null {
    if (!normalizarCedula(datos.cedula)) return MENSAJE_CEDULA
    if (datos.nombre.trim().length < 2) return 'Poné el nombre como aparece en Hacienda.'
    if (datos.actividad.trim().length < 2) return 'Poné tu actividad económica.'
    if (!correoValido(datos.correo)) return 'El correo para facturas no parece válido.'
    if (!acepta) return 'Tenés que aceptar la declaración para enviar tus datos.'
    return null
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    const problema = error()
    if (problema) { setMensaje({ ok: false, texto: problema }); return }
    setEnviando(true)
    setMensaje(null)
    try {
      const { data } = await fiscalService.yaMeInscribi({
        ...datos, cedula: datos.cedula.trim(), nombre: datos.nombre.trim(),
        actividad: datos.actividad.trim(), correo: datos.correo.trim(), aceptaDeclaracion: acepta,
      })
      setEstado(leerEstadoFiscal(data))
      setAbierto(false)
      setDatos(VACIO)
      setAcepta(false)
      setMensaje({ ok: true, texto: mensajePendiente(leerEstadoFiscal(data).verifAuto) })
    } catch (err) {
      setMensaje({ ok: false, texto: mensajeErrorConfig(err, 'No se pudo registrar. Revisá los datos.') })
    } finally {
      setEnviando(false)
    }
  }

  const campo = (clave: keyof Datos, valor: string) => setDatos((d) => ({ ...d, [clave]: valor }))

  return (
    <Block label="Tu comisión con HotClick" sublabel="Comisión de tu plan y tu situación ante Hacienda.">
      <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <p style={{ fontFamily: 'var(--hc-font-display)', fontWeight: 800, fontSize: '28px', margin: 0, color: 'var(--hc-text)' }}>
            {formatoPct(estado.comisionEfectivaPct)}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--hc-muted)', margin: '2px 0 0' }}>
            {estado.comisionExtraPct > 0
              ? `Plan ${formatoPct(estado.comisionPlanPct)} + ${formatoPct(estado.comisionExtraPct)} extra por no tener la inscripción en Hacienda confirmada.`
              : `Comisión de tu plan (${formatoPct(estado.comisionPlanPct)}).`}
          </p>
        </div>

        {estado.situacionFiscal === null && (
          <fieldset style={{ border: 0, padding: 0, margin: 0 }} disabled={enviando}>
            <legend style={{ fontSize: '13px', fontWeight: 600, marginBottom: '4px' }}>¿Estás inscrito en Hacienda?</legend>
            <p style={{ fontSize: '13px', margin: '0 0 8px' }}>{MENSAJE_SIN_DECLARAR}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {SITUACIONES.map((s) => (
                <button key={s.id} type="button" className="cfg-btn" onClick={() => void declarar(s.id)}>{s.etiqueta}</button>
              ))}
            </div>
          </fieldset>
        )}

        {(estado.situacionFiscal === 'NO_INSCRITO' || (estado.situacionFiscal !== null && !estado.tieneDatos && !estado.verificado)) && !abierto && (
          <div>
            <p style={{ fontSize: '13px', margin: '0 0 8px' }}>
              Cuando te inscribás en Hacienda, contanos tus datos; tu comisión vuelve a la de tu plan cuando HotClick los confirme.
            </p>
            <button type="button" className="cfg-btn cfg-btn-primary" onClick={() => { setAbierto(true); setMensaje(null) }}>
              Ya me inscribí
            </button>
          </div>
        )}

        {estado.pendiente && !abierto && (
          <div>
            <p style={{ fontSize: '13px', margin: '0 0 8px' }}>{mensajePendiente(estado.verifAuto)}</p>
            <button type="button" className="cfg-btn" onClick={() => { setAbierto(true); setMensaje(null) }}>Corregir mis datos</button>
          </div>
        )}

        {estado.verificado && (
          <p style={{ fontSize: '13px', margin: 0 }}>
            Situación: <strong>{SITUACIONES.find((s) => s.id === estado.situacionFiscal)?.etiqueta}</strong>.
            {' '}Enviás tu factura a HotClick dentro de {estado.diasEnviarFactura} días de cada venta.
          </p>
        )}

        {abierto && (
          <form onSubmit={(e) => void enviar(e)} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <FormGroup label="¿Cómo estás inscrito?" fieldId="fiscal-situacion">
              <select id="fiscal-situacion" className="cfg-input" value={datos.situacion}
                onChange={(ev) => campo('situacion', ev.target.value)}>
                <option value="INSCRITO">Inscrito</option>
                <option value="REGIMEN_SIMPLIFICADO">Régimen Simplificado</option>
              </select>
            </FormGroup>
            <FormGroup label="Cédula" hint="Física, jurídica o DIMEX" fieldId="fiscal-cedula">
              <StyledInput id="fiscal-cedula" inputMode="numeric" autoComplete="off" value={datos.cedula} maxLength={20}
                onChange={(ev) => campo('cedula', ev.target.value)} />
            </FormGroup>
            <FormGroup label="Nombre como aparece en Hacienda" fieldId="fiscal-nombre">
              <StyledInput id="fiscal-nombre" value={datos.nombre} maxLength={150} onChange={(ev) => campo('nombre', ev.target.value)} />
            </FormGroup>
            <FormGroup label="Actividad económica" fieldId="fiscal-actividad">
              <StyledInput id="fiscal-actividad" value={datos.actividad} maxLength={150} onChange={(ev) => campo('actividad', ev.target.value)} />
            </FormGroup>
            <FormGroup label="Correo para facturas" fieldId="fiscal-correo">
              <StyledInput id="fiscal-correo" type="email" value={datos.correo} maxLength={150} onChange={(ev) => campo('correo', ev.target.value)} />
            </FormGroup>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', minHeight: '44px', cursor: 'pointer' }}>
              <input type="checkbox" checked={acepta} onChange={(ev) => setAcepta(ev.target.checked)}
                style={{ marginTop: '3px', width: '16px', height: '16px', accentColor: 'var(--hc-accent)' }} />
              <span style={{ fontSize: '12px', lineHeight: 1.6 }}>{TEXTO_DECLARACION}</span>
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button type="submit" className="cfg-btn cfg-btn-primary" disabled={enviando}>{enviando ? 'Guardando…' : 'Guardar'}</button>
              <button type="button" className="cfg-btn" disabled={enviando} onClick={() => setAbierto(false)}>Cancelar</button>
            </div>
          </form>
        )}

        {mensaje && (
          <p role="status" style={{ fontSize: '13px', margin: 0, color: mensaje.ok ? 'var(--hc-text)' : 'var(--hc-primary-text)' }}>{mensaje.texto}</p>
        )}
      </div>
    </Block>
  )
}
