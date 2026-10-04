import { Link } from 'react-router-dom'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import Input from '@/components/ui/Input'
import PhoneField from '@/components/ui/PhoneField'
import { WHATSAPP_HOTCLICK, urlWhatsApp } from '@/pages/carrito/cartHelpers'
import type { ChangeEvent, FormEvent, RefObject } from 'react'
import { MIN_PASSWORD, type RegistroEmpresaForm } from './registroEmpresaHelpers'
import { TEXTO_REVISION, textoPagarDespues, type PlanAlta } from './altaVendedorPlanes'
import { AltaTarjeta, AltaTitulo, BotonPrimario, BotonSecundario, Casilla, IconoBeneficio, Nota, PillPendiente, Spinner } from './AltaVendedorUI'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined
const HREF_WA_TRIBUTACION = urlWhatsApp(
  encodeURIComponent('Hola HotClick, quiero vender pero aún no estoy inscrito en Tributación Directa. ¿Me ayudan con el proceso de inscripción?'),
  WHATSAPP_HOTCLICK,
)

export type ConsentimientosAlta = { terminos: boolean; acuerdo: boolean }

/** Paso 2 · Tu negocio: datos del negocio y de la cuenta en un solo paso (campos Figma 28:1083). */
export default function PasoNegocio({
  plan, form, consentimientos, error, loading, turnstileRef, turnstileToken,
  onCampo, onTelefono, onTelefonoAdmin, onInscrito, onConsentimiento, onTurnstileToken,   onCambiarPlan, onAtras, onSubmit, conSesion = false,
}: {
  plan: PlanAlta
  form: RegistroEmpresaForm
  consentimientos: ConsentimientosAlta
  error: string
  loading: boolean
  turnstileRef: RefObject<TurnstileInstance | null>
  turnstileToken: string
  onCampo: (campo: keyof RegistroEmpresaForm) => (e: ChangeEvent<HTMLInputElement>) => void
  onTelefono: (v: string) => void
  onTelefonoAdmin: (v: string) => void
  onInscrito: (v: boolean) => void
  onConsentimiento: (campo: keyof ConsentimientosAlta, v: boolean) => void
  onTurnstileToken: (t: string) => void
  onCambiarPlan: () => void
  onAtras: () => void
  onSubmit: (e: FormEvent) => void
  /** Comprador ya logueado: no pide correo ni contraseña. */
  conSesion?: boolean
}) {
  const turnstileObligatorio = Boolean(TURNSTILE_SITE_KEY) && !conSesion
  const faltaConsentimiento = !consentimientos.terminos || !consentimientos.acuerdo
  const deshabilitado = loading || faltaConsentimiento || (turnstileObligatorio && !turnstileToken)

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      <AltaTitulo antes="Contanos de tu" acento="negocio" sub="Lo completás en unos minutos. Los campos opcionales los podés completar después en tu panel." />

      <div className="flex items-center gap-3 rounded-[14px] border border-hc-n-200 bg-hc-n-0 p-3.5">
        <IconoBeneficio icono="etiqueta" />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-hc-n-900">Plan {plan.nombre}</p>
          <p className="flex flex-wrap items-center gap-1.5 text-[12px] text-hc-n-600">Mensualidad y comisión: <PillPendiente /></p>
        </div>
        <button type="button" onClick={onCambiarPlan} className="text-[13px] font-semibold text-hc-blue-600">Cambiar</button>
      </div>

      <AltaTarjeta titulo="Tu negocio" sub="Así te van a encontrar los compradores.">
        <Input variante="figma" label="Nombre del negocio (obligatorio)" placeholder="Ej: Tienda Tica" autoComplete="organization"
          value={form.nombreEmpresa} onChange={onCampo('nombreEmpresa')} required maxLength={120}
          hint="Es el nombre que se ve en tu tienda y en cada producto." />
        <div className="grid gap-3.5 lg:grid-cols-2">
          <PhoneField variante="figma" label="Teléfono del negocio (opcional)" value={form.telefonoEmpresa} onChange={onTelefono} />
          <Input variante="figma" label="Correo del negocio (opcional)" type="email" placeholder="hola@tiendatica.cr" autoComplete="email"
            value={form.correoEmpresa} onChange={onCampo('correoEmpresa')} maxLength={150} />
        </div>
        <Nota>
          {plan.contactoVisible
            ? <>Lo usamos para avisarte de pedidos. Con el plan {plan.nombre}, los compradores también lo ven en tu tienda.</>
            : <>Lo usamos para avisarte de pedidos. Tus compradores ven estos datos solo si tu plan es Pyme o Negocio Plus.</>}
        </Nota>
        <Casilla id="alta-atv" checked={form.inscritoTributacion} onChange={onInscrito}>
          <strong className="font-semibold">Estoy inscrito en Tributación (ATV)</strong> y puedo emitir facturas electrónicas.
        </Casilla>
        {!form.inscritoTributacion ? (
          <p className="text-[12px] leading-[18px] text-hc-n-600">
            Podés registrarte igual y ponerte al día después.{' '}
            <a href={HREF_WA_TRIBUTACION} target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">Te ayudamos por WhatsApp</a>.
          </p>
        ) : null}
      </AltaTarjeta>

      {conSesion ? null : <AltaTarjeta titulo="Tu cuenta de acceso" sub="Con estos datos entrás a tu panel de vendedor.">
        <Input variante="figma" label="Tu nombre completo" placeholder="Ana Solís" autoComplete="name"
          value={form.nombreAdmin} onChange={onCampo('nombreAdmin')} maxLength={100} />
        <Input variante="figma" label="Tu correo (obligatorio)" type="email" placeholder="ana@correo.com" autoComplete="email"
          value={form.correoAdmin} onChange={onCampo('correoAdmin')} required maxLength={150} />
        <Input variante="figma" label="Contraseña (obligatorio)" type="password" autoComplete="new-password"
          value={form.passwordAdmin} onChange={onCampo('passwordAdmin')} required minLength={MIN_PASSWORD} maxLength={128}
          hint={`Mínimo ${MIN_PASSWORD} caracteres.`} />
        <PhoneField variante="figma" label="Tu teléfono (opcional)" value={form.telefonoAdmin} onChange={onTelefonoAdmin} />
      </AltaTarjeta>}

      <AltaTarjeta>
        <Casilla id="alta-terminos" checked={consentimientos.terminos} onChange={(v) => onConsentimiento('terminos', v)}>
          Acepto los <Link to="/terminos" target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">Términos y Condiciones</Link> y
          la <Link to="/privacidad" target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">Política de Privacidad</Link> de HotClick.
        </Casilla>
        <Casilla id="alta-acuerdo" checked={consentimientos.acuerdo} onChange={(v) => onConsentimiento('acuerdo', v)}>
          Leí y acepto el <Link to="/acuerdo-vendedores" target="_blank" rel="noopener noreferrer" className="font-semibold text-hc-blue-600">Acuerdo de Vendedores</Link> y
          mi rol como Encargado de Tratamiento de los datos de mis clientes (Ley 8968).
        </Casilla>
      </AltaTarjeta>

      <Nota titulo="¿Qué pasa después?">
        {plan.id === 'emprendedor'
          ? `Te mandamos un código a tu correo para confirmar que es tuyo. ${TEXTO_REVISION}`
          : `Te mandamos un código a tu correo para confirmar que es tuyo. Después activás el plan ${plan.nombre} en el paso 3. Si elegís «Pagar después»: ${textoPagarDespues(plan.nombre)} ${TEXTO_REVISION}`}
      </Nota>

      {error ? (
        <p role="alert" className="flex items-start gap-2 rounded-[12px] border border-hc-red-500 bg-hc-n-0 p-3 text-[13px] text-hc-n-900">
          <span aria-hidden="true" className="mt-1 h-2 w-2 shrink-0 rounded-full bg-hc-red-500" />{error}
        </p>
      ) : null}

      {TURNSTILE_SITE_KEY ? (
        <Turnstile
          ref={turnstileRef}
          siteKey={TURNSTILE_SITE_KEY}
          onSuccess={onTurnstileToken}
          onError={() => onTurnstileToken('')}
          onExpire={() => onTurnstileToken('')}
          options={{ appearance: 'invisible' as 'always' }}
        />
      ) : null}

      <div className="flex gap-2.5">
        <BotonSecundario onClick={onAtras}>Atrás</BotonSecundario>
        <BotonPrimario type="submit" className="flex-1" disabled={deshabilitado}>
          {loading ? <><Spinner />Creando tu cuenta…</> : (conSesion ? 'Registrar mi negocio' : 'Crear mi cuenta')}
        </BotonPrimario>
      </div>
    </form>
  )
}
