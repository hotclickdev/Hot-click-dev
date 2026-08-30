import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { useToast } from '@/components/ui/Toast'
import { paymentService } from '@/services/paymentService'
import { queryPagos, queryWebhooks } from './pagosHelpers'
import type { Id } from '@/types/api'
import type { ComprobanteAdmin, PagoAdmin, PagosKpis, WebhookAdmin } from './pagosHelpers'

/**
 * Estado y fetches de AdminPagos — bit-idéntico al original.
 */
export function useAdminPagosData() {
  const { t } = useTranslation()
  const { showToast } = useToast()
  const [tab, setTab] = useState<string>('pagos')

  const [pagos, setPagos] = useState<PagoAdmin[]>([])
  const [kpis, setKpis] = useState<PagosKpis | null>(null)
  const [filtProv, setFiltProv] = useState('')
  const [filtEstado, setFiltEstado] = useState('')
  const [pagePage, setPagePage] = useState(0)
  const [pageTotal, setPageTotal] = useState(0)
  const [loadingP, setLoadingP] = useState(true)

  const [webhooks, setWebhooks] = useState<WebhookAdmin[]>([])
  const [filtProc, setFiltProc] = useState('')
  const [whPage, setWhPage] = useState(0)
  const [whTotal, setWhTotal] = useState(0)
  const [loadingW, setLoadingW] = useState(true)
  const [actionLoading, setActionLoading] = useState<Id | null>(null)

  const [comprobantes, setComprobantes] = useState<ComprobanteAdmin[]>([])
  const [filtComp, setFiltComp] = useState('PENDIENTE')
  const [compPage, setCompPage] = useState(0)
  const [compTotal, setCompTotal] = useState(0)
  const [loadingC, setLoadingC] = useState(false)
  const [compAction, setCompAction] = useState<Id | null>(null)
  const [motivoModal, setMotivoModal] = useState<Id | null>(null)
  const [motivoTexto, setMotivoTexto] = useState('')
  const [imgModal, setImgModal] = useState<string | null>(null)

  const fetchKpis = useCallback(async () => {
    try {
      const { data } = await paymentService.kpisAdmin()
      setKpis(data)
    } catch {
      showToast(t('common.error'), 'error')
    }
  }, [showToast, t])

  const fetchPagos = useCallback(async () => {
    setLoadingP(true)
    try {
      const { data } = await paymentService.listarAdmin(queryPagos({
        page: pagePage,
        proveedor: filtProv,
        estadoPago: filtEstado,
      }))
      setPagos(data.content ?? [])
      setPageTotal(data.totalPages ?? 0)
    } catch {
      showToast(t('common.error'), 'error')
      setPagos([])
    } finally {
      setLoadingP(false)
    }
  }, [pagePage, filtProv, filtEstado, showToast, t])

  const fetchWebhooks = useCallback(async () => {
    setLoadingW(true)
    try {
      const { data } = await paymentService.listarWebhooks(queryWebhooks({
        page: whPage,
        procesado: filtProc,
      }))
      setWebhooks(data.content ?? [])
      setWhTotal(data.totalPages ?? 0)
    } catch {
      showToast(t('common.error'), 'error')
      setWebhooks([])
    } finally {
      setLoadingW(false)
    }
  }, [whPage, filtProc, showToast, t])

  const fetchComprobantes = useCallback(async () => {
    setLoadingC(true)
    try {
      const { data } = await paymentService.listarComprobantes(filtComp, compPage)
      setComprobantes(data.content ?? [])
      setCompTotal(data.totalPages ?? 0)
    } catch {
      showToast(t('common.error'), 'error')
      setComprobantes([])
    } finally {
      setLoadingC(false)
    }
  }, [filtComp, compPage, showToast, t])

  useEffect(() => {
    let cancelado = false
    paymentService.kpisAdmin()
      .then(({ data }) => { if (!cancelado) setKpis(data) })
      .catch(() => { if (!cancelado) showToast(t('common.error'), 'error') })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- montaje único
  }, [])

  useEffect(() => {
    let cancelado = false
    paymentService.listarAdmin(queryPagos({
      page: pagePage,
      proveedor: filtProv,
      estadoPago: filtEstado,
    }))
      .then(({ data }) => {
        if (cancelado) return
        setPagos(data.content ?? [])
        setPageTotal(data.totalPages ?? 0)
      })
      .catch(() => {
        if (cancelado) return
        showToast(t('common.error'), 'error')
        setPagos([])
      })
      .finally(() => { if (!cancelado) setLoadingP(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtros de página
  }, [pagePage, filtProv, filtEstado])

  useEffect(() => {
    let cancelado = false
    paymentService.listarWebhooks(queryWebhooks({
      page: whPage,
      procesado: filtProc,
    }))
      .then(({ data }) => {
        if (cancelado) return
        setWebhooks(data.content ?? [])
        setWhTotal(data.totalPages ?? 0)
      })
      .catch(() => {
        if (cancelado) return
        showToast(t('common.error'), 'error')
        setWebhooks([])
      })
      .finally(() => { if (!cancelado) setLoadingW(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- filtros de webhooks
  }, [whPage, filtProc])

  useEffect(() => {
    if (tab !== 'comprobantes') return
    let cancelado = false
    paymentService.listarComprobantes(filtComp, compPage)
      .then(({ data }) => {
        if (cancelado) return
        setComprobantes(data.content ?? [])
        setCompTotal(data.totalPages ?? 0)
      })
      .catch(() => {
        if (cancelado) return
        showToast(t('common.error'), 'error')
        setComprobantes([])
      })
      .finally(() => { if (!cancelado) setLoadingC(false) })
    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- tab comprobantes
  }, [tab, filtComp, compPage])

  return {
    t,
    tab,
    setTab,
    pagos,
    kpis,
    filtProv,
    setFiltProv,
    filtEstado,
    setFiltEstado,
    pagePage,
    setPagePage,
    pageTotal,
    loadingP,
    setLoadingP,
    webhooks,
    filtProc,
    setFiltProc,
    whPage,
    setWhPage,
    whTotal,
    loadingW,
    setLoadingW,
    actionLoading,
    setActionLoading,
    comprobantes,
    filtComp,
    setFiltComp,
    compPage,
    setCompPage,
    compTotal,
    loadingC,
    setLoadingC,
    compAction,
    setCompAction,
    motivoModal,
    setMotivoModal,
    motivoTexto,
    setMotivoTexto,
    imgModal,
    setImgModal,
    fetchKpis,
    fetchPagos,
    fetchWebhooks,
    fetchComprobantes,
  }
}
