import { useCallback, useEffect, useState } from 'react'
import { fiscalService } from '@/services/fiscalService'
import { esVerifAuto, selloVerifAuto, type VerifAuto } from '@/utils/fiscal'
import { texto } from './normalizar'
import { Aviso, BOTON_PRIMARIO, BOTON_SECUNDARIO, Carga, Chip, TARJETA, TITULO } from './piezas'

type Fila = Record<string, unknown>

function objeto(valor: unknown): Fila {
  return valor && typeof valor === 'object' && !Array.isArray(valor) ? valor as Fila : {}
}

function dato(etiqueta: string, valor: string) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs text-hc-n-600">{etiqueta}</dt>
      <dd className="break-words text-sm font-semibold text-hc-n-900">{valor || '—'}</dd>
    </div>
  )
}

/**
 * Ficha de tienda, bloque "Datos fiscales" (solo ADMIN): lo que declaró el negocio frente a lo que respondió Hacienda,
 * con el sello de la comprobación automática. El extra solo se quita cuando el ADMIN aprueba acá.
 */
export default function FiscalVerificacion({ id, alCambiar }: { id: string; alCambiar?: () => void }) {
  const [fila, setFila] = useState<Fila | null>(null)
  const [estado, setEstado] = useState<'carga' | 'listo' | 'error'>('carga')
  const [ocupado, setOcupado] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [mensaje, setMensaje] = useState('')

  const cargar = useCallback(() => {
    fiscalService.detalleAdmin(id)
      .then(({ data }) => { setFila(objeto((data as Fila)?.data ?? data)); setEstado('listo') })
      .catch((err: unknown) => { console.error(err); setEstado('error') })
  }, [id])

  useEffect(() => { cargar() }, [cargar])

  async function ejecutar(accion: () => Promise<{ data: unknown }>, exito: string) {
    setOcupado(true)
    setMensaje('')
    try {
      const { data } = await accion()
      setFila(objeto((data as Fila)?.data ?? data))
      setMensaje(exito)
      alCambiar?.()
    } catch (err) {
      console.error(err)
      if ((err as { response?: { status?: number } })?.response?.status === 409) {
        // El negocio reenvió sus datos (o la fila cambió): se recarga lo que ve el ADMIN antes de decidir otra vez.
        setMensaje('El negocio cambió sus datos, recargá.')
        cargar()
      } else {
        setMensaje('No se pudo completar. Revisá que haya una inscripción declarada y probá de nuevo.')
      }
    } finally {
      setOcupado(false)
    }
  }

  if (estado === 'carga') return <Carga />
  if (estado === 'error' || !fila) return <Aviso>No se pudieron cargar los datos fiscales.</Aviso>

  const hacienda = objeto(fila.hacienda)
  const verif: VerifAuto | null = esVerifAuto(fila.verifAuto) ? fila.verifAuto : null
  const sello = selloVerifAuto(verif, hacienda.diferencias)
  const pendiente = fila.pendienteVerificacion === true
  const verificado = fila.fiscalVerificado === true
  const actividades = Array.isArray(hacienda.actividades) ? hacienda.actividades.map(String) : []
  const declaro = texto(fila.cedulaFiscal) !== ''
  const huella = texto(fila.huella)
  const duplicada = fila.cedulaFiscalDuplicada === true
  const otros = Array.isArray(fila.otrosNegociosMismaCedula) ? fila.otrosNegociosMismaCedula.map(String) : []
  const cedulaCuenta = texto(fila.cedulaCuenta)
  const coincideCuenta = fila.cedulaCoincideConCuenta

  return (
    <section className={`${TARJETA} flex flex-col gap-4`}>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className={TITULO}>Datos fiscales</h2>
        <Chip tono={verificado ? 'ok' : pendiente ? 'alerta' : 'neutro'}>
          {verificado ? 'Verificado' : pendiente ? 'Pendiente de verificar' : 'Sin inscripción por verificar'}
        </Chip>
        {declaro && <Chip tono={sello.tono}>{sello.texto}</Chip>}
      </div>

      {duplicada && (
        <p role="alert" className="rounded-xl bg-hc-danger-bg px-3 py-2 text-sm font-semibold text-hc-primary-text">
          Esta cédula también la declararon otros negocios ({otros.map((o) => `#${o}`).join(', ')}). Puede ser una cédula ajena: revisalo a mano.
        </p>
      )}
      {!declaro ? (
        <p className="text-sm text-hc-n-600">Situación declarada: {texto(fila.situacionFiscal, 'sin declarar')}. No hay datos para verificar.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h3 className="mb-2 text-[13px] font-bold text-hc-n-900">Lo que declaró el negocio</h3>
            <dl className="flex flex-col gap-2">
              {dato('Situación', texto(fila.situacionFiscal))}
              {dato('Cédula', texto(fila.cedulaFiscal))}
              {cedulaCuenta !== '' && dato('Cédula ya conocida de la cuenta', `${cedulaCuenta}${coincideCuenta === false ? ' (no coincide con la declarada)' : coincideCuenta === true ? ' (coincide)' : ''}`)}
              {dato('Nombre', texto(fila.nombreFiscal))}
              {dato('Actividad', texto(fila.actividadFiscal))}
              {dato('Correo para facturas', texto(fila.correoFacturacion))}
              {dato('Declaración jurada', fila.declaracionFecha ? `Aceptada el ${texto(fila.declaracionFecha).slice(0, 10)} por el usuario #${texto(fila.declaracionPor, '?')}` : 'No consta')}
            </dl>
          </div>
          <div>
            <h3 className="mb-2 text-[13px] font-bold text-hc-n-900">Lo que respondió Hacienda</h3>
            {verif === null || verif === 'ERROR_CONSULTA' || verif === 'NO_ENCONTRADO' ? (
              <p className="text-sm text-hc-n-600">
                {verif === 'NO_ENCONTRADO' ? 'Hacienda no encontró esa cédula.' : 'Todavía no hay respuesta de Hacienda. Consultá de nuevo.'}
              </p>
            ) : (
              <dl className="flex flex-col gap-2">
                {dato('Nombre', texto(hacienda.nombre))}
                {dato('Régimen', texto(hacienda.regimen))}
                {dato('Situación', texto(hacienda.estado))}
                {dato('Actividades', actividades.join(' · '))}
              </dl>
            )}
          </div>
        </div>
      )}

      {declaro && (
        <div className="flex flex-col gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-semibold text-hc-n-900">Motivo (opcional, sin datos personales)</span>
            <input
              className="h-12 w-full rounded-xl border border-hc-n-200 bg-hc-surface px-3.5 text-[15px] text-hc-n-900 outline-none focus:border-hc-blue-600"
              value={motivo} maxLength={200} onChange={(e) => setMotivo(e.target.value)}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado}
              onClick={() => void ejecutar(() => fiscalService.reconsultar(id), 'Consulta a Hacienda actualizada.')}>
              Consultar Hacienda de nuevo
            </button>
            <button type="button" className={BOTON_PRIMARIO} disabled={ocupado || !pendiente || huella === ''}
              onClick={() => void ejecutar(() => fiscalService.verificar(id, 'APROBAR', huella, motivo.trim()), 'Aprobado: el negocio paga solo la comisión de su plan.')}>
              Aprobar
            </button>
            <button type="button" className={BOTON_SECUNDARIO} disabled={ocupado || !pendiente}
              onClick={() => void ejecutar(() => fiscalService.verificar(id, 'RECHAZAR', huella, motivo.trim()), 'Rechazado: el negocio vuelve a no inscrito, con el extra.')}>
              Rechazar
            </button>
          </div>
          <p className="text-xs text-hc-n-600">
            El extra solo se quita al aprobar. El resultado de Hacienda ayuda a decidir, pero no aprueba solo.
          </p>
        </div>
      )}
      {mensaje && <p role="status" className="text-sm text-hc-n-900">{mensaje}</p>}
    </section>
  )
}
