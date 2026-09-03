---
name: hotclick-seller-ux
description: >
  Guía UX/UI/motion del frontend seller HotClick (Emprendedor/PYME/Negocio Plus).
  Usar al crear o rediseñar pantallas seller, wizards, formularios, motion,
  estados loading/error/success/empty, responsive o a11y bajo
  /emprendedor|/pyme|/negocio-plus; o al tocar Productos, Pedidos, Cobro,
  Perfil, Bodegas, Equipo, Sucursales, Plan, Ayuda.
---

# HotClick Seller UX

Guía especializada para UX/UI del frontend seller. Complementa las rules
`.cursor/rules/seller-prototipo.mdc` y `.cursor/rules/hotclick-design-tokens.mdc`.

**Ámbito de rutas:** `/emprendedor`, `/pyme`, `/negocio-plus`  
**Código:** `Hot_click_outlet/frontend/src/prototipo/`

## Cuándo usar esta skill

Activar cuando la tarea involucre:

- crear o rediseñar una pantalla seller
- mejorar UX o UI
- crear o modificar wizard
- agregar motion
- mejorar formularios
- crear estados loading / error / success
- mejorar responsive
- trabajar Productos, Pedidos, Cobro, Perfil, Bodegas, Equipo, Sucursales, Plan, Ayuda
- cualquier pantalla bajo `/emprendedor`, `/pyme`, `/negocio-plus`

## Regla fundamental

ANTES DE MODIFICAR O CREAR:

1. Inspeccionar componentes existentes.
2. Inspeccionar tokens (`src/styles/hotclick-tokens.css`).
3. Inspeccionar componentes compartidos (`prototipo/compartido/`, `compartido/ui.tsx`).
4. Inspeccionar motion existente (`prototipo/compartido/motion/`).
5. Inspeccionar pantallas similares.
6. Inspeccionar el comportamiento de otros planes.

NO diseñar desde cero si ya existe un patrón reutilizable.

## Capas de experiencia

Clasificar las pantallas seller en:

### CAPA A — Crear / Editar

Ejemplos: crear/editar producto, crear bodega, crear método de cobro, invitar miembro, crear sucursal.

Usar patrones de wizard cuando la complejidad lo justifique.

### CAPA B — Confirmación / Resultado

Ejemplos: operación completada, eliminación confirmada, producto creado, invitación enviada, pago configurado.

Utilizar feedback claro. Cuando exista **PantallaExitoWizard** (`prototipo/compartido/motion/PantallaExitoWizard.tsx`), preferir reutilizarla.

### CAPA C — Listados / Gestión

Ejemplos: productos, pedidos, bodegas, equipo, sucursales.

Priorizar: jerarquía visual, búsqueda, filtros, estados vacíos, loading, error, feedback de acciones.
Usar `EntradaPagina` + `ListaStagger` / `EstadoVacioConversacional` — **no** convertir listados en wizards multi-paso.

## Wizards

Cuando exista **FormularioPorPasos** (`prototipo/compartido/FormularioPorPasos.tsx`), preferir reutilizarlo.

El wizard debe:

- indicar progreso
- evitar doble submit
- mantener CTA claro
- permitir navegación comprensible
- mostrar errores cerca del campo
- proporcionar estado de envío
- mostrar resultado exitoso

No crear otro sistema de wizard si ya existe uno funcional.

## Motion

Usar el sistema existente en `prototipo/compartido/motion/`:

- `formularioMotionTokens.ts` — **consultar valores; no inventar** (p.ej. entrada ~0.42s, slide paso ~48px, stagger ~0.09s, `SPRING_ENTRADA` / `SPRING_POP`)
- `EntradaPagina`
- `PasoAnimado`
- `ListaStagger`
- `CampoAnimado`
- `TarjetaOpcion`
- `PantallaExitoWizard`
- demás primitives del kit (`EstadoVacioConversacional`, `StepperDotLine`, …)

Usar motion para: orientar, indicar cambio de estado, reforzar jerarquía, confirmar acciones, suavizar navegación.

NO usar motion únicamente como decoración.

### Reglas de motion

`EntradaPagina` debe utilizarse **una sola vez** por nivel de pantalla.

EVITAR:

```text
EntradaPagina
  ↓ componente
  ↓ EntradaPagina
  ↓ otro componente
```

No duplicar animaciones de entrada.

NO mezclar en el mismo nodo Tailwind (`translate` / `scale`) con Framer Motion (`whileHover` / `whileTap` / `animate`). Elegir un único sistema para la transformación principal.

Respetar reduced-motion (`useReducedMotion` + CSS del kit): reducir duración, eliminar desplazamientos innecesarios, evitar springs excesivos, mantener feedback funcional.

## Estados de UI

Las pantallas con operaciones asíncronas deben considerar:

`idle` · `loading` · `success` · `error` · `empty`

No depender únicamente de Toast. Preferir error contextual + toast cuando aporte valor.

Loading: usar skeleton cuando tenga sentido. No mostrar pantallas vacías durante cargas de datos.

## Errores

Los errores deben ser: visibles, comprensibles, accionables.

Evitar mensajes técnicos como "Error 500". Preferir lenguaje humano.

Siempre que sea posible:

```text
[Qué ocurrió]
[Qué puede hacer el usuario]
```

Ejemplo: "No pudimos cargar tus productos." / "Intenta nuevamente."

## Empty states

Los estados vacíos deben explicar:

1. Qué está vacío.
2. Por qué importa.
3. Qué puede hacer el usuario.

Evitar "No hay datos." Preferir explicación orientada a la acción. Preferir `EstadoVacioConversacional` cuando aplique.

## Responsive

Mobile-first. Validar como mínimo **390px** y desktop.

Respetar: `max-w-md`, breakpoints existentes, bottom navigation, **safe-area**, targets táctiles, textos legibles, sticky CTA cuando corresponda.

No solucionar responsive únicamente reduciendo tamaños.

## Accesibilidad

Mantener como mínimo:

- labels asociados
- focus-visible
- navegación por teclado
- contraste
- botones semánticos
- estados comprensibles
- aria cuando sea necesario
- modales con Escape
- focus management en modales

No usar color como único indicador.

## Consistencia multi-plan

Antes de crear una solución específica, comparar `/emprendedor`, `/pyme`, `/negocio-plus`.

Si la experiencia es conceptualmente igual: reutilizar componente compartido.

Si cambia solamente permiso, configuración, contenido o capacidad del plan: preferir configuración antes que duplicación.

```text
compartido/ → wrapper específico → config por plan
```

## HotClick

La interfaz debe sentirse como HotClick. Respetar tokens, tipografía (Sora / Public Sans), identidad visual, jerarquía, lenguaje claro, estética comercial, confianza, movimiento.

No introducir UI genérica de SaaS, dashboard AI, purple gradient, cream cards o glassmorphism si no corresponde al Design System existente.

## Proceso obligatorio

Cuando esta skill se utilice:

1. Analizar la pantalla actual.
2. Identificar problemas.
3. Buscar componentes reutilizables.
4. Revisar tokens.
5. Revisar patrones similares.
6. Proponer la solución.
7. Implementar únicamente lo necesario.
8. Verificar responsive.
9. Verificar estados.
10. Verificar accesibilidad.
11. Verificar motion.
12. Ejecutar typecheck/tests apropiados.

NO realizar refactorizaciones no relacionadas con la tarea.

## Principio final

HotClick no debe tener "una pantalla bonita".

Debe tener una experiencia consistente, comprensible, accesible, responsive y reutilizable.

Prioridad:

```text
UX > consistencia > claridad > accesibilidad > performance > motion decorativo
```
