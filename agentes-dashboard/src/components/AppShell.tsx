'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';

const LINKS = [
  { href: '/agentes', label: 'Registro' },
  { href: '/agentes/plan', label: 'Plan 7/7' },
  { href: '/agentes/inspecciones', label: 'Inspecciones I1' },
  { href: '/agentes/hallazgos', label: 'Hallazgos' },
];

export function AppShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  return (
    <div className="shell">
      <header className="masthead">
        <div>
          <p className="kicker">HotClick · ingeniería</p>
          <h1>Sala de agentes</h1>
          <p className="lede">
            Registro durable de D1–D12, S1–S14, E1–E18, DOC1 y SCALE1. Vive en el repo
            (`agentes-dashboard/`), no en el static de Spring. Abrilo en local (puerto 43127) o en Vercel.
          </p>
        </div>
        <nav className="tabs" aria-label="Secciones">
          {LINKS.map((l) => (
            <Link key={l.href} href={l.href} aria-current={path === l.href ? 'page' : undefined}>
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      {children}
      <footer className="colophon">
        I1 no toca pago, auth ni schedulers de negocio. Semanal: workflow `inspect-agents.yml` (lunes 08:15 CR).
      </footer>
    </div>
  );
}
