import type { ComponentType, SVGProps } from 'react'
import { NavLink } from 'react-router-dom'

type IconoNav = ComponentType<SVGProps<SVGSVGElement>>

export type ItemNav = {
  to: string
  etiqueta: string
  Icono: IconoNav
  end?: boolean
  badge?: number
}

export type GrupoNav = {
  titulo: string
  items: readonly ItemNav[]
}

type Props = {
  grupos: readonly GrupoNav[]
  cuenta?: readonly ItemNav[]
  ariaLabel: string
}

function clasesItem(activo: boolean) {
  return [
    'flex items-center gap-2.5 rounded-[var(--hc-r-md)] px-3 py-2 text-sm',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--hc-focus-ring)]',
    activo
      ? 'bg-hc-surface-2 font-semibold text-[var(--hc-link)]'
      : 'font-medium text-hc-text hover:bg-hc-surface-2',
  ].join(' ')
}

function ItemNavLink({ item }: { item: ItemNav }) {
  const { Icono } = item
  return (
    <NavLink to={item.to} end={item.end} className={({ isActive }) => clasesItem(isActive)}>
      {({ isActive }) => (
        <>
          <Icono
            className={`size-4 shrink-0 ${isActive ? '' : 'text-hc-muted'}`}
            aria-hidden
          />
          <span className="min-w-0 flex-1 truncate" title={item.etiqueta}>
            {item.etiqueta}
          </span>
          {item.badge != null && item.badge > 0 ? (
            <span className="ml-auto flex size-5 shrink-0 items-center justify-center rounded-full bg-hc-primary text-[10px] font-bold text-white">
              {item.badge > 99 ? '99+' : item.badge}
            </span>
          ) : null}
        </>
      )}
    </NavLink>
  )
}

function GrupoLinks({ grupo }: { grupo: GrupoNav }) {
  return (
    <div role="group" aria-label={grupo.titulo} className="pb-4">
      <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-[0.08em] text-hc-muted">
        {grupo.titulo}
      </p>
      <div className="flex flex-col gap-0.5">
        {grupo.items.map((item) => (
          <ItemNavLink key={item.to} item={item} />
        ))}
      </div>
    </div>
  )
}

/** Nav de sidebar Figma: grupos + íconos + activo azul Click. */
export default function PrototipoSidebarNav({ grupos, cuenta, ariaLabel }: Props) {
  return (
    <nav className="flex flex-1 flex-col overflow-y-auto" aria-label={ariaLabel}>
      {grupos.map((grupo) => (
        <GrupoLinks key={grupo.titulo} grupo={grupo} />
      ))}
      {cuenta && cuenta.length > 0 ? (
        <div className="mt-auto border-t border-hc-border pt-3" role="group" aria-label="Cuenta">
          <div className="flex flex-col gap-0.5">
            {cuenta.map((item) => (
              <ItemNavLink key={item.to} item={item} />
            ))}
          </div>
        </div>
      ) : null}
    </nav>
  )
}
