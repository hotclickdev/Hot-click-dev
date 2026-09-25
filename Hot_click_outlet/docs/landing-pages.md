# Landing pages de planes — estado y contexto (para retomar en otra sesión/LLM)

Fecha de este documento: 2026-09-25. Escrito a mitad de una tarea en curso —
revisar la sección "Estado al momento de escribir esto" antes de asumir que
algo ya terminó.

## Qué son estas landings

HotClick tiene 3 landings públicas de venta de planes para emprendedores/PYMEs:

| Ruta | Plan | Componente actual |
|------|------|--------------------|
| `/emprende` | Emprendedor | `frontend/src/pages/emprende/EmprendeLanding.tsx` (implementación rica, a medida) |
| `/para-emprendedores` | Emprendedor (alias) | `Navigate to="/emprende"` en `frontend/src/app/AppRoutes.tsx` |
| `/para-pymes` | PYME | `frontend/src/pages/planes/PymeLandingPage.tsx` |
| `/negocio-plus-plan` | Negocio Plus | `frontend/src/pages/planes/NegocioPlusLandingPage.tsx` |

Precios/comisión (ya correctos en `frontend/src/pages/planes/planLandingCopy.ts`,
NO tocar sin que el usuario lo pida): Emprendedor 9% por venta (mín. ₡700,
incluye pasarela), PYME y Negocio Plus 4% + mensualidad.

## El diseño de referencia es Figma

- Archivo Figma: `https://www.figma.com/design/NIPdnghS5wMAbYoH0hIEyp/Landing-pages`
- File key: `NIPdnghS5wMAbYoH0hIEyp`
- Frames (node id):
  - `40:21` — Landing Emprendedor (Desktop)
  - `18:15` — Landing Emprendedor (Mobile)
  - `7:42` — Landing PYME (Desktop)
  - `19:18` — Landing PYME (Mobile)
  - `37:24` — Landing Negocio Plus (Desktop)
  - `20:21` — Landing Negocio Plus (Mobile)

**Regla del proyecto (CLAUDE.md global del usuario):** al convertir un mockup
aprobado a código, apegarse al mockup sin libertades creativas — el mockup
gana sobre decisiones previas del código. Antes de llamar a `get_design_context`
de Figma hay que invocar el skill `figma:figma-design-to-code`.

**Regla de UI (CLAUDE.md global):** nunca emojis en componentes ni textos de
interfaz — siempre íconos SVG minimalistas. El proyecto ya tiene una librería
de íconos en `frontend/src/components/ui/TrustGlyph.tsx` (prop `tipo`, ~50
íconos disponibles). Si el mockup de Figma trae emoji literales (💰, 📦, etc.),
sustituirlos por el `TrustGlyph` más parecido.

## Patrón de arquitectura de referencia: `/emprende`

`frontend/src/pages/emprende/` es la carpeta que SÍ está bien implementada
(fiel al frame `40:21`). Cualquier landing nueva debe seguir el mismo patrón:

- Componentes por sección (Hero, ComoFunciona, PanelPreview, QueIncluye, Faq,
  CtaFinal, etc.), orquestados desde `EmprendeLanding.tsx`.
- Estilo: Tailwind + `style={{ color: 'var(--hc-text)', ... }}` con variables
  CSS del proyecto (`--hc-text`, `--hc-muted`, `--hc-primary`, `--hc-surface`,
  `--hc-border`, `--hc-font-display`, `--hc-font-mono`) más algunos hex fijos
  que vienen del propio Figma (`#fffbf5`, `#e8dcc8`, `#14171c`...).
- Texto vía `useTranslation()` / `t('emprende.xxx')`, claves en
  `frontend/src/i18n/locales/{en,es,pt}.json` bajo el namespace `"emprende"`.
- Precio/comisión: NO hardcodeado en el componente — viene de
  `PLAN_LANDING_COPY` en `planLandingCopy.ts`.

## Historial reciente (por qué esto estaba roto)

