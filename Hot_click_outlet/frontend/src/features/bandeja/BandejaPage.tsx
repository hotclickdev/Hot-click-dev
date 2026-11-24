import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { bandejaService } from './bandejaService'
import { FILTROS_INICIALES, mensajeDeError } from './bandejaHelpers'
import type { CanalBandeja, EstadoBandeja, FiltrosBandeja, VistaBandeja } from './bandejaTypes'
import { CLAVE_BANDEJA, useConversaciones, useDetalleConversacion, useEquipoBandeja, useResumenBandeja } from './useBandeja'
import ListaConversaciones from './ListaConversaciones'
import HiloConversacion from './HiloConversacion'

const VISTAS: VistaBandeja[] = ['TODAS', 'SIN_ASIGNAR', 'MIAS']
const CANALES: CanalBandeja[] = ['WHATSAPP', 'INSTAGRAM', 'MESSENGER']
const ESTADOS: EstadoBandeja[] = ['ABIERTA', 'CERRADA']

const CONTROL = 'min-h-11 rounded-[10px] border border-hc-border bg-hc-surface px-3 text-sm text-hc-text'

/**
 * Bandeja de conversaciones de los bots (AG-16): lista + detalle estilo mensajería. Sin websockets: la lista y el
 * hilo abierto se refrescan cada 10 s. En pantallas angostas se ve una cosa a la vez (lista o hilo).
 */
export default function BandejaPage() {
  const { t } = useTranslation()
  const toast = useToast()
  const qc = useQueryClient()
  const [filtros, setFiltros] = useState<FiltrosBandeja>(FILTROS_INICIALES)
  const [seleccionId, setSeleccionId] = useState<string | null>(null)
  const [ocupado, setOcupado] = useState(false)

  const lista = useConversaciones(filtros)
  const detalle = useDetalleConversacion(seleccionId)
  const equipo = useEquipoBandeja().data ?? []
  const resumen = useResumenBandeja().data

  const cambiar = (parcial: Partial<FiltrosBandeja>) => setFiltros((f) => ({ ...f, pagina: 0, ...parcial }))
  const refrescar = () => qc.invalidateQueries({ queryKey: CLAVE_BANDEJA })

  async function ejecutar(accion: () => Promise<unknown>, exito: string): Promise<boolean> {
    setOcupado(true)
    try {
      await accion()
      toast({ message: exito, type: 'success' })
      await refrescar()
      return true
    } catch (e) {
      toast({ message: mensajeDeError(e, t('bandeja.errorGenerico')), type: 'error' })
      await refrescar()
      return false
    } finally {
      setOcupado(false)
    }
  }

  const id = seleccionId
  const items = lista.data?.items ?? []

  return (
    <main className="p-4 sm:p-6" data-mm="bandeja">
      <h1 className="font-display text-2xl font-bold text-hc-text">{t('bandeja.titulo')}</h1>
      <p className="mt-1 text-sm text-hc-muted">{t('bandeja.subtitulo')}</p>
      {resumen && (
        <p role="status" className="mt-2 text-sm font-medium text-hc-text">
          {t('bandeja.resumen', { mias: resumen.asignadasAMi, sin: resumen.sinAsignar })}
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-end gap-3" role="group" aria-label={t('bandeja.filtrosAria')}>
        <div className="flex flex-wrap gap-2">
          {VISTAS.map((v) => (
            <button
              key={v} type="button" aria-pressed={filtros.vista === v} onClick={() => cambiar({ vista: v })}
              className={`min-h-11 rounded-full px-4 text-sm font-bold transition-colors ${filtros.vista === v ? 'bg-hc-primary text-white' : 'border border-hc-border bg-hc-surface text-hc-text'}`}
            >
              {t(`bandeja.vista.${v}`)}
            </button>
          ))}
        </div>
        <label className="flex flex-col text-xs font-medium text-hc-muted">
          {t('bandeja.filtroCanal')}
          <select
            className={CONTROL} value={filtros.canal}
            onChange={(e) => cambiar({ canal: e.target.value as CanalBandeja | '' })}
          >
            <option value="">{t('bandeja.todosCanales')}</option>
            {CANALES.map((c) => <option key={c} value={c}>{t(`bandeja.canal.${c}`)}</option>)}
          </select>
        </label>
        <label className="flex flex-col text-xs font-medium text-hc-muted">
          {t('bandeja.filtroEstado')}
          <select
            className={CONTROL} value={filtros.estado}
            onChange={(e) => cambiar({ estado: e.target.value as EstadoBandeja })}
          >
            {ESTADOS.map((s) => <option key={s} value={s}>{t(`bandeja.estado.${s}`)}</option>)}
          </select>
        </label>
      </div>

      {lista.isError && (
        <p role="alert" className="mt-3 rounded-[10px] bg-[var(--hc-danger-bg)] p-3 text-sm text-[var(--hc-danger)]">
          {mensajeDeError(lista.error, t('bandeja.errorCargar'))}
        </p>
      )}

      <div className="mt-4 grid overflow-hidden rounded-xl border border-hc-border bg-hc-surface md:min-h-[560px] md:grid-cols-[minmax(280px,360px)_1fr]">
        <div className={`${id ? 'hidden md:block' : ''} overflow-y-auto md:max-h-[720px] md:border-r md:border-hc-border`}>
          <ListaConversaciones
            items={items} seleccionId={id} equipo={equipo} cargando={lista.isLoading}
            hayMas={lista.data?.hayMas ?? false} hayAnterior={filtros.pagina > 0}
            onSeleccionar={setSeleccionId}
            onPagina={(d) => setFiltros((f) => ({ ...f, pagina: Math.max(0, f.pagina + d) }))}
          />
        </div>
        <div className={`${id ? '' : 'hidden md:flex'} min-h-[420px] flex-col md:max-h-[720px]`}>
          {id && detalle.data ? (
            <HiloConversacion
              key={id}
              detalle={detalle.data} equipo={equipo} ocupado={ocupado}
              onVolver={() => setSeleccionId(null)}
              onPausar={() => void ejecutar(() => bandejaService.pausar(id), t('bandeja.ok.pausada'))}
              onReanudar={() => void ejecutar(() => bandejaService.reanudar(id), t('bandeja.ok.reanudada'))}
              onTomar={() => void ejecutar(() => bandejaService.tomar(id), t('bandeja.ok.tomada'))}
              onAsignar={(u) => void ejecutar(() => bandejaService.asignar(id, u), t('bandeja.ok.asignada'))}
              onCerrar={() => void ejecutar(() => bandejaService.cerrar(id), t('bandeja.ok.cerrada'))}
              onEnviar={(texto) => ejecutar(() => bandejaService.responder(id, texto), t('bandeja.ok.enviado'))}
            />
          ) : (
            <p className="m-auto p-6 text-center text-sm text-hc-muted" role={id ? 'status' : undefined}>
              {id ? (detalle.isError ? mensajeDeError(detalle.error, t('bandeja.errorCargar')) : t('bandeja.cargando')) : t('bandeja.elegir')}
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
