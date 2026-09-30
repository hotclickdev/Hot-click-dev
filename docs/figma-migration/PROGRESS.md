# Progreso de la migración Figma

Actualizado 2026-09-30. Complementa `INVENTORY.md` (qué pantallas) y `COMPONENT_OWNERSHIP.md` (quién toca qué).
Regla vigente: **nada se ha enviado a GitHub, nada se mergeó a `master`, nada se desplegó.** Todo vive en ramas locales.

## Estado general

| Etapa | Estado |
| --- | --- |
| Fase 1: auditoría e inventario | Hecha (90 pantallas) |
| Fase 2a: recuperar PR #93 | Hecha en `feat/figma/base` |
| Fase 2b: Home | Rama `feat/figma/home` con la base integrada (`98ec9abc`) y el cuerpo remedido y corregido (`6d0de288`). Los tres frames siguen en PARTIAL (ver Fase 2b) |
| Ola 0: docs en la base | Integrados (`62a631ac`) |
| Ola 1: ramas y worktrees | Creadas el 2026-09-30 desde la base: `feat/figma/{cat,prod,chk,acc,srv,sys,store,qr}`, cada una en `.claude/worktrees/<agente>` |
| Ola 1, CAT C0 (ProductCard) | **Hecho**, integrado en `base` (`9f11c9a7`). `comprador/ProductCard` 167x280; `formatPrice` global con punto (`₡6.200`). C1 a C5 sin empezar. PROD, CHK, ACC, SRV, SYS, STORE y QR **no lanzados** |
| Fase 2c: SHELL (variantes de `MainLayout`) | Integrado en `feat/figma/base` (merge `b3159c1e`, autorizado por el usuario). Base: tsc limpio, 358 tests |
| Fase 2d: análisis de `ProductCard` | Hecho, sin tocar código. Ver `PRODUCTCARD_STRATEGY.md` |
| Agentes CAT, PROD, STORE, CHK, ACC, SRV, SYS, QR | **No lanzados**, como se pidió |

## Ramas y worktrees