El merge `091c9734` ("Merge origin/master into local (landings 3-planes) —
resuelve build regenerado en favor de origin") revirtió sin querer varios
fixes que ya se habían hecho, todos corregidos ya en esta sesión:

1. `Usuario.java` perdió el campo `sesionesInvalidadasEn` (getters/setters
   quedaron huérfanos, el backend no compilaba). — **Corregido**, commit `2b6de687`.
2. `PasswordResetService` llamaba a un método renombrado (`revocarTodos` en
   vez de `revocarTodosDeUsuario`). — **Corregido**, mismo commit.
3. Faltaba `import java.time.Instant` en `JwtRequestFilter.java`. — **Corregido**, mismo commit.
4. `/para-emprendedores` volvió a renderizar un `EmprendedorLandingPage`
   genérico (`PlanLandingLayout`) en vez del redirect a `/emprende`. —
   **Corregido**, commit `75374b7d` (se borró el componente genérico huérfano).
5. `EmprendePanelPreview.tsx` tenía un bug real (ternario con dos ramas
   idénticas — Sonar lo marcó como BUG de Reliability) y varios detalles de
   fidelidad a Figma perdidos (rotación de tarjetas, tamaño de avatar,
   sombra, radios). — **Corregido**, commit `5744ab99`.
6. `ResetPlataformaKeepQaRunner` (vacía tiendas/productos reales dejando solo
   admin+QA) tenía `@Profile("!test")` — corría en CUALQUIER perfil menos
   test, incluido el `default` que usa el servidor de producción. Se disparó
   en un deploy real y solo no borró datos por una casualidad (falló por un
   error de esquema no relacionado, lo que abortó toda la transacción). —
   **Corregido a `@Profile("dev")`**, commit `0d6e1a14`. Esto es un hallazgo
   de seguridad/operación, no de diseño — cualquier LLM que retome este
   proyecto debe saber que ya está resuelto y NUNCA debe volver a ampliar
   ese `@Profile`.

Además, producción migró de EC2 a **Lightsail** (`18.119.201.126`) el
2026-09-25 — ver `Hot_click_outlet/MIGRACION_LIGHTSAIL.md` y la sección
"Infraestructura AWS" de `CLAUDE.md` (ya actualizada, commit `a53dc65d`).
El EC2 viejo (`18.227.68.15`) está detenido, no se usa.

## Estado al momento de escribir esto (2026-09-25, sesión en curso)

- ✅ `/emprende` — fiel a Figma, verificado.
- ✅ `/para-emprendedores` — redirige a `/emprende`, verificado y desplegado.
- 🔄 `/para-pymes` — **en construcción por un agente en paralelo** (worktree
  aislado), reemplazando `PlanLandingLayout` por una implementación a medida
  del frame `7:42`, siguiendo el patrón de `/emprende`. Carpeta nueva
  esperada: `frontend/src/pages/pyme/`.
- 🔄 `/negocio-plus-plan` — **en construcción por otro agente en paralelo**
  (worktree aislado), frame `37:24`. Carpeta nueva esperada:
  `frontend/src/pages/negocioplus/`.

**Si estás retomando esto y los dos puntos de arriba ya no dicen "en
construcción"**, significa que en algún momento se integraron (o se
abandonaron) esos cambios — revisá `git log --oneline` buscando commits
`feat(landings)` o similares para PYME/Negocio Plus, y el estado real de
`frontend/src/pages/planes/PymeLandingPage.tsx` /
`NegocioPlusLandingPage.tsx` (si siguen usando `<PlanLandingLayout .../>`,
la tarea NO se completó).

## Cómo verificar que una landing está bien hecha

1. `cd Hot_click_outlet/frontend && npx tsc --noEmit` (0 errores).
2. `pnpm build` (0 errores) — el build compilado va a `src/main/resources/static/`
   y debe commitearse junto con el código fuente (este proyecto no compila el
   frontend en el Dockerfile).
3. `pnpm test` (vitest) — no debe romper nada existente.
4. Comparar visualmente contra el screenshot de `get_design_context` del
   frame de Figma correspondiente.
5. Nunca emojis, siempre `TrustGlyph`. Nunca cambiar números de comisión/precio.

## Deploy a producción (Lightsail)

Ver `CLAUDE.md` sección "Infraestructura AWS (producción)" para el
procedimiento completo. Resumen:

```bash
ssh -i "C:\Users\pmdan\Downloads\hotclick-key.pem" ec2-user@18.119.201.126
cd /home/ec2-user/app && git pull origin master
cd Hot_click_outlet
docker build -t hot_click_outlet-app .
docker compose -f docker-compose.lightsail.yml up -d
curl -s https://hotclick.lat/api/health
```
