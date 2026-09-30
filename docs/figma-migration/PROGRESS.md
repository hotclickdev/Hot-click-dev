# Progreso de la migración Figma

Actualizado 2026-09-30. Complementa `INVENTORY.md` (qué pantallas) y `COMPONENT_OWNERSHIP.md` (quién toca qué).
Regla vigente: **nada se ha enviado a GitHub, nada se mergeó a `master`, nada se desplegó.** Todo vive en ramas locales.

## Estado general

| Etapa | Estado |
| --- | --- |
| Fase 1: auditoría e inventario | Hecha (90 pantallas) |
| Fase 2a: recuperar PR #93 | Hecha en `feat/figma/base` |
| Fase 2b: mover Home a su rama | Hecha en `feat/figma/home` |
| Fase 2c: SHELL (variantes de `MainLayout`) | Implementado y autovalidado. **QA independiente: ver sección SHELL** |
| Fase 2d: análisis de `ProductCard` | Hecho, sin tocar código. Ver `PRODUCTCARD_STRATEGY.md` |
| Agentes CAT, PROD, STORE, CHK, ACC, SRV, SYS, QR | **No lanzados**, como se pidió |

## Ramas y worktrees

| Rama | Worktree | Parte de | Responsable | Commits propios | Estado |
| --- | --- | --- | --- | --- | --- |
| `feat/figma/base` | `.claude/worktrees/base` | `master` (`b355fd20`) | SUP | merge `8146495b` | Lista. No se edita: solo recibe merges del supervisor |
| `feat/figma/shell` | `.claude/worktrees/shell` | `feat/figma/base` | SHELL | `197e87a0` (sombra/footer/ícono, cherry-pick de Home), `3b54150d` (variantes) | Implementada, pendiente de QA independiente |
| `feat/figma/home` | `.claude/worktrees/home` | `master` | HOME | `bd50a1d5`, `8c6d1e53` | Commiteada. Falta integrar SHELL y volver a medir |
| `feat/figma/supervisor` | `.claude/worktrees/supervisor` | `feat/figma/base` | SUP | (docs, por commitear) | Activa: documentación |
| `feat/rediseno-comprador-fase2` | `C:\Users\pmdan\hotclick-fase2-test` | `feat/rediseno-comprador` | (PR #93) | 21 commits | **Sin modificar.** Su contenido ya está en `base` |

Topología:

```
master b355fd20
├─ feat/figma/home            (bd50a1d5, 8c6d1e53)
└─ feat/figma/base            (merge 8146495b de fase2)
   ├─ feat/figma/shell        (197e87a0, 3b54150d)
   └─ feat/figma/supervisor   (documentación)
```

Ramas por crear cuando SHELL esté integrado, desde `feat/figma/base`: `feat/figma/cat`, `prod`, `store`, `chk`, `acc`, `srv`, `sys`, `qr`, cada una en `.claude/worktrees/<agente>`.

### Worktrees viejos: no reutilizar

Hay 13 worktrees de los agentes K a P y de épicas anteriores (`.claude/worktrees/agent-*`, `agent-n-multivendedor`), más dos carpetas `agent-a6697868…` y `agent-a8c5d035…` que **no están registradas en git** y `C:\Users\pmdan\hotclick-fase2-test`. Ninguno se ha tocado ni limpiado. No se reutilizan: los nuevos se llaman `home`, `shell`, `base`, `supervisor` y los siguientes usarán el nombre del agente. Limpiarlos queda a tu decisión.

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
- `feat/figma/home` parte de `master`. Falta hacer `git merge feat/figma/shell` cuando SHELL esté integrado (el commit compartido es idéntico, no debería conflictuar).
- **Corrección a mi informe anterior:** el Home no estaba en PASS. Al medir en píxeles, el header desktop medía 121 px y Figma dice 111. Lo corrigió SHELL; el cuerpo del Home debe volver a medirse.
- **Decisión aplicada:** el frame `9:171` es la fuente de verdad del Home desktop. `12:610` ya no es objetivo y salió de las pantallas.

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

**QA independiente:** _ver resultado al final de este documento._

## Archivos bloqueados ahora

| Archivo | Bloqueado por | Hasta |
| --- | --- | --- |
| `layouts/MainLayout.tsx` y `components/comprador/header/*` | SHELL | Integración de SHELL en `base` |
| `components/comprador/ProductCard.tsx` | CAT (congelado) | Paso C0 |
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

Nada de la ola 1 empieza hasta que SHELL pase el QA independiente y se integre en `base`. Cuando eso ocurra, cada agente arranca con: rama `feat/figma/<agente>` desde `base`, su worktree propio, su lista de pantallas del inventario, y el compromiso de convertir sus UNKNOWN en estado real **antes** de escribir código.

Prioridad sugerida dentro de la ola 1: CAT (desbloquea el `ProductCard`), luego PROD y CHK (la compra), ACC, y al final SRV, SYS, STORE y QR.

## Decisiones pendientes del usuario

| # | Decisión | Afecta a |
| --- | --- | --- |
| 1 | Autorizar integrar `feat/figma/shell` en `feat/figma/base` cuando el QA pase (merge local, sin push) | Todos |
| 2 | Precio tachado y badge "Oferta" en la tarjeta nueva: ¿se conservan? | CAT |
| 3 | Sección "Ofertas HOT" del catálogo: Figma no la tiene. ¿Se conserva? | CAT |
| 4 | ¿Se elimina el Quick view (hoy no hace nada)? | CAT |
| 5 | ¿Se eliminan la pastilla de marca, la condición, el punto de stock y la línea de envío de la tarjeta antigua? | CAT |
| 6 | Limpieza de los worktrees viejos | — |

## Riesgos abiertos

- **Fase 2 llegó sin CI:** el PR #93 nunca disparó GitHub Actions. Lo validado aquí es local (tests, tipos, build). Sigue sin pasar los gates E1 a E18.
- **Conflictos de i18n** entre agentes: mitigados con namespaces, pero el riesgo de merge persiste. Gate E17 exige es/en/pt en el mismo commit.
- **Fixtures:** 76 pantallas dependen de datos (carrito, sesión, pedidos con paquetes). Sin un arnés común de datos, cada agente improvisará el suyo. Conviene un fixture compartido antes de la ola 1.
- **Medición:** la diferencia del `line-height` heredado (1,5 contra `normal` de Figma) aparece en cualquier componente nuevo. Regla para todos: comparar alturas en píxeles con fuentes reales cargadas, no solo a ojo.
- **Anotaciones de Figma:** "NUEVO · por programar" no debe llegar a la interfaz.
