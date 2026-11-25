import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { campanaService } from './campanaService'
import { formatearFecha } from './botHelpers'
import { BOTON_PRIMARIO, BOTON_SECUNDARIO, CLAVE_BOT, CONTROL, TARJETA, useAccionBot, useConsultaBot } from './useBot'

/** Catálogo de Meta del negocio (AG-37): conecta el id de Commerce Manager y sincroniza los productos visibles. */
export default function CatalogoMetaCard() {
  const { t } = useTranslation()
  const q = useConsultaBot(['campanas', 'catalogo'], campanaService.catalogoMeta)
  const [id, setId] = useState('')
  const invalidar = [...CLAVE_BOT, 'campanas', 'catalogo']
  const conectar = useAccionBot(campanaService.conectarCatalogo, {
    invalidar, exito: t('bot.campanas.catalogo.conectado'), onExito: () => setId(''),
  })
  const sincronizar = useAccionBot(campanaService.sincronizarCatalogo, { invalidar, exito: t('bot.campanas.catalogo.sincronizado') })
  const desconectar = useAccionBot(campanaService.desconectarCatalogo, { invalidar })
  const e = q.data

  return (
    <section className={`${TARJETA} grid gap-3`} aria-labelledby="camp-catalogo">
      <h2 id="camp-catalogo" className="font-display text-lg font-bold text-hc-text">{t('bot.campanas.catalogo.titulo')}</h2>
      <p className="text-sm text-hc-muted">{t('bot.campanas.catalogo.ayuda')}</p>
      {q.isLoading && <p role="status" className="text-sm text-hc-muted">{t('bot.cargando')}</p>}
      {q.isError && <p role="alert" className="text-sm text-[var(--hc-danger)]">{t('bot.errorCargar')}</p>}
      {e?.conectado ? (
        <div className="grid gap-2">
          <p className="text-sm text-hc-text">
            {t('bot.campanas.catalogo.estado', { id: e.catalogoId, n: e.sincronizados })}
          </p>
          {e.ultimaSync && <p className="text-xs text-hc-muted">{t('bot.campanas.catalogo.ultimaSync', { fecha: formatearFecha(e.ultimaSync) })}</p>}
          {e.ultimoError && <p role="alert" className="text-sm text-[var(--hc-danger)]">{t('bot.campanas.catalogo.error', { codigo: e.ultimoError })}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={BOTON_PRIMARIO} disabled={sincronizar.isPending} onClick={() => sincronizar.mutate(undefined)}>
              {sincronizar.isPending ? t('bot.campanas.catalogo.sincronizando') : t('bot.campanas.catalogo.sincronizar')}
            </button>
            <button type="button" className={BOTON_SECUNDARIO} disabled={desconectar.isPending} onClick={() => desconectar.mutate(undefined)}>
              {t('bot.campanas.catalogo.desconectar')}
            </button>
          </div>
        </div>
      ) : (
        !q.isLoading && (
          <form className="grid gap-3" onSubmit={(ev) => { ev.preventDefault(); if (/^\d{5,25}$/.test(id)) conectar.mutate(id) }}>
            <label className="flex flex-col gap-1 text-sm font-medium text-hc-text">
              {t('bot.campanas.catalogo.idCatalogo')}
              <input className={CONTROL} inputMode="numeric" maxLength={25} value={id} onChange={(ev) => setId(ev.target.value.trim())} />
              <span className="text-xs font-normal text-hc-muted">{t('bot.campanas.catalogo.idAyuda')}</span>
            </label>
            <div>
              <button type="submit" className={BOTON_PRIMARIO} disabled={!/^\d{5,25}$/.test(id) || conectar.isPending}>
                {t('bot.campanas.catalogo.conectar')}
              </button>
            </div>
          </form>
        )
      )}
    </section>
  )
}
