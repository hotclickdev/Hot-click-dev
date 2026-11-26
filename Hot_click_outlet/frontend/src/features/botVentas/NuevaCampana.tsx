import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { categoriaCatalogoService } from '@/services/categoriaCatalogoService'
import { campanaService } from './campanaService'
import { contarVariables, parametrosIniciales } from './campanaHelpers'
import type { PlantillaMarketing, SegmentoTipo } from './campanaTypes'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CLAVE_BOT, CONTROL, TARJETA, useAccionBot } from './useBot'

const SEGMENTOS: SegmentoTipo[] = ['TODOS', 'COMPRADORES_RECIENTES', 'INTERES_CATEGORIA', 'LEADS']

/** Borrador de campaña: plantilla aprobada, segmento simple y valores de las variables. No envía nada todavía. */
export default function NuevaCampana({ plantillas, alTerminar }: Readonly<{ plantillas: PlantillaMarketing[]; alTerminar: () => void }>) {
  const { t } = useTranslation()
  const aprobadas = plantillas.filter((p) => p.estado === 'APROBADA')
  const [nombre, setNombre] = useState('')
  const [plantillaId, setPlantillaId] = useState<number | ''>('')
  const [tipo, setTipo] = useState<SegmentoTipo>('TODOS')
  const [dias, setDias] = useState(90)
  const [categoriaId, setCategoriaId] = useState<number | ''>('')
  const [valores, setValores] = useState<string[]>([])
  const plantilla = aprobadas.find((p) => p.id === plantillaId)
  const n = plantilla ? contarVariables(plantilla.cuerpo) : 0
  const params = Array.from({ length: n }, (_, i) => valores[i] ?? parametrosIniciales(plantilla?.cuerpo ?? '')[i] ?? '')
  const categorias = useQuery({
    queryKey: [...CLAVE_BOT, 'campanas', 'categorias'],
    queryFn: categoriaCatalogoService.conProductos,
    enabled: tipo === 'INTERES_CATEGORIA',
  })
  const crear = useAccionBot(campanaService.crearCampana, {
    invalidar: [...CLAVE_BOT, 'campanas', 'lista'], exito: t('bot.campanas.nueva.creada'), onExito: alTerminar,
  })
  const valido = nombre.trim() !== '' && plantilla != null && params.every((p) => p.trim() !== '')
    && (tipo !== 'INTERES_CATEGORIA' || categoriaId !== '')

  return (
    <form
      className={`${TARJETA} grid gap-3`} aria-label={t('bot.campanas.nueva.formulario')}
      onSubmit={(e) => {
        e.preventDefault()
        if (!valido || plantilla == null) return
        crear.mutate({
          nombre: nombre.trim(), plantillaId: plantilla.id, parametros: params, programadaPara: null,
          segmento: { tipo, dias: tipo === 'TODOS' ? null : dias, categoriaId: tipo === 'INTERES_CATEGORIA' ? Number(categoriaId) : null },
        })
      }}
    >
      <p className="text-sm text-hc-muted">{t('bot.campanas.nueva.ayuda')}</p>
      <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
        {t('bot.campanas.nueva.nombre')}
        <input className={CONTROL} maxLength={120} value={nombre} onChange={(e) => setNombre(e.target.value)} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
        {t('bot.campanas.nueva.plantilla')}
        <select className={CONTROL} value={plantillaId} onChange={(e) => { setPlantillaId(e.target.value ? Number(e.target.value) : ''); setValores([]) }}>
          <option value="">{t('bot.campanas.nueva.elegir')}</option>
          {aprobadas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        {aprobadas.length === 0 && <span className="text-xs font-normal text-hc-muted">{t('bot.campanas.nueva.sinAprobadas')}</span>}
      </label>
      {plantilla && <p className="whitespace-pre-line rounded-[12px] bg-[var(--hc-info-bg)] p-3 text-sm text-hc-text">{plantilla.cuerpo}</p>}
      {params.map((valor, i) => (
        <label key={i} className="flex flex-col gap-1 text-sm font-medium text-hc-text">
          {t('bot.campanas.nueva.valor', { n: i + 1 })}
          <input
            className={CONTROL} maxLength={200} value={valor}
            onChange={(e) => { const c = [...params]; c[i] = e.target.value; setValores(c) }}
          />
          {i === 0 && <span className="text-xs font-normal text-hc-muted">{t('bot.campanas.nueva.valorAyuda')}</span>}
        </label>
      ))}
      <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
        {t('bot.campanas.nueva.segmento')}
        <select className={CONTROL} value={tipo} onChange={(e) => setTipo(e.target.value as SegmentoTipo)}>
          {SEGMENTOS.map((s) => <option key={s} value={s}>{t(`bot.campanas.segmentos.${s}`)}</option>)}
        </select>
        <span className="text-xs font-normal text-hc-muted">{t('bot.campanas.nueva.segmentoAyuda')}</span>
      </label>
      {tipo !== 'TODOS' && (
        <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
          {t('bot.campanas.nueva.dias')}
          <input className={CONTROL} type="number" min={1} max={365} value={dias} onChange={(e) => setDias(Math.max(1, Math.min(365, Number(e.target.value) || 1)))} />
        </label>
      )}
      {tipo === 'INTERES_CATEGORIA' && (
        <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
          {t('bot.campanas.nueva.categoria')}
          <select className={CONTROL} value={categoriaId} onChange={(e) => setCategoriaId(e.target.value ? Number(e.target.value) : '')}>
            <option value="">{t('bot.campanas.nueva.elegir')}</option>
            {(categorias.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <button type="submit" className={BOTON_PRIMARIO} disabled={!valido || crear.isPending}>
          {crear.isPending ? t('bot.guardando') : t('bot.campanas.nueva.guardar')}
        </button>
        <button type="button" className={BOTON_SECUNDARIO} onClick={alTerminar}>{t('bot.cancelar')}</button>
      </div>
    </form>
  )
}
