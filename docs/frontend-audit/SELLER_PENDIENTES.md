# Seller frontend — pendientes (post Paso 3)

**Fecha:** 2026-09-03  
**Hecho en este commit:** Fase 0 (PWA/deploy), Fase 1 (paths/remap), Fase 2 parcial (eliminar producto), quick wins a11y/nav/Equipo/FAQ/e2e:ci, rules/skills/docs audit.

---

## P0 / P1 abiertos

| ID | Pendiente | Notas |
|----|-----------|--------|
| F3 | Design kit único | Deprecar usos nuevos de `emprendedor/ui` (`BotonPrimario`); preferir `compartido/ui` + tokens |
| F2b | Consolidar páginas Emp → compartido | Productos, Pedidos, Bodegas, Planes (wrappers thin); Eliminar ya hecho |
| F5 | Estados UX | Skeletons en listados; contrato toast + error inline consistente |
| F7 | Perf seller | Lazy de páginas dentro del área seller (hoy eager en chunk) |
| P1-08 | Sidebars asimétricas | Emp tiene Pedidos/POS/Bodegas; Seller (PYME/Plus) no — alinear descubribilidad |
| F8+ | E2E smoke | Correr Playwright wizards en CI/local; specs Escape modal / remap admin por plan |

## P2 / P3

| ID | Pendiente |
|----|-----------|
| F6 | ~~Motion polish: `RevisionMetodoCobro`; claim `layoutId` en TarjetaOpcion~~ — hecho |
| P2 | Pedidos empty → `EstadoVacioConversacional` donde falte |
| P2 | NetworkFirst `/api/productos` TTL 30m — revisar si conviene |
| P3 | MenuPage dual Entrada mobile/desktop; copy; icon maskable PWA |
| Dead code | Páginas Pos/Cobrar/Login emp unmounted — borrar o no montar |

## Fuera de alcance (no inventar)

- Módulos seller CRM / Marketing / Inventario / Ventas (solo admin hoy) — requiere decisión de producto.

## DoD roadmap (checklist)

- [x] P0 PWA/deploy mitigados
- [x] Path strategy + remap admin por plan
- [x] Eliminar producto compartido + QWs a11y/nav
- [ ] Páginas core en `compartido/` + wrappers thin (resto)
- [ ] Un kit botones/campos
- [ ] Skeletons + feedback consistente
- [ ] Lazy routes seller
- [ ] E2E seller verde en CI
- [ ] Sidebars alineadas (opcional Fase 9)

**Siguiente recomendado:** Fase 2b (Productos/Pedidos wrappers) o Fase 3 (kit UI).
