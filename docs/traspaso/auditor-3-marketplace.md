# Traspaso: Auditor 3 Marketplace

Rol: auditor solo lectura del marketplace (productos, tiendas, catálogo, búsqueda, carrito). Reporta solo a Grok Bot.

En qué quedé: Fase 1 terminada sobre master aa907776. Informe: evidencia/auditor-3-marketplace/fase1-marketplace.md (2 ALTO, 5 MEDIO, 1 BAJO, 6 MEJORAS).

Ramas y PRs: ninguno. Mi rol no escribe código.

Pendientes:
- M-01 (ofertas no cobradas) asignado por Grok Bot a Dev Pagos 2: una sola función de precio efectivo en el servidor, más pruebas de checkout con oferta.
- M-02 (productos de prueba visibles en prod) espera la aprobación de Andrés.
- M-03, M-04, M-05, M-07 y M-08 salen de leer el código; falta reproducirlos en staging.
- No audité el buscador del comprador: queda fuera de mi parte.

Decisiones que conozco: los arreglos los hacen los bots Dev después de que Andrés aprueba; prod es solo lectura.

## Correcciones al README

Revisé el README en b9f241d8 (fila 133, sección "Auditor 3 Marketplace" y estado del área 3, línea 208).

### (a) Errores o datos viejos
- Fila 133: "informe en hotclick-reportes/auditoria/" es una ruta de la máquina de los bots, no del repo. La copia del informe para el repo es `docs/traspaso/evidencia/auditor-3-marketplace/fase1-marketplace.md` (si CI/CD la subió), y el original está en `/workspace/hotclick-reportes/auditoria/fase1-marketplace.md`.
- Línea 208: no pude verificar desde mi lado que el PR #337 cubra todas las correcciones del área 3. Mi informe tiene 8 (M-01 a M-08). Conviene listar cuáles cerró #337 y cuáles siguen abiertas.
- La auditoría se hizo sobre master aa907776. Todo lo que se mergeó después no está auditado.

### (b) Lo que le falta a mi reemplazo
- Alcance: productos, tiendas, catálogo, búsqueda y carrito. Solo lectura: nada de push, PRs ni cambios en prod.
- Pendientes que tiene que verificar:
  - M-01: las ofertas se muestran pero no se cobran. Se asignó a Dev Pagos 2 con una sola función de precio efectivo en el servidor.
  - M-02: 9 productos de prueba visibles en prod. Espera a Andrés.
  - M-03, M-04, M-05, M-07 y M-08 salen de leer el código. Falta reproducirlos en staging.
  - El buscador del comprador no está auditado porque abre el chat.
- Comandos para leer el código sin clonar: `gh api repos/hotclickdev/Hot-click-dev/contents/<ruta>?ref=<sha>`, o un clon temporal en /tmp con `git checkout <sha>`.
- Evidencia en prod: solo GETs anónimos con curl, sin login.
- Trampa: gitleaks no está instalado en la máquina de los bots.

### (c) Mejoras
- Agregar al README una tabla de hallazgos por área, con su estado (abierto, en PR o mergeado) y el número de PR.
- Re-auditar el área 3 sobre el master actual antes de lanzar, enfocado en verificar M-01 y M-08.
