import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useUiStore from '@/store/uiStore'
import ListaAccesos from '@/components/comprador/estados/ListaAccesos'
import { ICONOS_ESTADOS } from '@/components/comprador/estados/iconosEstados'

function Icono18({ src }: { src: string }) {
  return <img src={src} alt="" width={18} height={18} className="block size-[18px]" />
}

/** Página 404 (Figma `45:2198`): barra de marca, mensaje, buscador y accesos para seguir comprando. */
export default function NotFoundPage() {
  const { t } = useTranslation()
  const setSearchOpen = useUiStore((s) => s.setSearchOpen)

  const accesos = [
    { to: '/', texto: t('estadosComprador.irInicio'), icono: <Icono18 src={ICONOS_ESTADOS.accesoInicio} /> },
    { to: '/productos', texto: t('estadosComprador.verCategorias'), icono: <Icono18 src={ICONOS_ESTADOS.accesoCategorias} /> },
    { to: '/mis-pedidos', texto: t('estadosComprador.misPedidos'), icono: <Icono18 src={ICONOS_ESTADOS.accesoPedidos} /> },
    { to: '/ayuda', texto: t('estadosComprador.ayudaContacto'), icono: <Icono18 src={ICONOS_ESTADOS.accesoAyuda} /> },
  ]

  return (
    <MainLayout variante="marca">
      <div className="min-h-[calc(100dvh-125px)] bg-hc-n-0 lg:min-h-0">
        <div className="mx-auto w-full max-w-[430px]">
          <section className="flex flex-col items-center gap-[10px] px-5 pb-2 pt-9 text-center">
            <p className="font-mono text-[14px] font-medium leading-[normal] text-hc-n-500">404</p>
            <h1 className="font-display text-[22px] font-bold leading-[28px] tracking-normal text-hc-n-900 [text-wrap:balance]">{t('notFound.title')}</h1>
            <p className="text-[14px] leading-5 text-hc-n-600">{t('notFound.subtitle')}</p>
          </section>
          <div className="flex flex-col gap-[14px] px-5 pb-2 pt-4">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="flex w-full items-center gap-[10px] rounded-[12px] bg-hc-n-100 px-[14px] py-[13px] text-left text-[14px] leading-[normal] text-hc-n-500"
            >
              <Icono18 src={ICONOS_ESTADOS.buscador404} />
              {t('estadosComprador.buscarPlaceholder')}
            </button>
            <ListaAccesos variante="plana" accesos={accesos} etiqueta={t('estadosComprador.accesos')} />
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
