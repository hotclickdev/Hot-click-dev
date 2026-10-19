# S2-multinegocio · Varios emprendimientos en una cuenta (borrador)
Estado: borrador. Decisión del dueño (16/10/2026). Diseño arma flujo y maquetas; acá van historias, criterios y copy. No implementar hasta OK de historias. Se publica solo con OK escrito de HOT_CLICK.

## Reglas fijas
- Una misma cuenta puede manejar más de un emprendimiento.
- El nuevo se crea desde **Configuración del emprendimiento**, no con otro registro.
- «Crear otro emprendimiento» solo está habilitado si la cuenta **ya tiene al menos un negocio**. Un comprador sin negocio no lo ve; el backend rechaza la petición con **403**.
- Los negocios quedan **totalmente separados** y no comparten productos, pedidos, clientes, finanzas ni IBAN.
- Al iniciar sesión se elige a qué negocio entrar.
- El backend aísla cada negocio; intentar entrar a otro da **403**.
- Emprendedor nunca muestra contacto directo.
- El IBAN solo lo ven el propio negocio y el admin.
- No inventar montos.
- El nombre de negocio es único (ver historia 6).
- Se **elimina** la cédula del registro de **negocio**. El registro de **comprador** mantiene la cédula con su mensaje genérico. Checkout ONVO (cédula del pagador) y KYC de ONVO no cambian.

## Historias

### 1. Elegí tu negocio
**Como** dueño de cuenta con más de un emprendimiento, **quiero** elegir a cuál entrar al iniciar sesión, **para** no mezclar datos entre negocios.

Criterios:
- [ ] Si la cuenta tiene 2+ negocios, tras login se muestra «Elegí tu negocio» (no se entra automático a uno).
- [ ] Cada tarjeta muestra logo, nombre y plan del negocio (sin IBAN ni contacto).
- [ ] Al elegir uno, el panel carga solo datos de ese negocio.
- [ ] Si hay un solo negocio, se entra directo (sin selector).
- [ ] Backend: 403 si se pide un negocio que no es de la cuenta.

### 2. Selector «Cambiar de negocio» en el panel
**Como** vendedor, **quiero** ver el negocio activo y poder cambiarlo, **para** saber siempre en cuál estoy trabajando.

Criterios:
- [ ] El nombre del negocio activo se ve arriba en el panel.
- [ ] «Cambiar de negocio» abre la lista de mis negocios (mismo contenido que pantalla 1).
- [ ] Al cambiar, productos/pedidos/clientes/finanzas se recargan del nuevo negocio; no queda rastro del anterior en pantalla.
- [ ] El IBAN del negocio anterior no aparece en logs ni en la UI del nuevo.

### 3. Crear otro emprendimiento (Configuración)
**Como** dueño, **quiero** crear otro emprendimiento desde Configuración, **para** no volver a registrarme.