| Rama | Worktree | Parte de | Responsable | Commits propios | Estado |
| --- | --- | --- | --- | --- | --- |
| `feat/figma/base` | `.claude/worktrees/base` | `master` (`b355fd20`) | SUP | merge `8146495b` | Lista. No se edita: solo recibe merges del supervisor |
| `feat/figma/shell` | `.claude/worktrees/shell` | `feat/figma/base` | SHELL | `197e87a0` (sombra/footer/ícono, cherry-pick de Home), `3b54150d` (variantes), `ac69ca69` (sticky y marca centrada) | Implementada, con QA independiente e integrada en `base` (`b3159c1e`) |
| `feat/figma/home` | `.claude/worktrees/home` | `master` | HOME | `bd50a1d5`, `8c6d1e53`, merge `98ec9abc` (base), `6d0de288` (QA visual) | Base integrada y cuerpo remedido. Sin cambios sin commitear. Aún no se integra en `base` |
| `feat/figma/supervisor` | `.claude/worktrees/supervisor` | `feat/figma/base` | SUP | docs | Activa: documentación. Sus docs se mezclan en `base` |
| `feat/figma/cat` | `.claude/worktrees/cat` | `feat/figma/base` (`ba4a4171`) | CAT | `a2996613`, `579f01a7`, `9881860a` | C0 hecho e integrado en `base`. Sigue C1 a C5 |
| `feat/figma/{prod,chk,acc,srv,sys,store,qr}` | `.claude/worktrees/<agente>` | `feat/figma/base` | cada agente | ninguno | Creadas, sin iniciar. Se ponen al día con `base` (fast-forward) antes de lanzarlas |
| `feat/rediseno-comprador-fase2` | `C:\Users\pmdan\hotclick-fase2-test` | `feat/rediseno-comprador` | (PR #93) | 21 commits | **Sin modificar.** Su contenido ya está en `base` |

Topología:

```
master b355fd20
├─ feat/figma/home            (bd50a1d5, 8c6d1e53, merge 98ec9abc de base, 6d0de288)
└─ feat/figma/base            (merge 8146495b de fase2, b3159c1e de SHELL, 62a631ac de docs)
   ├─ feat/figma/shell        (197e87a0, 3b54150d, ac69ca69)
   └─ feat/figma/supervisor   (documentación)
```

Las 8 ramas de la ola 1 ya existen (ver tabla). Al lanzar un agente, su rama debe tener la base actual: si no tiene commits propios se actualiza con `git merge --ff-only feat/figma/base`.

### Worktrees viejos: no reutilizar

Hay 11 worktrees de los agentes K a P y de épicas anteriores (`.claude/worktrees/agent-*`, `agent-n-multivendedor`), más dos carpetas `agent-a6697868…` y `agent-a8c5d035…` que **no están registradas en git** y `C:\Users\pmdan\hotclick-fase2-test`. Revisión del 2026-09-30 (solo lectura):

- Ninguno tiene cambios sin commitear.
- Los 5 con commits que `master` no tiene (`a03737658`, `a389c1c53`, `a8dd1d9b6`, `add02d64e`, `aefe43907`) y `hotclick-fase2-test` tienen **0 commits que `feat/figma/base` no tenga**: su contenido ya está integrado.
- `a43e1a7dd`, `a616fba9d`, `a788de4a2`, `ab89ab36a`, `feat/correos-transaccionales-figma` y `feat/checkout-multivendedor` ya están en `master`.
- Las dos carpetas sin registrar solo ven los dos `HANDOFF_*.md` sin trackear de la raíz del repo.

No se reutilizan: los nuevos se llaman `home`, `shell`, `base`, `supervisor` y los siguientes usarán el nombre del agente. No se ha borrado nada; limpiarlos queda a tu decisión.

Hay además un stash ajeno en el repositorio (`wip-preexistente-no-mio-antes-del-rebase`). No es de este trabajo y no se tocó.

## Fase 2a: integración del PR #93

- Se hizo `git merge --no-ff feat/rediseno-comprador-fase2` sobre `master` en `feat/figma/base`.
- **Conflictos resueltos:**
  - `static/**` (521 archivos de build): se conservó la versión de `master`. Es un artefacto; el supervisor lo regenera al final.
  - `i18n/{es,en,pt}.json`, bloque `product.*`: unión de claves (`size*` de master, `restock*` de fase 2).
- Validación sobre `base`: `tsc` limpio; frontend **80 archivos / 354 tests** en verde; backend **172 clases / 1026 tests, 0 fallos, 0 errores, 15 omitidos** (leído de `target/surefire-reports`).
- El contenido de fase 2 es **solo base funcional**. Las 8 pantallas (recuperar contraseña ×3, seguimiento sin cuenta, ficha agotada, tarjeta de regalo inválida, fallo del servidor, instalar la app) pasaron a UNKNOWN: existen, falta compararlas contra Figma y migrar su UI donde difiera.
- **Defecto heredado de fase 2:** `FormularioAvisoReposicion.tsx` muestra al usuario el texto `product.restockNuevo` = "NUEVO · por programar", que es una anotación de diseño de Figma. Lo corrige PROD.

## Fase 2b: Home

- Verificados los 11 archivos modificados: 8 eran del Home y 3 del shell. Se separaron en dos commits para que SHELL pueda tomar los suyos sin conflicto.
- `feat/figma/home` partía de `master`. Se mezcló `feat/figma/base` en Home (merge `98ec9abc`). Hubo un solo conflicto, en `HeaderComprador.tsx`: se tomó la versión de la base (refactor de SHELL, que reemplaza la versión simple de Home y conserva la sombra al scrollear).
- **Corrección a mi informe anterior:** el Home no estaba en PASS. Al medir en píxeles, el header desktop medía 121 px y Figma dice 111. Lo corrigió SHELL.
- **Decisión aplicada:** el frame `9:171` es la fuente de verdad del Home desktop. `12:610` ya no es objetivo y salió de las pantallas.

### Re-medición del cuerpo de Home (commit `6d0de288`)

Método: Playwright con fuentes reales (Sora y Public Sans), desktop 1440 y móvil 390, API simulada con `context.route` (6 categorías, 4 destacados, 14 productos, historial de 4 ítems) y fotos como placeholders de color. Scripts y capturas en `%TEMP%\home-qa`, fuera del repo.

| Elemento | Figma | App antes | App ahora |
| --- | --- | --- | --- |
| Hero desktop (`9:218`), alto | 572 | 587 | **572** |
| Título h1 desktop | 420x84 | partía "estás / buscando hoy?" | **420x84**, mismo corte que Figma |
| Chips, alto | 33 | 37,5 | **33** |
| Tarjeta asistente desktop | 420x246 | filas de 41 | **246** |
| Categorías desktop (`9:340`) | h250 | h262 | **h250**; tiles 167x152 |
| Seguí donde lo dejaste (`9:379`) | h195 | h204,5 | **h195** |
| Confianza desktop (`9:510`) | h208 | h227 (texto en 3 líneas) | **h208**, cuatro columnas iguales |
| Altura total desktop | 1857 | 1916 | **1855** (2 px del ProductCard) |
| Categorías móvil | h559, tiles 152 | tiles 159 | **h559**, tiles 152 |
| Tarjeta asistente móvil (`7:210`) | 358x380 | 368 | **380** |
| Seguí móvil | h181 | h183 | **h181** |
| Header móvil scrolleado (`12:346`) | y=0, h160, sombra | — | **idéntico** |

Correcciones en archivos de Home: `HomePage.tsx`, `EncabezadoSeccion.tsx`, `TarjetaAsistente.tsx`, `FranjaConfianza.tsx`, `SeguiDondeLoDejaste.tsx`, `CategoryTile.tsx` y `Chip.tsx` (`line-height: normal`, tracking, gaps y `text-wrap`). **`Chip` también lo usan `CatalogAllView` y `ProductAgotado`**: ahora miden 33, como el componente de Figma; CAT y PROD deben tenerlo presente.

Validación: `tsc` limpio · 81 archivos / 358 tests · eslint sin hallazgos en lo tocado · `vite build` compila (salida fuera del repo, `static/` intacto). Verificado aparte por el supervisor: commit presente, worktree limpio, `tsc` y tests repetidos.

**Por qué los tres frames siguen en PARTIAL:** el código de Home mide igual que Figma, pero quedan diferencias que no son de Home:

| Pendiente | Dueño | Acción |
| --- | --- | --- |
| ~~ProductCard mide 278 y Figma 280~~ | CAT | **Resuelto en C0** (`579f01a7`): 167x280. La pastilla de marca y la línea de tienda de Figma quedan descartadas por decisión del usuario. Badge "Quedan N" verificado con datos simulados; falta con datos reales |
| ~~`formatPrice` muestra "₡6 200" y Figma "₡6.200"~~ | Decisión del usuario | **Resuelto** (`a2996613`): `formatMiles` con `Intl.NumberFormat('es-CR')` y separador de grupo cambiado a punto. Ver `CAT_C0.md` |
| FAB con isotipo y botón verde de WhatsApp flotantes sobre Home, no están en Figma | SYS | Ya listado en el inventario |
| Copy bajo "Seguí donde lo dejaste": Figma dice "Solo aparece si ya visitaste productos" (parece anotación de diseño); la app conserva "Lo último que miraste" | Decisión del usuario | Mantener el de la app salvo indicación |
| Orden de categorías: Figma fija uno, la app respeta el de la API | Decisión del usuario | Tolerar o fijar orden |
| "Desde ₡4.000 con Correos de Costa Rica…": Figma recorta en seco, la app usa puntos suspensivos con la misma geometría | Decisión menor | Dejar |

**No verificado:** fotos reales de producto y categoría, badge "Quedan N", badge del carrito, hover, foco y animación de la pregunta rotativa. Sin backend real, solo datos simulados.

## Fase 2c: SHELL

Qué entrega (API completa en `COMPONENT_OWNERSHIP.md`):

- `MainLayout` con `variante`: `raiz` (por defecto), `interna`, `marca`, `propia`; y `encabezadoEscritorio`: `completo`, `compacto`, `minimo`. Los 41 usos actuales no cambian.
- Componentes nuevos: `BarraInterna`, `BarraMarca`, `HeaderEscritorioCompacto`, `HeaderEscritorioMinimo`; utilidades `inicialesDe`, `puedeVolverAtras`; íconos `barraAtras` y `compraSeguraCandado` (descargados de Figma).
- Regla CSS `.hc-input-libre` en `index.css`: una regla global antigua forzaba `background-color` en todos los `<input>` y pintaba una franja blanca sobre los buscadores con fondo gris.

Medidas contra Figma (con las fuentes reales Sora y Public Sans cargadas):

| Elemento | Figma | App antes | App ahora |
| --- | --- | --- | --- |
| Header desktop completo (`12:809`) | 111 | 121 | **111** |
| Header desktop compacto (`30:1480`) | 79 | (no existía) | **79** |
| Header desktop mínimo (`30:2386`) | 71 | (no existía) | **71** |
| Header móvil global con chips (`12:551`) | 160 | 165 | **160** |
| Barra interna móvil (`28:1144`, `27:941`) | 51 | (no existía) | **51** |
| Barra de marca móvil (`45:2199`) | 53 | (no existía) | **53** |
| Barra inferior (`12:582`) | 67 | 71 | **67** |
| Banner + pie, móvil (`12:483` 67 + `12:489` 71) | 138 | 167 | **138** (67 + 71) |
| Banner + pie, desktop (`9:550` 84 + `9:559` 59) | 143 | 156 | **143** (84 + 59) |

Validación: `tsc` limpio · frontend 81 archivos / 358 tests (4 nuevos) · eslint sin hallazgos en lo tocado · `vite build` compila (salida fuera del repo; `static/` intacto).

No-regresión: se midieron 34 rutas reales en móvil y desktop contra `base`: 0 errores de página, 0 desbordes horizontales, ninguna redirección nueva, misma presencia de barra inferior y footer. Las únicas diferencias son las alturas corregidas a Figma y el footer móvil, ahora más corto porque se quitó "Ayuda".

**QA independiente (agente distinto, sin confiar en mi informe):** 16 casos medidos con Playwright y fuentes reales contra metadata y capturas de Figma. 14 coinciden dentro de 1 px. Hallazgos:

| # | Hallazgo | Acción | Estado |
| --- | --- | --- | --- |
| 1 | Barra de marca centrada (`29:1932`): Figma 55 / logo 26 / texto 80x21; app 53 / 28 / 84 | Variante de tamaño `centrada` y padding 14 | Corregido: 55 / 26 / 79x21 (commit `ac69ca69`) |
| 2 | El header **no era sticky** en ninguna ruta (defecto previo): `overflow-x: hidden` en `html`, `body` y el wrapper creaba un contenedor de scroll. La sombra al scrollear nunca se veía | `overflow-x: clip` en los tres | Corregido y verificado en 21 rutas x 2 viewports, incluido `/admin`: header en y=0 tras scrollear, sin desborde ni errores |
| 3 | Carrito vacío sin badge: el buscador desktop mide 822 y Figma 795 (con badge "2") | Ninguna: depende del dato | Sin acción |

Como `index.css` es global, el cambio a `clip` afecta a todo el sitio, incluidos los paneles admin. Las rutas probadas no mostraron regresión, pero la revisión visual del panel admin no se hizo.

**Estado de SHELL: integrado en `feat/figma/base` (merge local `b3159c1e`, sin push), con el usuario autorizándolo.** Una segunda pasada del QA sobre `ac69ca69` no se ha hecho; las dos correcciones las verifiqué yo con mediciones.

## Archivos bloqueados ahora

| Archivo | Bloqueado por | Hasta |
| --- | --- | --- |
| `layouts/MainLayout.tsx` y `components/comprador/header/*` | SHELL | Integración de SHELL en `base` |
| `components/comprador/ProductCard.tsx` | CAT | C0 hecho. Cambios solo vía CAT |
| `components/ui/ProductCard.tsx`, `ui/productCard/*`, `catalogoProductCard.ts` | CAT | Pasos C1 a C5 |
| `app/AppRoutes.tsx`, `static/**`, `package.json`, `pnpm-lock.yaml` | SUP | Siempre |
| `i18n/locales/*.json` | Por namespace (ver ownership) | Siempre |

## Dependencias

```
base ──► shell ──► [QA independiente] ──► integrar en base ──► ola 1
                                                   ├─ home  (merge de shell + re-medición)
                                                   ├─ cat   (C0 del ProductCard primero si otros lo necesitan)
                                                   ├─ prod, store, chk, acc, srv, sys, qr
```

## Listo para comenzar

SHELL y los docs ya están en `base`, y Home ya tiene la base mezclada y remedida. La ola 1 puede arrancar cuando el usuario lo indique. Cuando eso ocurra, cada agente arranca con: rama `feat/figma/<agente>` desde `base`, su worktree propio, su lista de pantallas del inventario, y el compromiso de convertir sus UNKNOWN en estado real **antes** de escribir código.

Prioridad sugerida dentro de la ola 1: CAT (desbloquea el `ProductCard`), luego PROD y CHK (la compra), ACC, y al final SRV, SYS, STORE y QR.

## Decisiones pendientes del usuario

| # | Decisión | Afecta a |
| --- | --- | --- |
| 1 | ~~Integrar SHELL en base~~ Hecho | Todos |
| 2 | ~~Precio tachado y badge Oferta~~ **Resuelto: se conservan, discretos** | CAT |
| 3 | ~~Ofertas HOT y pestaña Emprendimientos~~ **Resuelto: se eliminan** (ver `PRODUCTCARD_STRATEGY.md`) | CAT |
| 4 | ~~Quick view~~ **Resuelto: se elimina** | CAT |
| 5 | ~~Pastilla de marca, condición, punto de stock y línea de envío~~ **Resuelto: se descartan** | CAT |
| 6 | Limpieza de los worktrees viejos (revisados, nada sin commitear; ver la sección de worktrees) | — |
| 7 | ~~Formato de precio~~ **Resuelto: `₡6.200` global** | Home, CAT, CHK |
| 8 | ~~Copy "Solo aparece si ya visitaste productos"~~ **Resuelto: se mantiene "Lo último que miraste"**. Abierto: orden de categorías del Home | HOME |
| 9 | Columnas fijas o fluidas en el catálogo (C4): investigar con todos los frames de catálogo | CAT |

## Riesgos abiertos

- **Fase 2 llegó sin CI:** el PR #93 nunca disparó GitHub Actions. Lo validado aquí es local (tests, tipos, build). Sigue sin pasar los gates E1 a E18.
- **Conflictos de i18n** entre agentes: mitigados con namespaces, pero el riesgo de merge persiste. Gate E17 exige es/en/pt en el mismo commit.
- **Fixtures:** 76 pantallas dependen de datos (carrito, sesión, pedidos con paquetes). Sin un arnés común de datos, cada agente improvisará el suyo. Conviene un fixture compartido antes de la ola 1.
- **Medición:** la diferencia del `line-height` heredado (1,5 contra `normal` de Figma) aparece en cualquier componente nuevo. Regla para todos: comparar alturas en píxeles con fuentes reales cargadas, no solo a ojo.
- **Anotaciones de Figma:** "NUEVO · por programar" no debe llegar a la interfaz.
