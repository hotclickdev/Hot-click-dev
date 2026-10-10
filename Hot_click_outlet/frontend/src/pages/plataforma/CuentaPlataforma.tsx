import useAuthStore from '@/store/authStore'
import { useCerrarSesion } from '@/hooks/useCerrarSesion'

export default function CuentaPlataforma() {
  const nombre = useAuthStore((s) => s.userName)
  const correo = useAuthStore((s) => s.userEmail)
  const cerrarSesionCompleta = useCerrarSesion()
  const visible = nombre?.trim() || 'Administrador'

  return (
    <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(280px,0.6fr)]">
      <section className="rounded-[14px] border border-hc-n-200 bg-white p-5">
        <h1 className="mt-1 font-display text-[28px] font-extrabold leading-8">Cuenta</h1>
        <p className="mt-2 text-sm font-semibold">{visible}</p>
        <p className="mt-2 text-sm text-hc-n-600">{correo}</p>
        <p className="mt-4 rounded-xl bg-hc-blue-50 px-3 py-3 text-sm font-semibold text-hc-blue-600">Usted es el administrador de HotClick, no el usuario de una tienda.</p>
      </section>
      <section className="rounded-[14px] border border-hc-n-200 bg-white p-5">
        <h2 className="font-display text-[17px] font-bold">Sesión</h2>
        <p className="mt-2 text-sm text-hc-n-600">Al salir vuelve al ingreso. Las tiendas siguen en su propia sesión.</p>
        <button
          type="button"
          className="mt-4 h-12 w-full rounded-xl bg-hc-primary text-[15px] font-semibold text-white"
          onClick={() => cerrarSesionCompleta}
        >
          Salir
        </button>
      </section>
    </div>
  )
}