Criterios:
- [ ] La opción está dentro de Configuración del emprendimiento (no en el registro público).
- [ ] Solo se muestra y se habilita si la cuenta ya tiene al menos un negocio; si no, no aparece y el backend responde 403.
- [ ] Un paso corto explica que el nuevo queda separado (productos, pedidos, clientes, finanzas, IBAN).
- [ ] Revisión del admin: el nuevo no se muestra al público hasta que el admin lo apruebe (#39 resuelta).
- [ ] Cupo de 70: solo aplica a Emprendedor; cada Emprendedor nuevo cuenta (#40 resuelta). Si el cupo está lleno y el nuevo sería Emprendedor, mostrar `multinegocio.crear.cupoLleno` (sin prometer otro plan). El chequeo del cupo es atómico en la base.
- [ ] Planes: una cuenta puede combinar planes (Pyme + Emprendedor, varias Pyme o Negocio Plus). Cada Pyme o Negocio Plus paga su propia mensualidad (#42 resuelta; no inventar montos).
- [ ] Plan inicial del negocio nuevo: [PENDIENTE #41]; no asumir Emprendedor.
- [ ] Al crearlo, se entra al nuevo negocio (o se vuelve a «Elegí tu negocio»).
- [ ] No se copian datos del negocio origen.
- [ ] Nombre único: aplica la historia 6 (registro y multinegocio).

### 4. Estado vacío de un negocio nuevo
**Como** dueño de un negocio recién creado, **quiero** ver un vacío claro, **para** saber qué hacer primero.

Criterios:
- [ ] Sin productos: mensaje + CTA para crear el primero.
- [ ] No se muestran productos, pedidos ni clientes de otros negocios.
- [ ] Emprendedor: sin contacto directo en ninguna vista pública del vacío.

### 5. 403 «No tenés acceso a este negocio»
**Como** usuario, **quiero** un error claro si intento abrir un negocio ajeno, **para** no confundirme con un fallo genérico.

Criterios:
- [ ] Backend responde 403 (también por API directa); hay tests entre negocios de la misma cuenta y de otra.
- [ ] La UI muestra el texto de esta pantalla, con CTA a «Elegí tu negocio» o al panel permitido.
- [ ] No se filtra nombre, IBAN ni datos del negocio denegado.

### 6. No se permiten negocios duplicados
**Como** plataforma, **quiero** rechazar un negocio con el mismo nombre que otro ya existente, **para** evitar duplicados en el registro y en multinegocio.

Criterios:
- [ ] Se valida en el backend al crear un negocio (registro público y «Crear otro emprendimiento»).
- [ ] Un duplicado es el **mismo nombre de negocio**, comparado sin mayúsculas/minúsculas, sin acentos y sin espacios de más. IBAN y teléfono **no** cuentan.
- [ ] Índice único en la base sobre el nombre normalizado.
- [ ] El cupo de 70 Emprendedores se chequea de forma atómica en la base.
- [ ] El error puede decir que el nombre está en uso (los nombres son públicos). No revela a qué cuenta pertenece.
- [ ] Enfoque on-blur: si el nombre está libre, mostrar `negocio.nombreDisponible`.
- [ ] Los duplicados ya existentes se listan solo lectura para el admin; el dueño decide qué hacer con ellos.
- [ ] Nota: la cédula del comprador en el checkout ONVO se mantiene; el KYC de ONVO puede pedir identificación del lado admin. El registro de comprador mantiene la cédula con mensaje genérico; solo se quitó del registro de negocio.

## Copy (claves)

| Clave | Texto |
|---|---|
| `multinegocio.elegir.titulo` | Elegí tu negocio |
| `multinegocio.elegir.subtitulo` | ¿Con cuál querés trabajar ahora? |
| `multinegocio.elegir.entrar` | Entrar |
| `multinegocio.elegir.plan` | Plan {plan} |
| `multinegocio.panel.negocioActivo` | {nombreNegocio} |
| `multinegocio.panel.cambiar` | Cambiar de negocio |
| `multinegocio.crear.titulo` | Crear otro emprendimiento |
| `multinegocio.crear.cuerpo` | El negocio nuevo queda totalmente separado: no comparte productos, pedidos, clientes, finanzas ni IBAN con los que ya tenés. |
| `multinegocio.crear.cta` | Crear emprendimiento |
| `multinegocio.crear.planPendiente` | El plan con el que arranca lo define HotClick. [PENDIENTE #41] |
| `multinegocio.crear.cupoLleno` | Por ahora no hay cupo para un Emprendedor nuevo. Cuando se libere uno te avisamos. |
| `negocio.nombreEnUso` | Ese nombre ya está en uso. Probá con otro. |
| `negocio.nombreEnUso.ayuda` | Podés sumarle tu zona o tu especialidad. |
| `negocio.nombreEnUso.linkRegistro` | Si ese negocio es tuyo, iniciá sesión. |
| `negocio.nombreEnUso.linkMultinegocio` | Si ese negocio es tuyo, entrá desde Elegí tu negocio. |
| `negocio.nombreDisponible` | Nombre disponible |
| `multinegocio.vacio.titulo` | Tu negocio todavía no tiene productos |
| `multinegocio.vacio.cuerpo` | Empezá cargando el primero. Los datos de tus otros negocios no aparecen acá. |
| `multinegocio.vacio.cta` | Crear producto |
| `multinegocio.403.titulo` | No tenés acceso a este negocio |
| `multinegocio.403.cuerpo` | Ese emprendimiento no está en tu cuenta o no podés verlo. |
| `multinegocio.403.cta` | Ir a mis negocios |

## Preguntas al dueño
| # | Estado | Pregunta / decisión |
|---|---|---|
| 39 | Resuelta | El negocio nuevo pasa por la misma revisión del admin. |
| 40 | Resuelta | Cada Emprendedor nuevo cuenta para el cupo de 70; el cupo aplica solo a Emprendedor. |
| 41 | Abierta | ¿Con qué plan arranca el negocio nuevo? (¿se elige?) No asumir Emprendedor. |
| 42 | Resuelta | Una cuenta puede combinar planes; cada Pyme o Negocio Plus paga su propia mensualidad. No inventar montos. |
| 43 | Abierta | ¿Cada negocio elige por su cuenta la frecuencia de liquidación y el cargo de US$3? |
| 44 | Abierta | ¿Se puede borrar o transferir un negocio? |

## Notas
- Diseño: pantallas en 390 y 1440; no poner «arranca en Emprendedor» hasta #41. Cupo lleno: `multinegocio.crear.cupoLleno` sin prometer otro plan. Nombre en uso: error inline `negocio.nombreEnUso` + ayuda `negocio.nombreEnUso.ayuda`; link según contexto (`linkRegistro` en alta pública, `linkMultinegocio` dentro del panel); on-blur libre: `negocio.nombreDisponible`.
- Desarrollador: no implementar hasta estas historias + respuestas abiertas (#41, #43, #44) donde apliquen; aislamiento, tests 403, índice único de nombre normalizado y cupo atómico son criterio. «Crear otro» sin negocio previo → 403.
- QA: cambio de negocio, vacío, 403 por UI, nombre duplicado (registro y multinegocio), cupo lleno, crear otro sin negocio (403); rechazo por API lo corre Automatización en staging/CI.

## Ajustes 16/10 (equipo)
- **Cambio de negocio con la sesión abierta:** «Cambiar de negocio» no exige volver a iniciar sesión. Al elegir otro negocio, el backend emite un token nuevo que lleva solo ese negocio, y el panel se recarga entero con sus datos. Nada del negocio anterior puede quedar en pantalla ni en caché. Texto: «Entraste a {negocio}.»
- **Revisión del admin (definido):** el negocio nuevo pasa por la misma aprobación del admin y no se muestra al público hasta que lo aprueben. Texto: «Tu nuevo emprendimiento está en revisión. Te avisamos cuando esté aprobado.» #39 resuelta.
- **Cupo y planes (#40, #42):** cada Emprendedor nuevo cuenta para el cupo de 70; el cupo aplica solo a Emprendedor. Una cuenta puede combinar planes; cada Pyme o Negocio Plus paga su mensualidad. Siguen abiertos #41 (plan inicial), #43 (frecuencia de liquidación) y #44 (borrar/transferir).
- **Cédula:** se elimina del registro de **negocio**. El registro de **comprador** mantiene la cédula con mensaje genérico. Checkout ONVO y KYC de ONVO no cambian.
- **Nombre duplicado:** mismo nombre (normalizado). Ver historia 6.
- **Criterios de seguridad (DevOps):** el negocio activo sale siempre del token, nunca de un parámetro ni del body. Para cambiar de negocio se verifica primero que la cuenta sea dueña de ese negocio. Hay tests de 403 en cada endpoint de productos, pedidos, clientes, finanzas e IBAN.

## Texto de registro: correo ya registrado
- `registro.correoExistente.texto`: «Este correo ya está registrado.»
- `registro.correoExistente.link`: «Recuperar cuenta»
