import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useUiStore from '@/store/uiStore'
import ListaAccesos from '@/components/comprador/estados/ListaAccesos'
import { AccesoAyuda, AccesoCategorias, AccesoInicio, AccesoPedidos } from '@/components/comprador/estados/iconosAcceso'

/** Página 404 (Figma `45:2198`): buscador y accesos para seguir comprando. */
export default function NotFoundPage() {
  const { t } = useTranslation()
  const setSearchOpen = useUiStore((s) => s.setSearchOpen)

  const accesos = [
    { to: '/', texto: t('estadosComprador.irInicio'), icono: <AccesoInicio /> },
    { to: '/productos', texto: t('estadosComprador.verCategorias'), icono: <AccesoCategorias /> },
    { to: '/mis-pedidos', texto: t('estadosComprador.misPedidos'), icono: <AccesoPedidos /> },
    { to: '/ayuda', texto: t('estadosComprador.ayudaContacto'), icono: <AccesoAyuda /> },
  ]

  return (
    <MainLayout>
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-4 px-4 py-12 text-center">
        <p className="text-[14px] text-hc-n-500">404</p>
        <h1 className="font-display text-[24px] font-bold text-hc-n-900 [text-wrap:balance]">{t('notFound.title')}</h1>
        <p className="text-[15px] leading-6 text-hc-n-600">{t('notFound.subtitle')}</p>
        <button
          type="button"
          onClick={() => setSearchOpen(true)}
          className="mt-2 flex min-h-12 w-full items-center gap-3 rounded-[12px] bg-hc-n-100 px-4 text-left text-[15px] text-hc-n-500"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
            strokeLinecap="round" strokeLinejoin="round" className="text-hc-n-600" aria-hidden="true">
            <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
          </svg>
          {t('estadosComprador.buscarPlaceholder')}
        </button>
        <ListaAccesos accesos={accesos} etiqueta={t('estadosComprador.accesos')} />
      </div>
    </MainLayout>
  )
}
