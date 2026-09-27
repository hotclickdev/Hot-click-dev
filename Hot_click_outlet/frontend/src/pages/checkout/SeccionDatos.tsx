import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { rutaLoginConRetorno } from '@/utils/authRedirect'
import CampoCompra from './CampoCompra'
import SeccionCompra from './SeccionCompra'
import { ICONOS_COMPRA } from './iconosCompra'
import type { FormularioCompra } from './useFormularioCompra'

const RUTA_INGRESAR = rutaLoginConRetorno('/checkout')

/** Paso 1 · Datos: móvil `28:1083`, tarjeta «Tus datos» de desktop `30:2385`. */
export default function SeccionDatos({ form, visibleEnMovil }: { form: FormularioCompra; visibleEnMovil: boolean }) {
  const { t } = useTranslation()
  const { datos, cambiarDato, errores, token } = form
  const ingresar = <Link to={RUTA_INGRESAR} className="font-semibold text-hc-blue-600">{t('compra.datos.ingresar')}</Link>

  return (
    <SeccionCompra
      numero={1}
      titulo={t('compra.datos.tituloDesktop')}
      subtitulo={token ? null : <>{t('compra.datos.sinCuentaCorto')} · {t('compra.datos.yaTenesCuenta')} {ingresar}</>}
      visibleEnMovil={visibleEnMovil}
      className="gap-[16px] pt-[18px]"
    >
      <div className="flex flex-col gap-[4px] lg:hidden">
        <h2 className="font-display text-[18px] font-bold text-hc-n-900">{t('compra.datos.titulo')}</h2>
        <p className="text-[14px] leading-[20px] text-hc-n-600">{t('compra.datos.subtitulo')}</p>
      </div>
      <div className="flex flex-col gap-[16px] lg:flex-row lg:gap-[14px]">
        <CampoCompra
          id="compra-correo"
          className="lg:flex-1"
          etiqueta={t('compra.datos.correo')}
          valor={datos.correo}
          onCambiar={(valor) => cambiarDato('correo', valor)}
          icono={ICONOS_COMPRA.correo}
          pista={t('compra.datos.correoPista')}
          error={errores.correo}
          type="email"
          autoComplete="email"
        />
        <CampoCompra
          id="compra-telefono"
          className="lg:flex-1"
          etiqueta={t('compra.datos.telefono')}
          valor={datos.telefono}
          onCambiar={(valor) => cambiarDato('telefono', valor)}
          icono={ICONOS_COMPRA.telefono}
          error={errores.telefono}
          type="tel"
          inputMode="tel"
          autoComplete="tel"
        />
      </div>
      <CampoCompra
        id="compra-nombre"
        etiqueta={t('compra.datos.nombre')}
        valor={datos.nombre}
        onCambiar={(valor) => cambiarDato('nombre', valor)}
        icono={ICONOS_COMPRA.persona}
        error={errores.nombre}
        autoComplete="name"
      />
      {token ? null : (
        <p className="text-center text-[14px] text-hc-n-600 lg:hidden">
          {t('compra.datos.yaTenesCuenta')} {ingresar}
        </p>
      )}
    </SeccionCompra>
  )
}
