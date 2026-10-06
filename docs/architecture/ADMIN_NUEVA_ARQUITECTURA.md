# Arquitectura objetivo del Admin de HotClick

Fecha: 5 de octubre de 2026.  
Rama: `menu-admin-nuevo`.  
Estado: diseño. No hay código, rutas ni permisos nuevos en este documento.

El inventario de pantallas y APIs está en [`AUDITORIA_MENU_ADMIN.md`](../../AUDITORIA_MENU_ADMIN.md). Este documento no lo copia. Donde los dos choquen, gana este: la consola de HotClick se diseña por dominios del negocio, y el menú actual de `/admin` queda como legado.

Así debería funcionar el Admin de HotClick durante los próximos años: una consola de la empresa operadora, separada de la consola de cada negocio, con ocho dominios, colas de decisión en el inicio, y auditoría en cada acción crítica.

---

## 1. Resumen ejecutivo

HotClick es un agregador. El visitante compra en el marketplace. El negocio recibe el neto en su wallet: productos menos comisión del plan, más el envío completo. HotClick cobra esa comisión, la mensualidad de PYME y Negocio Plus, y opera servicios propios (foto, digitalización, recolección). Si el plan Emprendedor mostrara el WhatsApp del vendedor, la venta se iría fuera y la comisión no existiría.

El Admin que hace falta es el de **quien opera HotClick**, no el de quien opera su tienda. Hoy las dos cosas viven en `/admin`, el rol `ADMIN` puede hacer todo, y el menú creció alrededor de pantallas (unas 31 entradas, un hub “Más herramientas”, links que el propio guard devuelve a Inicio).

La arquitectura objetivo tiene ocho dominios:

```text
CONSOLA HOTCLICK          /plataforma
├── Inicio                qué hay que decidir ahora
├── Negocios              el tenant es la unidad
├── Moderación            quién publica y qué se publica
├── Dinero                cobro, liquidación, suscripción
├── Operación             tickets y trabajo de campo
├── Seguridad             identidad, acceso, abuso técnico
├── IA                    cupo, costo, interruptores
└── Plataforma            reglas que cambian poco, y herramientas técnicas
```

Auditoría no es un noveno ítem del menú. Es la infraestructura que cada dominio escribe, más un historial dentro del negocio y una búsqueda para quien investiga.

La consola del vendedor sigue en `/admin` (y en `/emprendedor`, `/pyme`, `/negocio-plus`). No se le agregan dominios de plataforma.

Nada de esto se implementa en esta fase. El orden para construir módulo por módulo está en la sección 23. Un pedido posterior del estilo “implementa Moderación” debe poder hacerse sin rediseñar el resto, porque el contrato de dominio, permiso, cola y auditoría ya está cerrado aquí.

---

## 2. Modelo de negocio

### Qué es HotClick

HotClick es el operador de un marketplace en Costa Rica (colones enteros, SINPE, pasarela, Hacienda). No es el ERP del vendedor. El vendedor ya tiene su sistema: pedidos, catálogo, POS, clientes, finanzas de su tienda. La plataforma existe para que ese vendedor publique, cobre a través de HotClick y reciba su neto, y para que HotClick cobre por ese servicio.

### Entidades

| Entidad | Qué es en el negocio |
| --- | --- |
| Visitante / `USUARIO_FINAL` | Compra en el marketplace. Puede reportar un producto. |
| Negocio (`Empresa`) | El tenant. Tiene plan, estado, visibilidad de catálogo, wallet y equipo. |
| Plan | El contrato: `EMPRENDEDOR`, `PYME`, `NEGOCIO_PLUS`. Fija comisión, mensualidad, contacto directo, topes e IA. |
| Usuario del negocio | Dueño y miembros. En el JWT de membresía circulan como `EMPRENDEDOR`. |
| Producto, oferta, marca, categoría | Lo que el marketplace muestra. La categoría y la marca global son de la plataforma. El producto es del negocio. |
| Pedido y pago | La venta. El pago puede ser pasarela o SINPE con comprobante. |
| Liquidación | Cálculo por pedido: comisión del plan sobre productos, reserva de pasarela, envío íntegro al negocio. El neto se acredita al wallet. Vive en `AggregatorService`, no en una pantalla. |
| Wallet y payout | Saldo del negocio y retiro. Bajo ₡50.000 se auto-aprueba. El resto espera a plataforma. |
| Suscripción SaaS | Mensualidad del plan (PYME y Negocio Plus). Past-due es un problema de HotClick, no del P&L del vendedor. |
| Reporte de producto | La denuncia que existe hoy. No hay denuncia genérica de negocio ni de usuario. |
| Ticket de soporte | El vendedor pide ayuda. Ya tiene estado, prioridad y asignado. |
| Servicio Hot, recolección, paquete de inventario | Trabajo que hace HotClick para un negocio, no el catálogo del vendedor. |
| Uso de IA | Créditos y tokens por negocio y mes. El tope sale del plan. |
| Evento y alerta de seguridad | Login, bloqueo, IP, 2FA. No hay entidad “incidente”. |
| Auditoría admin | Quién hizo qué sobre qué entidad. Cobertura incompleta. 90 días. Sin IP. |

### Procesos críticos

1. **Admitir al vendedor.** Un negocio nace en `PENDIENTE_APROBACION`. Aprobar lo publica (`ACTIVO` + catálogo). Rechazar lo deja en `RECHAZADO`. Suspender o inactivar oculta el catálogo.
2. **Proteger la comisión.** Emprendedor no muestra contacto directo. PYME y Negocio Plus sí. Cambiar el plan cambia ingresos y lo que ve el visitante.
3. **Liquidar bien.** `neto = productos − comisión + envío`. Si el neto no entra al wallet, HotClick debe al vendedor un dinero que el comprador ya pagó. La DLQ del wallet existe para eso.
4. **Pagar al vendedor y cobrarle el plan.** Payout y suscripción son dos flujos. No son “finanzas del negocio”.
5. **Conciliar excepciones de cobro.** SINPE manual y webhooks fallidos. Lo automático (payout chico, SINPE en horario) no necesita una pantalla salvo cuando queda pendiente.
6. **Moderar el catálogo.** Ofertas, método de cobro del vendedor, testimonios y reportes de producto. A los 3 reportes pendientes el producto se pausa solo.
7. **Atender y operar.** Ticket, servicio de foto, digitalización, recolección en la GAM.
8. **Contener abuso de acceso y de IA.** IPs, cuentas, cupo de Claude.

### Mapa conceptual (el que sí corresponde)

```text
HOTCLICK (empresa operadora)
├── Negocios (tenants)
│     ├── Plan y estado
│     ├── Equipo
│     ├── Catálogo publicado
│     └── Wallet
├── Marketplace (lo que ve el visitante: home, categorías, marcas, cupones)
├── Liquidación (automática por pedido)
├── Cobro al comprador (pasarela, SINPE)
├── Cobro al vendedor (suscripción)
├── Pago al vendedor (payout)
├── Confianza del catálogo (moderación)
├── Confianza del acceso (seguridad)
├── Atención y campo (soporte, servicios, recolección, digitalización)
├── IA (cupo del plan)
└── Reglas de plataforma (planes, flags, país)
```

La consola del negocio (POS, productos, clientes, su propia billetera) cuelga del tenant. No cuelga de esta consola.

---

## 3. Problemas del Admin actual

El menú de plataforma está en `buildAdminItLinks` (`Hot_click_outlet/frontend/src/layouts/admin/adminItJobs.ts`). Funciona como lista de pantallas heredadas.

- **Dos productos en un prefijo.** `/admin` es la consola de plataforma si el rol es `ADMIN` y el sistema del vendedor si el rol es `EMPRENDEDOR`. El operador y el vendedor comparten chrome, redirects y nombres (“finanzas”, “ads”, “clientes”).
- **El inicio no decide.** `SuperAdminHome` muestra tiendas activas, vendedores, productos y ventas. La cola real ya existe en `GET /api/admin/moderacion/resumen` y no está en ese inicio.
- **El menú esconde y duplica.** “Más herramientas” repite el sidebar y enlaza garantías y clientes, que el `ADMIN` no puede abrir. `/admin/ads` está en el menú de plataforma y el guard de ops de tienda lo devuelve a Inicio. Cotizaciones y publicaciones están bajo superadmin y a la vez bloqueadas como ops de tienda.
- **Configuración que no configura.** Política de moderación y métodos de pago son listas fijas en `prototipo/admin/adminData.ts`. No se persisten.
- **Un rol para todo.** `SUPPORT`, `FINANCE` y `TRUST` se inactivaron en `V135` y se remapean a `ADMIN`. `ROLES_STAFF` está vacío. Tres permisos `global.*` existen y no separan personas.
- **Moderación es una bandeja, no una mesa.** Se aprueba y se rechaza. No hay caso, responsable ni reincidencia. La pestaña de productos es drenaje de solicitudes viejas.
- **Dinero partido en nombres parecidos.** Pagos, retiros, suscripciones SaaS y “finanzas” del vendedor no son la misma cola. La comisión no tiene pantalla porque el cálculo es automático; el menú tampoco explica el desglose.
- **Seguridad es un archivo de ocho pestañas.** Eventos y alertas sí están persistidos. Incidente, no. Sentry comparte nivel con Alertas.
- **Auditoría no alcanza para investigar.** No guarda IP. No registra suspensión, cambio de plan, visibilidad, flags ni IA. A los 90 días se borra. Parte de las filas las escribe el vendedor (`PEDIDO_CAMBIO_ESTADO`).
- **Fiscal colgado del JWT.** Facturas y config fiscal usan la empresa de la sesión, no los libros de todos los negocios.
- **Lo técnico está mezclado con la operación.** Observabilidad, tamaño de base y Sentry viven al lado de aprobar un negocio.

El código de esas pantallas, en su mayoría, llama API de verdad. El problema es el modelo de la consola, no un montón de mockups.

---

## 4. Principios de la nueva arquitectura

1. **Primero el trabajo, después la pantalla.** Un ítem existe si un operador toma una decisión o ejecuta una acción de HotClick.
2. **La unidad es el negocio.** Listas, colas y fichas parten del tenant. A 100.000 negocios no se carga “todos” en el cliente.
3. **Cola antes que tablero.** El inicio y cada dominio abren por lo pendiente. El histórico y el KPI van detrás.
4. **Ocho dominios, no treinta links.** El submódulo es una vista del dominio (pestaña, filtro, ficha). No es un ítem nuevo del sidebar.
5. **Plataforma y negocio no comparten shell.** Consola HotClick en `/plataforma`. Consola del vendedor en `/admin`.
6. **No se crea una pantalla sin API.** Lo que no existe (caso, incidente, tope de IA editable, denuncia de usuario) se nombra como evolución y no se dibuja vacío.
7. **La automatización no se administra en un cron.** Se administra por su excepción: payout sobre el umbral, SINPE pendiente, wallet en DLQ, producto pausado a los 3 reportes.
8. **Separar confianza de catálogo y confianza de acceso.** Moderación pausa contenido. Seguridad bloquea identidad o red.
9. **El permiso es `dominio.accion`.** `ADMIN` puede todo solo mientras haya una persona. El vocabulario ya deja partir equipos sin renombrar pantallas.
10. **Toda acción crítica queda escrita** en la auditoría que ya existe, antes de considerar el módulo cerrado.
11. **Lo técnico no es el menú del operador.** Observabilidad, Sentry, RAG, resets y actuator viven detrás de `platform.ops`.
12. **El legado se apaga al final.** Las rutas viejas siguen como deep link hasta que el dominio nuevo las cubra. No se borra una capacidad porque la pantalla esté mal ubicada.
13. **Un módulo se puede construir solo.** Dominio, permiso, cola, ficha, auditoría y deep link quedan definidos aquí. Implementar “Moderación” no rediseña Dinero.

---

## 5. Dominios administrativos

### Inicio

Objetivo: mostrar solo lo que pide una decisión hoy.  
Problema: el operador no tiene una sola cola.  
Usuario: cualquiera que opere la consola. Con el tiempo, cada persona ve las colas de sus permisos.  
Acciones: abrir el ítem en su dominio. El inicio no aprueba ni suspende por su cuenta.  
Información: conteos y los primeros ítems de cada cola, con antigüedad.  
Criticidad: P0.  
Dependencias: resumen de moderación, alertas de seguridad, billing past-due. Esas APIs existen.  
Submódulos: ninguno. Es un agregador de lectura.  
No pertenece: ventas totales, cantidad de vendedores, tamaño de base, costo de IA del mes, reglas de política.  
Evolución: cuando exista asignación, “lo mío” y “sin dueño en mis dominios”. Hasta entonces, colas globales.

### Negocios

Objetivo: admitir, suspender y entender un tenant sin convertirse en su POS.  
Problema: el negocio es la unidad comercial y hoy su ficha está bien, pero el alta vive en otra pantalla y suspender no queda auditado.  
Usuario: operador de cuentas. Más adelante, quien tenga `business.read`. Suspender e impersonar, no.  
Acciones: buscar, filtrar por estado y plan, cambiar estado y plan, visibilidad, ver equipo, entrar a “ver como negocio”.  
Información: identidad, plan, estado, visibilidad, señales (reportes, past-due, cupo de IA, tickets abiertos).  
Criticidad: P0.  
Dependencias: `EmpresaAdminService`, impersonación, auditoría.  
Submódulos: Todos, Pendientes, Suspendidos, Ficha. “En riesgo” no es un estado nuevo: es un filtro cuando haya señales (reportes, past-due, alerta).  
No pertenece: editar el catálogo como vendedor, POS, la cola de moderación completa, bloquear una IP.  
Evolución: filtro de riesgo, historial de auditoría en la ficha, paginación de verdad si el listado sigue trayendo todo.

### Moderación

Objetivo: decidir qué se publica y qué se retira, con rastro de la decisión.  
Problema: hay varias colas (negocio, oferta, cobro, testimonio, reporte) y ninguna es un caso.  
Usuario: moderador (`moderation.resolve`). Hoy, `ADMIN`.  
Acciones: aprobar, rechazar, resolver reporte, pausar producto, dejar nota.  
Información: qué, quién lo originó, cuándo, motivo, evidencia, estado.  
Criticidad: P0 la bandeja actual. P2 el caso con responsable.  
Dependencias: solicitudes de aprobación, reportes de producto, resumen. Recolección, SINPE y payout se enlazan si están pendientes, y se resuelven en su dominio (Operación o Dinero).  
Submódulos: Cola, Reportes de producto, Decisiones.  
No pertenece: bloquear IPs, pagar un retiro, editar la comisión, la política estática que no se guarda.  
Evolución: caso (prioridad, responsable, en revisión, reincidencia). Denuncia de negocio o de usuario solo cuando exista un flujo de visitante que las cree. No antes.

### Dinero

Objetivo: que el comprador pague, el vendedor reciba su neto y HotClick cobre el plan.  
Problema: tres colas reales están en tres pantallas con nombres que se confunden con las finanzas del vendedor. La comisión no se “administra” cada día: se calcula.  
Usuario: finanzas (`finance.read`, `finance.approve`).  
Acciones: confirmar o rechazar SINPE, revisar webhook, aprobar o rechazar payout, abrir la suscripción past-due, ver un neto que no se acreditó (DLQ).  
Información: bruto, comisión SaaS, reserva de pasarela, envío, neto, estado del payout, estado de la suscripción.  
Criticidad: P0 las tres colas. P2 el desglose de liquidación en la ficha. P3 libros fiscales.  
Dependencias: pagos admin, wallet payouts, billing de plataforma, `AggregatorService` (lectura).  
Submódulos: Cobros, Liquidaciones (payouts), Suscripciones.  
No pertenece: finanzas, billetera y reporte contable del vendedor; la tasa de comisión (vive en Plataforma > Planes); facturas de un solo JWT hasta investigar.  
Evolución: conciliación (pedido pagado sin crédito de wallet). Libros (D-105, factura electrónica) si el scope es HotClick como empresa, no el tenant de la sesión.

### Operación

Objetivo: cumplir lo que HotClick le promete al negocio y responder cuando se atasca.  
Problema: soporte, servicios, recolección y digitalización son el mismo equipo hoy y están regados en el menú.  
Usuario: soporte y campo. Se parten luego con `support.handle` y `operations.field`.  
Acciones: asignar y resolver ticket; cambiar estado de un servicio; tarifar o rechazar recolección; armar y cerrar un paquete de inventario para un negocio.  
Información: negocio, prioridad (el ticket ya la tiene), estado, nota, responsable (el ticket ya lo tiene).  
Criticidad: P1. El negocio puede vender sin esta cola un día; no puede quedar sin dueño una semana.  
Dependencias: tickets, servicios, recolecciones, paquetes de inventario.  
Submódulos: Atención (tickets), Campo (servicios, recolección, digitalización).  
No pertenece: el POS del vendedor, la cola offline del navegador de la caja, garantías del comprador de una tienda.  
Evolución: una sola bandeja con tipo, cuando el volumen obligue. Hasta entonces, dos submódulos alcanzan.

### Seguridad

Objetivo: ver qué se bloqueó, qué parece abuso de acceso y qué cuenta hay que cerrar.  
Problema: el centro existe y abre por un tablero de ocho pestañas, con Sentry al mismo nivel que una alerta.  
Usuario: seguridad (`security.read`, `security.block`) o superadmin.  
Acciones: resolver alerta, bloquear o desbloquear IP, revisar sesiones y eventos de una cuenta, bloquear usuario (eso escribe también en Usuarios).  
Información: evento (qué, quién, IP, user-agent, cuándo), alerta, bloqueo.  
Criticidad: P1 de presentación. La recolección de eventos ya corre.  
Dependencias: `SecurityAuditLog`, `SecurityAlert`, IPs bloqueadas, sesiones.  
Submódulos: Alertas, Bloqueos, Cuentas, Evidencia (eventos y sesiones).  
No pertenece: pausar un producto por denuncia, Sentry como trabajo diario, cambiar la comisión.  
Evolución: incidente (abrir desde una alerta, dueño, cierre). No es una pantalla hasta que la alerta no alcance.

### IA

Objetivo: saber si la IA cuesta, quién la gasta y poder apagarla en un negocio.  
Problema: el uso es real (llamadas y tokens por negocio y mes) y el panel no administra el tope. El USD es una estimación, no un cargo.  
Usuario: quien mira margen (`ai.read`) y superadmin para apagar (`ai.configure`).  
Acciones hoy: leer cupo contra uso, apagar chat público o copilot por negocio.  
Acciones que no existen: editar el tope fuera del plan, corte por abuso persistido, elegir modelo en la UI.  
Información: créditos, tokens, límite del plan, costo estimado, flags.  
Criticidad: P1 de lectura. P3 el tope editable.  
Dependencias: `hot_click_ai_uso_tb`, `AiQuotaService`, flags.  
Submódulos: una sola vista (por negocio, con total del mes). No cinco rutas (overview, consumo, costos, límites, modelos).  
No pertenece: el chat del vendedor (`/admin/copilot`), el prompt, observabilidad general.  
Evolución: alerta persistida al cruzar un umbral, tope excepcional por negocio, desglose por función (copilot, chat público) si el registro llega a distinguirlo.

### Plataforma

Objetivo: cambiar reglas que afectan a todos, y guardar lo técnico lejos del operador.  
Problema: categorías, flags, país, comisión y observabilidad están mezclados con la operación diaria.  
Usuario: superadmin (`platform.configure`). Ingeniería (`platform.ops`) para lo técnico.  
Acciones: editar home, categorías, marcas y cupones; cambiar precio, comisión y topes de un plan; flags; país, moneda e IVA; leer salud del sistema.  
Información: el plan es la fuente de la comisión y del cupo de IA. Flags por negocio.  
Criticidad: P1 apariencia y planes. P2 técnico.  
Dependencias: homepage, categorías, marcas, cupones, planes, flags, multipaís, observabilidad.  
Submódulos: Apariencia, Planes, Técnico.  
No pertenece: aprobar un negocio, pagar un payout, la política de moderación que no se guarda, métodos de pago dibujados y no persistidos.  
Evolución: reglas de moderación el día que sean datos (umbral de reportes, precio mínimo) y no copy. Otro país o moneda entra por Planes y por Multipaís, que ya existe, sin un dominio nuevo.

Usuarios de la plataforma (bloquear, rol, borrar) viven como submódulo de Plataforma > Accesos, no como dominio. Es una acción rara y peligrosa. El equipo de un negocio se administra en la ficha del negocio.

---

## 6. Arquitectura propuesta

```text
CONSOLA HOTCLICK                         /plataforma
│
├── Inicio                               P0   lectura de colas
│
├── Negocios                             P0
│   ├── Todos
│   ├── Pendientes                       estado PENDIENTE_APROBACION
│   ├── Suspendidos                      SUSPENDIDO + INACTIVO + RECHAZADO
│   └── Ficha /:id
│         ├── Resumen
│         ├── Actividad                  señales, no el POS
│         ├── Equipo
│         ├── Dinero del tenant          suscripción + último neto, enlace
│         ├── Historial                  auditoría de ese negocio
│         └── Ver como negocio
│
├── Moderación                           P0
│   ├── Cola                             negocios, ofertas, cobro, testimonios
│   ├── Reportes                         ReporteProducto
│   └── Decisiones                       filtro de auditoría
│
├── Dinero                               P0
│   ├── Cobros                           SINPE, webhooks, pagos
│   ├── Liquidaciones                    payouts
│   └── Suscripciones                    saas-billing
│
├── Operación                            P1
│   ├── Atención                         tickets
│   └── Campo                            servicios, recolección, digitalización
│
├── Seguridad                            P1
│   ├── Alertas
│   ├── Bloqueos
│   ├── Cuentas
│   └── Evidencia
│
├── IA                                   P1   una vista
│
└── Plataforma                           P1 / P2
    ├── Apariencia                       home, categorías, marcas, cupones
    ├── Planes                           precio, comisión, topes, IA del plan
    ├── Accesos                          usuarios de plataforma
    └── Técnico                          flags, multipaís, observabilidad
                                          (Sentry y jobs solo con platform.ops)
```

| Sección | Propósito | Prioridad | Rol futuro | Permiso | Reutiliza | Reconstruye la pantalla | Quita del legado |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Inicio | Decisiones de hoy | P0 | todos los operadores, filtrado por permiso | el de cada cola | resumen, security dashboard, billing | sí | KPIs de vanidad |
| Negocios | Ciclo de vida del tenant | P0 | cuentas | `business.*` | empresas y ficha | la navegación y el historial | no la API |
| Moderación | Publicar o retirar | P0 | moderador | `moderation.*` | aprobaciones y reportes | la entrada única | pestaña producto como cola viva |
| Dinero | Excepciones de dinero | P0 | finanzas | `finance.*` | pagos, payouts, billing | el grupo | “finanzas” del vendedor |
| Operación | Ayuda y campo | P1 | soporte / campo | `support.handle`, `operations.field` | tickets, servicios, recolecciones, paquetes | el grupo | cola offline |
| Seguridad | Acceso y abuso | P1 | seguridad | `security.*` | Security Center | el orden de pestañas | Sentry en el primer nivel |
| IA | Costo y corte | P1 | superadmin | `ai.*` | ai-control y flags de IA | la lectura | no el copilot del vendedor |
| Plataforma | Reglas y técnica | P1–P2 | superadmin / ingeniería | `platform.configure`, `platform.ops` | CMS, planes, flags, multipaís, observabilidad | el agrupamiento | política y métodos estáticos |
| Auditoría | Rastro | transversal | quien investiga | `audit.read` | tabla y API actuales | huecos de escritura | no la tabla |

Deep link estable, aunque el chrome cambie:

| Concepto | Destino nuevo | Ruta que ya existe y se conserva |
| --- | --- | --- |
| Ficha de negocio | `/plataforma/negocios/:id` | `/admin/empresas/:id` |
| Cola de moderación | `/plataforma/moderacion` | `/admin/aprobaciones` |
| Reporte | `/plataforma/moderacion/reportes` | `/admin/reportes-producto` |
| Cobros | `/plataforma/dinero/cobros` | `/admin/pagos` |
| Liquidaciones | `/plataforma/dinero/liquidaciones` | `/admin/payouts` |
| Suscripción | `/plataforma/dinero/suscripciones/:id` | `/admin/saas-billing/:id` |
| Ticket | `/plataforma/operacion/atencion` | `/admin/soporte` |
| Seguridad | `/plataforma/seguridad` | `/admin/security` |
| IA | `/plataforma/ia` | `/admin/ai-control` |
| Planes / flags | `/plataforma/plataforma/planes` | `/admin/superadmin` y datos de `Plan` |

Hasta el fase 11, la ruta vieja sigue abriendo la capacidad. La ruta nueva es alias o shell. No se rompe un bookmark en el primer corte.

---

## 7. Navegación

### Desktop

Sidebar fijo con los ocho nombres. El ítem activo abre el dominio. Los submódulos son pestañas o una lista secundaria **dentro** del canvas, no más íconos en el sidebar. Un badge en Inicio, Moderación, Dinero y Operación muestra el pendiente de ese permiso.

### Mobile

Barra inferior: Inicio, Negocios, Moderación, Dinero. Esas cuatro son las colas diarias. Operación, Seguridad, IA y Plataforma están en una hoja “Dominios”, cada una con su nombre y su badge. Eso no es “Más herramientas”: no mezcla marcas, garantías y clientes. No esconde una función detrás de un título vacío.

### Breadcrumbs

`Consola / Dominio / Submódulo / Entidad`. Ejemplo: `Consola / Negocios / Ficha / Taller Sol`. En la ficha, el breadcrumb vuelve al filtro de donde se vino (Pendientes, no siempre Todos).

### Context switch

Un control global, visible en todo momento, con dos valores y solo uno activo:

- **HotClick** → `/plataforma`
- **Un negocio** → la consola del vendedor

Si el operador entra a “ver como negocio”, el switch muestra el nombre del negocio y la leyenda de que la sesión es de administrador. Salir vuelve a la ficha en `/plataforma`, no al menú del vendedor. El vendedor nunca ve el switch hacia HotClick.

### Búsqueda global

Un campo en el header. Primera versión: negocio por nombre, slug o cédula, y usuario de plataforma por correo. No busca productos de todo el marketplace (eso es del vendedor y del buscador público). Cuando exista el caso, el mismo campo encuentra el id de caso.

### Acciones rápidas

Solo verbos que el permiso permite y que ya tienen API: aprobar negocio, suspender, abrir payout, resolver alerta. Viven en la ficha o en la fila de la cola, no en un menú suelto del header. Suspender pide motivo (texto que va al detalle de auditoría).

### Notificaciones

No es un producto nuevo. El badge del dominio es la notificación. Un banner persistente solo para alerta de seguridad crítica o wallet en DLQ. No hay un inbox paralelo al de soporte.

### Command palette

Tiene sentido a partir de unos cinco operadores, no antes. Misma búsqueda global más “ir a Liquidaciones”. P3. No bloquea el shell.

### Deep links

Toda fila de cola y toda ficha tienen URL. Copiar el enlace abre el mismo ítem para otro `ADMIN`. Los alias `/admin/empresas/:id`, `/admin/aprobaciones`, etc. se mantienen hasta la fase 11.

### Vacíos

Cola en cero: “Nada pendiente” y la última decisión, no una ilustración genérica ni un KPI de relleno. Lista de negocios vacía: el alta todavía no existe, con enlace a la búsqueda. Error de API: el dominio muestra el fallo en su sitio. No se traga el error.

### Permisos en la navegación

El sidebar pinta un dominio si la persona tiene al menos un `read` de ese dominio. `ADMIN` ve los ocho. Quien solo tiene `finance.read` ve Inicio (solo colas de dinero) y Dinero. No ve Seguridad “deshabilitado”: no lo ve.

### Acciones críticas en la navegación

Suspender, impersonar, borrar usuario, cambiar comisión del plan y bloquear IP no están en el header global. Están en la ficha, con nombre de la acción y motivo. La comisión del plan, otorgar `ADMIN` y borrar un negocio quedan marcados para doble autorización cuando exista más de un operador (sección 8). Hoy, con una sola persona, la auditoría es el control.

---

## 8. Roles

No se crean roles en código ahora. Este es el mapa para cuando el equipo deje de ser una persona. Los nombres son responsabilidades. La implementación debe colgar de permisos, no de ocho enums rígidos, para no repetir el ciclo de `SUPPORT` / `FINANCE` / `TRUST` (existieron, se apagaron en `V135`, todo volvió a `ADMIN`).

| Responsabilidad | Ve | Hace | No hace |
| --- | --- | --- | --- |
| Superadmin | los ocho dominios | todo, incluido plan, comisión, flags, borrar, impersonar, otorgar acceso | — |
| Operador de cuentas | Negocios, Inicio de esos conteos | leer, cambiar visibilidad, notas | suspender, impersonar, cambiar plan |
| Moderador | Moderación | resolver cola y reportes | dinero, IPs, planes |
| Finanzas | Dinero | SINPE, payout, ver suscripción | cambiar la tasa de comisión, suspender |
| Soporte | Operación > Atención, ficha en lectura | asignar y resolver tickets | campo, si no tiene el otro permiso |
| Campo | Operación > Campo | servicios, recolección, paquetes | payouts |
| Seguridad | Seguridad, y bloqueo de usuario | alertas, IPs, sesiones | moderar productos, planes |
| Ingeniería | Plataforma > Técnico | observabilidad, Sentry | suspender, payout, impersonar |

“Administrador de negocios” no es un noveno rol: es operador de cuentas más, si se le confía, `business.suspend`. “Administrador técnico” es ingeniería con `platform.ops`.

### Acciones con doble autorización (cuando haya dos superadmins)

- Cambiar `comisionPorcentaje` o el mínimo de un plan.
- Otorgar rol `ADMIN` o cualquier permiso `platform.configure` / `security.block` / `business.impersonate`.
- Borrar un negocio o un usuario de plataforma.

Hasta entonces, una sola persona puede hacerlas y **deben** quedar en auditoría. No se bloquea la operación de hoy por un flujo de dos firmas que nadie puede completar.

### Siempre auditadas, aunque las haga una sola persona

Suspender, reactivar, cambiar plan, cambiar visibilidad, aprobar o rechazar negocio, resolver reporte, pausar producto, aprobar o rechazar SINPE, aprobar o rechazar payout, impersonar (inicio y fin), bloquear IP, bloquear usuario, cambiar rol, cambiar flag, cambiar cupo o interruptor de IA, cambiar comisión.

---

## 9. Permisos

Estrategia: `dominio.accion`. El rol es una bolsa de permisos. El menú y el API preguntan por la acción, no por el nombre del rol.

Conviven con lo que ya existe, sin migrar todavía:

| Permiso nuevo | Cubre el trabajo de | Permiso viejo más cercano |
| --- | --- | --- |
| `business.read` | listar y abrir ficha | `global.companies` |
| `business.update` | visibilidad, datos de ficha | `global.companies` |
| `business.suspend` | `SUSPENDIDO` / `INACTIVO` / volver a `ACTIVO` | solo `ADMIN` hoy |
| `business.impersonate` | ver como negocio | solo `ADMIN` hoy |
| `moderation.read` | ver cola y reportes | `global.approvals` |
| `moderation.resolve` | aprobar, rechazar, resolver, pausar | `global.approvals` |
| `finance.read` | ver cobros, payouts, suscripciones, desglose | `global.metrics` |
| `finance.approve` | SINPE y payout manual | `global.metrics` |
| `support.handle` | tickets | el link dice `global.companies` y la ruta exige `ADMIN` |
| `operations.field` | servicios, recolección, digitalización | `global.companies` |
| `security.read` | eventos, alertas, sesiones | solo `ADMIN` |
| `security.block` | IP, sesión, usuario | solo `ADMIN` |
| `ai.read` | consumo y costo estimado | solo `ADMIN` |
| `ai.configure` | flags de IA | solo `ADMIN` |
| `platform.configure` | planes, comisión, apariencia, país, accesos | solo `ADMIN` |
| `platform.ops` | observabilidad, Sentry, jobs | solo `ADMIN` |
| `audit.read` | búsqueda e historial | solo `ADMIN` |

Reglas del contrato:

- El frontend esconde. El backend autoriza. Un deep link sin permiso responde 403, no redirige a Inicio en silencio (el fallo actual de ads).
- `ADMIN` implica todos los permisos mientras no haya staff. No hace falta sembrar las filas para una sola persona.
- Impersonar no arrastra `business.suspend` ni `finance.approve` dentro de la sesión de vendedor. Eso ya es cierto a medias: el JWT impersonado es `EMPRENDEDOR` sin permisos globales. Hay que mantenerlo.
- No se crea `global.security` ni una tabla nueva en la fase del shell. El vocabulario vive en este documento y, cuando se implemente el shell, en tipos de TypeScript. La base espera a la fase de staff (P3).

---

## 10. Home

El home responde “qué necesita atención ahora”. Cada fila es una acción. El número sin verbo no entra.

| Fila | Pregunta | Decisión | API que ya existe | Permiso para verla |
| --- | --- | --- | --- | --- |
| Negocios por aprobar | ¿Quién espera publicar? | Abrir la cola y aprobar o rechazar | resumen `empresas` | `moderation.read` |
| Ofertas y cuentas de cobro | ¿Qué publicación o método espera? | Resolver en la cola | resumen `ofertas`, `cuentasCobro` | `moderation.read` |
| Reportes de producto | ¿Hay denuncia abierta? | Resolver, descartar o pausar | resumen `reportesProducto` | `moderation.read` |
| Testimonios pendientes | ¿Se publica la reseña? | Aprobar o rechazar | resumen `testimonios` | `moderation.read` |
| SINPE pendiente | ¿El comprobante es real? | Confirmar o rechazar | resumen `sinpe` | `finance.read` |
| Retiros por encima del umbral | ¿Pagamos este payout? | Aprobar o rechazar | resumen `payouts` | `finance.approve` |
| Suscripciones past-due | ¿Este negocio sigue debiendo el plan? | Abrir su billing | listado saas-billing | `finance.read` |
| Alertas de seguridad | ¿Hay abuso de acceso sin cerrar? | Resolver o bloquear | `GET /api/security/dashboard` | `security.read` |
| Tickets sin resolver, prioridad alta | ¿Un negocio está trabado? | Asignar o resolver | inbox de soporte | `support.handle` |
| Wallet en DLQ | ¿Una venta pagada no se acreditó? | Reintentar o escalar | la DLQ ya existe en backend; la pantalla de lista hay que confirmarla al implementar | `finance.read` |

No van al home: “4.231 negocios”, ventas totales, productos publicados, costo de IA, tamaño de Postgres, embudo como gráfico principal. El embudo (`GET /api/admin/embudo`) puede ser una línea secundaria (“el checkout cayó esta semana”) porque informa una decisión de producto, no una moderación. Si no cabe en una frase con verbo, se queda en Plataforma > Técnico.

Con una persona, el home muestra todas las filas que `ADMIN` puede ver. Con equipos, cada persona ve las suyas. No hay un segundo dashboard.

---

## 11. Negocios

### Lista

Filtros de estado que el modelo ya tiene. No se inventan En revisión, Restringido ni Bloqueado.

| Vista | Estado real |
| --- | --- |
| Pendientes | `PENDIENTE_APROBACION` |
| Activos | `ACTIVO` |
| Suspendidos | `SUSPENDIDO`, `INACTIVO`, `RECHAZADO` |
| Todos | sin filtro de estado |

Filtros adicionales: plan, visibilidad pública, texto (nombre, slug). “En riesgo” es un filtro guardado, no un estado: past-due, reportes de producto abiertos, o alerta de seguridad asociada al correo del dueño. Si uno de esos datos no está en el listado, el filtro espera a que el endpoint lo traiga. No se calcula descargando todas las empresas al navegador.

La lista pagina en el servidor. Si hoy `getEmpresas` devuelve el conjunto completo, la fase de Negocios lo corta antes de hablar de 10.000 tenants.

### Ficha

| Bloque | Qué muestra | Qué permite | Qué no permite |
| --- | --- | --- | --- |
| Resumen | nombre, plan, estado, visibilidad, dueño, antigüedad | cambiar estado (con permiso), cambiar plan, visibilidad | editar productos uno a uno como si fuera el vendedor |
| Actividad | reportes abiertos, tickets, payout pendiente, past-due, % de cupo IA | saltar al dominio dueño de esa señal | resolver el payout aquí |
| Equipo | miembros y roles de tenant | invitar, cambiar rol de tenant, quitar (ya existe, y ya audita si es admin) | convertir a alguien en `ADMIN` de plataforma |
| Dinero | suscripción y último criterio de liquidación | abrir Dinero en ese negocio | editar la comisión de este tenant por fuera del plan |
| Historial | filas de `hot_click_auditoria_admin_tb` de ese `empresaId` | solo lectura | borrar el rastro |
| Ver como negocio | sesión impersonada 30 min | operar como el vendedor para reproducir un fallo | suspender, cambiar plan o ver webhooks de toda la plataforma |

Ver como negocio conserva el diseño actual: `POST /api/admin/empresas/{id}/impersonar`, JWT corto, rol de vendedor, auditoría `IMPERSONACION_INICIO` / `IMPERSONACION_FIN`. La ficha muestra un banner mientras esa sesión existe. Los riesgos ya conocidos (el JWT no se revoca al salir, el token de admin queda en el cliente, un listado de webhooks no filtra por empresa) se corrigen en un corte de seguridad propio, no dentro del maquillaje de la ficha. Ver sección 24.

Aprobar un pendiente puede hacerse desde la ficha o desde Moderación. Es la misma API. Las dos entradas no son dos implementaciones.

---

## 12. Moderación

### Qué es una decisión hoy

No hay objeto Caso. Hay colas con estado terminal:

| Cola | Estados que ya existen | Acción |
| --- | --- | --- |
| Negocio nuevo | `PENDIENTE_APROBACION` → `ACTIVO` o `RECHAZADO` | aprobar publica catálogo |
| Oferta | `PENDIENTE` → `APROBADO` o `RECHAZADO` | comentario de revisor |
| Método de cobro | igual que oferta | comentario de revisor |
| Testimonio | `PENDIENTE` → aprobado o rechazado | — |
| Reporte de producto | `PENDIENTE` → `RESUELTO` o `DESCARTADO` | nota y, si aplica, pausar producto |
| Producto (solicitud) | legacy | no es cola viva; no se crean filas nuevas |

La pausa automática a los 3 reportes pendientes sigue. El moderador ve el producto ya pausado y confirma o descarta. No se le pide que cuente a mano.

Recolecciones, SINPE y payouts aparecen como número en el resumen porque alguien debe verlos. Se resuelven en Operación y en Dinero. La cola de Moderación no los duplica como si fueran contenido.

### Estructura del dominio

```text
Moderación
├── Cola          una lista filtrable por tipo (negocio, oferta, cobro, testimonio)
├── Reportes      ReporteProducto
└── Decisiones    auditoría filtrada a acciones de moderación
```

No se crean pantallas vacías de “negocios reportados” ni “usuarios reportados”. No hay entidad que las alimente.

### Caso (P2, cuando se construya)

Un caso envuelve una fila de cola. No reemplaza el estado de `Empresa` ni de `ReporteProducto`.

| Campo | Obligatorio al nacer el caso |
| --- | --- |
| Tipo y id de origen | sí |
| Estado | Pendiente, En revisión, Resuelto |
| Prioridad | alta si es reporte con pausa automática o negocio con venta ya ocurrida; si no, media |
| Responsable | vacío hasta que alguien lo toma |
| Motivo y evidencia | los que ya trae el reporte o la solicitud |
| Resolución | aprobado, rechazado, pausado, descartado |
| Historial | cada toma, nota y decisión |

La resolución del caso llama a la misma API de aprobar, rechazar o resolver que ya existe. El caso no tiene un segundo botón que escriba otro estado en el negocio.

Hasta esa migración, “qué decidió el moderador” es el estado de la solicitud o del reporte, el comentario o `notasAdmin`, y la fila de auditoría cuando esa acción ya se registra. Aprobar negocio y resolver reporte deben empezar a escribir auditoría en la fase de Moderación aunque el caso todavía no exista.

---

## 13. Seguridad

Preguntas que el dominio tiene que poder responder con lo que ya se guarda:

| Pregunta | Dónde está hoy | Dónde queda |
| --- | --- | --- |
| ¿Qué está pasando? | eventos + dashboard | Alertas primero; el dashboard de KPIs pasa detrás |
| ¿Qué se bloqueó solo? | `LOGIN_BLOCKED`, rate limit, IP abusiva | Bloqueos, con el evento que lo causó |
| ¿Qué IP está bloqueada a mano? | alta y baja de IPs | Bloqueos |
| ¿Qué cuenta parece en riesgo? | eventos por email, fuerza bruta | Cuentas |
| ¿Qué sesiones siguen vivas? | sesiones activas | Evidencia de esa cuenta |
| ¿Qué hizo un admin sobre la seguridad? | parcial (`ROLE_CHANGE` en el log de seguridad; la suspensión de negocio no) | Evidencia + auditoría de plataforma |

Estructura:

```text
Seguridad
├── Alertas        SecurityAlert no resuelta. Acción: resolver o bloquear IP
├── Bloqueos       IPs y cuentas bloqueadas. Acción: revertir con motivo
├── Cuentas        búsqueda por correo, eventos de esa persona
└── Evidencia      log filtrable (tipo, severidad, periodo). Exportación que ya existe
```

Sentry y la pestaña Sistema salen de este primer nivel. Pasan a Plataforma > Técnico (`platform.ops`). Un error de aplicación no es un incidente de acceso.

Incidente, cuando haga falta (P3): se abre desde una alerta, tiene dueño y cierre, y no es una fila más del log. No se crea la tabla en la fase que solo reordena pestañas.

Tipos que el modelo ya distingue y la UI debe respetar: evento, alerta, bloqueo automático, bloqueo manual, acción de admin. No hace falta un sexto nombre si la pantalla los etiqueta así.

---

## 14. Finanzas

El nombre del dominio en la consola es **Dinero**. “Finanzas” en el producto de hoy es el P&L del vendedor (pedidos entregados, gastos). Usar la misma palabra en la consola de HotClick vuelve a mezclar las dos experiencias.

### Tres colas

**Cobros.** El comprador ya intentó pagar. El operador confirma SINPE, rechaza un comprobante o mira un webhook que no cerró. API actual de pagos admin, webhooks y comprobantes.

**Liquidaciones.** El wallet del negocio pide salir. Payout `PENDIENTE` por encima de ₡50.000 se aprueba o se rechaza con nota. Por debajo, el scheduler ya lo hace: el home no los trata como trabajo humano, salvo que fallen. Cada liquidación de pedido (comisión, pasarela, envío, neto) se puede abrir en lectura desde el negocio. No hay pantalla para “editar la comisión de este pedido”.

**Suscripciones.** La mensualidad del plan. Past-due, cobro, ledger por negocio. Es el billing SaaS de plataforma, no `/admin/billing/planes` del vendedor.

### Lo que no es un submódulo

- **Comisiones como pantalla de edición.** La tasa es atributo del plan (`comisionPorcentaje`, mínimo de Emprendedor, reserva de pasarela). Se cambia en Plataforma > Planes, con auditoría y, más adelante, doble autorización. El operador de dinero la consulta.
- **Conciliación como producto.** Es la excepción “pedido pagado y wallet sin crédito” (DLQ). Una vista dentro de Liquidaciones cuando se confirme el endpoint de lectura. No un quinto pilar.
- **Facturación electrónica y D-105.** Hoy leen el `empresaId` del JWT. Quedan en investigar. Si son los libros de HotClick, entran después como Dinero > Libros. Si son los del negocio con el que entró el admin, se van a la consola del vendedor. No se promocionan a pilar mientras eso no esté cerrado.
- **Ads, embudo, reporte contable del vendedor.** Consola del negocio, o una línea en Técnico. No son dinero de la plataforma.

---

## 15. Soporte

Soporte es Operación > Atención, no un dominio hermano. El ticket ya es el objeto más completo de la plataforma: `ABIERTO`, `ASIGNADO`, `RESUELTO`, prioridad, asignado, `notasAdmin`.

La ficha del negocio muestra sus tickets y abre este submódulo filtrado. El operador no mantiene dos bandejas.

Garantías de una tienda y clientes CRM son del vendedor. No se mudan aquí. El link roto de “Más herramientas” hacia esas rutas se apaga con el menú legado.

Campo (servicios Hot, recolección, paquetes de digitalización) comparte dominio porque es HotClick trabajando para un negocio, con otro permiso. A 20 personas, Atención y Campo son dos entradas del mismo dominio, no dos rediseños.

---

## 16. IA

Una vista, no siete.

| Pregunta | Respuesta con lo que hay | Hueco |
| --- | --- | --- |
| ¿Cuánto usamos? | Suma de llamadas y tokens del mes | — |
| ¿Quién? | Por negocio | No hay corte por usuario dentro del negocio |
| ¿Para qué? | Flags de chat público y copilot; la cuota es una bolsa | El uso no viene partido por función |
| ¿Cuánto cuesta? | USD estimado en el dashboard | No es un cargo ni un ledger |
| ¿Qué depende de IA? | Copilot del vendedor y chat público, más lo que pase por `AiQuotaService` | El admin no edita el catálogo de funciones en esta vista |
| ¿Genera valor? | No hay métrica de conversión atribuida a IA | No se inventa un ROI en el panel |
| ¿Falla? | Error al llamar al proveedor, visible en logs técnicos | No es una cola de IA |
| ¿Hay abuso? | Un negocio contra su `maxCreditosAi` | La alerta no se persiste; el tope no se edita aquí |

Controles: lectura de cupo, uso y costo estimado; interruptor por negocio de los flags que ya existen (`chat_publico`, `copilot_emprendedor`, y el flag de copilot de plataforma). El tope por plan se edita en Planes (`platform.configure`), no en esta pantalla, para no tener dos lugares donde cambia el mismo número.

Evolución, en este orden: (1) la vista única clara, (2) alerta persistida al pasar un porcentaje del cupo, (3) tope excepcional por negocio si un plan no alcanza, (4) desglose por función el día que el registro lo tenga. Modelos: el nombre configurado (`anthropic.model`) se muestra en lectura. Elegir modelo por negocio no es un requisito del negocio actual.

---

## 17. Plataforma

Tres submódulos. El operador diario no entra aquí para trabajar la cola.

**Apariencia.** Homepage, categorías, marcas, cupones. Es el marketplace como vidriera, no como dominio de operación. Categorías hoy no pasan por `ITOnlyGuard` en el frontend: al mudarla, el guard del dominio (`platform.configure`) y el del API tienen que coincidir. Hay que verificar el controller en esa fase; no se asume el hueco en backend.

**Planes.** Precio mensual, comisión, mínimo, topes (productos, usuarios, bodegas), créditos de IA, contacto directo. Es la palanca de ingresos. Cambiarla es `platform.configure` y queda auditado.

**Accesos.** Usuarios de plataforma: rol, bloqueo, restauración, borrado. Distinto del equipo de un tenant.

**Técnico** (`platform.ops`). Feature flags que no son de IA, multipaís (país, moneda, IVA, tasas: ya existe y es la puerta de “más países” sin un dominio nuevo), observabilidad, Sentry, y más adelante una vista de jobs solo si una cola automática falla y no se ve en Dinero o en Moderación. RAG, agentes QA, reset de plataforma y actuator no entran al menú. Siguen siendo endpoints de ingeniería.

Observabilidad no es un admin de negocio. Un operador no necesita el tamaño de la base para aprobar un payout. Quien opera mira la excepción en su cola. Quien mantiene el sistema mira Técnico.

---

## 18. Auditoría

Infraestructura transversal. Pregunta que tiene que poder responder: quién hizo qué, sobre qué entidad, cuándo, desde dónde, con qué resultado.

### Dónde se consulta

- En la ficha del negocio: historial de ese `empresaId`.
- En Moderación > Decisiones: acciones de aprobar, rechazar, resolver, pausar.
- En Plataforma > Accesos y en Seguridad: cambios de rol, bloqueos, impersonación.
- Búsqueda global (fase 10): por actor, acción, entidad, rango de fechas. Es la pantalla `/admin/auditorias` de hoy, mudada, no una tabla nueva.

### Qué se escribe

La tabla `hot_click_auditoria_admin_tb` se conserva: admin id, email, acción, entidad, entidad id, detalle, fecha, empresa. No se crea un segundo log de “auditoría de producto”.

Ya se escribe: SINPE (aprobar, rechazar, auto), impersonar (inicio y fin), productos y pedidos cuando corre `registrar` / `registrarSiAdmin`, equipo del negocio.

Tiene que empezar a escribirse en el primer corte que toque esa acción:

| Acción | Fase que la obliga |
| --- | --- |
| Suspender, reactivar, cambiar plan, cambiar visibilidad | Negocios |
| Aprobar o rechazar negocio, oferta, cobro; resolver reporte | Moderación |
| Payout aprobado o rechazado (si aún no está) | Dinero |
| Flag, comisión, precio de plan, país | Plataforma |
| Interruptor de IA | IA |
| Bloqueo de IP y de usuario | Seguridad |

IP y user-agent no caben en la tabla actual. Son un cambio de esquema (P2), no un pretexto para dejar de escribir la acción. Retención 90 días: se mantiene hasta que alguien opere un incidente que necesite más. Alargarla también es esquema.

La fila guarda el resultado en `detalle` (aprobado, rechazado, motivo). No hace falta una columna nueva en el primer corte.

Impersonar sigue siendo dos eventos. El detalle incluye el id del negocio. Las acciones que el admin haga **dentro** de la sesión de vendedor deben poder distinguirse: si hoy se registran como el vendedor, la fase de Negocios lo anota como hueco y no lo “arregla” en silencio mezclando identidades.

---

## 19. Escalabilidad

### De 100 a 100.000 negocios

| Escala | Qué se rompe si la consola sigue igual | Qué exige esta arquitectura |
| --- | --- | --- |
| ~100 | Nada grave. Una persona abre listas completas. | Paginación y búsqueda igual, para no rehacer la lista después. |
| ~1.000 | Un `getEmpresas` completo y un home que cuenta en el cliente se ponen lentos. | Listas en servidor. Conteos de cola desde el resumen, no desde el array del navegador. |
| ~10.000 | Todos ven la misma cola y se pisan. | Asignación de casos y de tickets (el ticket ya asigna). Filtro “sin dueño”. |
| ~100.000 | Hace falta riesgo y partición por equipo. | Filtro “en riesgo” con datos en el listado. Permisos por dominio. La ficha sigue siendo la unidad; no hay una pantalla “todos los productos de la plataforma” para operar. |

### De 1 a 20 operadores

Con una persona, `ADMIN` ve los ocho dominios y la auditoría reemplaza a la doble firma.  
Con cinco, se prenden permisos: una persona de dinero no ve IPs.  
Con veinte, Moderación, Dinero, Operación y Seguridad son equipos. El shell no cambia. Cambian las bolsas de permisos.  
Por eso el sidebar tiene dominios y no pantallas, y por eso el permiso no es el nombre del rol.

### Qué puede entrar después sin nuevo menú

| Capacidad futura | Dónde cae |
| --- | --- |
| Otro país o moneda | Plataforma > Planes y multipaís (ya hay pantalla) |
| Otro método de pago | Dinero > Cobros, como un tipo más de excepción |
| Otro modelo de IA | IA, lectura del modelo; el tope sigue en el plan |
| Otro tipo de negocio | Negocios, filtro; el estado sigue siendo el de `Empresa` |
| Regla de moderación persistida | Plataforma, y la cola la obedece. No un dominio “reglas” |
| Fraude o score | Señal en la ficha y prioridad del caso. No un dominio hasta que el score exista |
| Integración externa | Plataforma > Técnico, o la cola del dominio al que afecta (un webhook roto es Dinero) |
| Línea de negocio nueva | Un dominio nuevo solo si tiene cola, permiso y acciones propias. Si no, es un filtro |

---

## 20. Legacy

`/admin` para `ADMIN` es legado de navegación. Las capacidades no lo son.

Se conserva hasta que el dominio nuevo lo cubra:

- Rutas de empresas, aprobaciones, reportes, pagos, payouts, billing, soporte, seguridad, IA, usuarios, homepage, categorías, marcas, cupones, servicios, recolecciones, inventario de plataforma, flags, multipaís, observabilidad, auditorías.
- Alias que ya redirigen (`/admin/tiendas`, `/admin/moderacion`, `/admin/dashboard`). No se borran en la fase 1.
- La consola del vendedor entera, en el mismo prefijo, para roles que no son `ADMIN`.

Se deja de ofrecer en el menú de plataforma en cuanto exista el shell nuevo (puede seguir la URL):

- Más herramientas.
- Política de moderación y métodos de pago estáticos.
- Ads, cola offline, cotizaciones, publicaciones, garantías, clientes, finanzas del vendedor, billetera del vendedor, copilot, POS, blog, equipo de tienda, forecast, executive.

Técnico, fuera del menú del operador:

- Observabilidad y Sentry (dentro de Técnico, con permiso).
- RAG, agentes QA, reset QA, reset de datos, actuator: sin ítem de menú.

Investigar antes de mudarlos:

- `/admin/facturas`, `/admin/compras-d105`, `/admin/config-fiscal`.

---

## 21. Matriz

Clasificación de la capacidad, no una orden de borrar archivos en esta fase.

| Capacidad | Clase | Destino |
| --- | --- | --- |
| Listado y ficha de empresas | KEEP + REBUILD navegación | Negocios |
| Impersonar | KEEP | Ficha. Corte de seguridad aparte para revocación |
| Aprobaciones (negocio, oferta, cobro) | KEEP + REBUILD entrada | Moderación > Cola |
| Pestaña productos legacy | LEGACY | No es cola. Se consulta si quedan filas |
| Reportes de producto | MERGE | Moderación > Reportes |
| Testimonios pendientes | MERGE | Moderación > Cola, tipo testimonio |
| Usuarios de plataforma | MOVE | Plataforma > Accesos |
| Equipo del tenant | KEEP | Ficha del negocio |
| Pagos, webhooks, SINPE | KEEP | Dinero > Cobros |
| Payouts | KEEP | Dinero > Liquidaciones |
| SaaS billing | KEEP | Dinero > Suscripciones |
| Finanzas y billetera del vendedor | MOVE | Consola del negocio |
| Embudo | MOVE | Línea opcional del home o Técnico. No dominio |
| Ads | MOVE | Consola del negocio. Hoy el ADMIN ni entra |
| Recolección, servicios, digitalización | MERGE | Operación > Campo |
| Cola offline | MOVE | Consola del negocio (dispositivo de la caja) |
| Facturas, D-105, config fiscal | INVESTIGATE | Dinero > Libros o consola del negocio |
| Homepage, categorías, marcas, cupones | MOVE | Plataforma > Apariencia |
| Security Center | REBUILD presentación | Seguridad |
| Sentry dentro de Security | MOVE | Plataforma > Técnico |
| Auditorías | KEEP | Transversal + búsqueda |
| Flags | MOVE | Plataforma > Técnico; los de IA también se ven en IA |
| Observabilidad | TECHNICAL ONLY | Plataforma > Técnico |
| AI control | REBUILD lectura | IA, una vista |
| Copilot del vendedor | MOVE | Consola del negocio |
| Multipaís | KEEP | Plataforma |
| Soporte | KEEP | Operación > Atención |
| Más herramientas | REMOVE | El shell nuevo no tiene hub |
| Política y métodos estáticos | REMOVE | No tienen persistencia |
| Cotizaciones, publicaciones, garantías, clientes en admin plataforma | MOVE | Consola del negocio |
| Alias `/admin/tiendas`, `/admin/moderacion`, … | KEEP | Redirects hasta fase 11 |
| RAG, resets, actuator, agentes QA | TECHNICAL ONLY | Sin menú |
| Inicio con cuatro KPIs | REBUILD | Home de colas |

---

## 22. Priorización

### P0 — la consola puede operar

Shell con ocho dominios. Home de colas con APIs actuales. Negocios (lista paginada, ficha, estados reales, impersonar como está). Moderación (cola + reportes, mismas APIs). Dinero (cobros, liquidaciones, suscripciones). Auditoría de suspensión, plan y visibilidad en el mismo corte que Negocios.

### P1 — se opera sin perderse

Operación (tickets + campo). Seguridad abierta en alertas y bloqueos. IA en una vista (cupo, uso, costo estimado, interruptores). Plataforma > Apariencia y Planes. Historial de auditoría en la ficha. Guard de categorías alineado con `platform.configure`.

### P2 — aguanta más de una persona y una investigación

Caso de moderación (asignación, nota, prioridad) con migración. IP y user-agent en auditoría. Filtro “en riesgo”. Desglose de liquidación en la ficha. Revocación de impersonación y banner, en un corte de seguridad. DLQ visible si el endpoint de lectura no alcanza.

### P3 — cuando el equipo o el costo crezcan

Permisos en base y fin del “ADMIN puede todo” para el staff. Doble autorización de comisión, alta de admin y borrado. Incidente nacido de una alerta. Tope de IA excepcional. Alerta de cupo persistida. Command palette. Consola de jobs. Libros fiscales, cerrado el scope. Denuncias que hoy no existen.

---

## 23. Roadmap de implementación

Cada fase se puede encargar sola (“implementa Moderación”) después de la fase 1. No se borra la ruta vieja dentro de la fase que la envuelve. El vendedor no cambia de menú en ninguna fase anterior a la 11, y en la 11 tampoco: solo se retira el sidebar de plataforma.

### Fase 0 — Arquitectura

Este documento. Sin código.

Objetivo: cerrar dominios, permisos, home y orden.  
Aceptación: se puede señalar, para cualquier pantalla vieja, el dominio destino o la clase de la matriz.

### Fase 1 — Shell y navegación

Objetivo: `/plataforma` con los ocho ítems, badges vacíos o reales de solo lectura, y tipos de permiso en el frontend. `/admin` sigue igual.  
Reutiliza: layout nuevo, sin reescribir páginas. Los ítems pueden enlazar todavía a las rutas `/admin/...` de plataforma.  
Reemplaza: nada todavía.  
Riesgo: dos sidebars confunden si el `ADMIN` cae en los dos. El switch de contexto tiene que ser visible desde el primer PR.  
Prueba: `ADMIN` ve los ocho dominios; `EMPRENDEDOR` no entra a `/plataforma`; un link de dominio abre la ruta vieja correcta.  
Aceptación: no hay ítem “Más”, ni ads, ni garantías, en el sidebar nuevo.

### Fase 2 — Home

Objetivo: colas de la sección 10.  
Reutiliza: `ModeracionResumenService`, dashboard de seguridad, listado de billing.  
Reemplaza: el uso de `SuperAdminHome` como aterrizaje de plataforma. La ruta `/admin` del vendedor sigue en `SistemaInicio`.  
Riesgo: contar en el cliente si el resumen falla y se hace fallback al listado completo.  
Prueba: cada fila navega a la cola correcta; un fallo de una API no vacía las otras.  
Aceptación: no quedan los cuatro KPIs de vanidad como contenido principal.

### Fase 3 — Negocios

Objetivo: lista con filtros de estado reales, ficha, historial, auditoría de suspender, reactivar, plan y visibilidad.  
Reutiliza: `AdminEmpresas`, `AdminEmpresaWorkspace`, `ImpersonacionService`, `AuditoriaAdminRegistroService`.  
Reemplaza: la entrada “Tiendas” del sidebar viejo pasa a ser alias.  
Riesgo: cambiar estado sin migrar datos; no hace falta migración si la acción solo inserta auditoría.  
Prueba: suspender escribe una fila con admin, empresa, acción y motivo; el catálogo se oculta como hoy; el vendedor no ve esta ficha.  
Aceptación: no aparecen estados que `EmpresaAdminService` no acepte.

### Fase 4 — Moderación

Objetivo: Cola + Reportes + enlace a Decisiones.  
Reutiliza: `AdminAprobaciones`, `AdminReportesProducto`, handlers de solicitud.  
Reemplaza: la pestaña de productos como cola por defecto.  
Riesgo: duplicar botones de aprobar si ficha y cola no comparten la misma llamada.  
Prueba: aprobar un negocio desde la cola publica como `aprobarYPublicar`; resolver un reporte con pausa sigue igual; recolección no se resuelve en esta cola.  
Aceptación: no hay pantalla de “casos” vacía. El caso es una fase posterior (P2) con migración propia.

### Fase 5 — Dinero

Objetivo: tres submódulos sobre las tres pantallas actuales.  
Reutiliza: `AdminPagos`, `AdminPayouts`, `AdminBillingPlataforma`.  
Reemplaza: su lugar en el sidebar viejo.  
Riesgo: incluir finanzas del vendedor por el nombre.  
Prueba: un payout bajo el umbral no aparece como tarea humana si ya lo tomó el scheduler; SINPE pendiente sí; el vendedor sigue viendo su billetera en su consola.  
Aceptación: no hay CRUD de comisión en este dominio.

### Fase 6 — Operación

Objetivo: Atención y Campo.  
Reutiliza: tickets, servicios, recolecciones, captura y paquetes.  
Reemplaza: esos links sueltos del bloque “Operar plataforma”.  
Riesgo: la captura de inventario es una PWA de campo; no hay que encogerla a una tabla.  
Prueba: asignar un ticket sigue guardando responsable; un paquete se asigna a un negocio como hoy.  
Aceptación: la cola offline no está en este dominio.

### Fase 7 — Seguridad

Objetivo: abrir en Alertas y Bloqueos. Evidencia detrás. Sentry fuera de este dominio.  
Reutiliza: `AdminSecurityCenter` y `/api/security/**`.  
Reemplaza: el orden de pestañas, no el log.  
Riesgo: esconder un bloqueo manual al “simplificar”.  
Prueba: resolver alerta y bloquear IP siguen funcionando; un operador sin `security.read` no ve el dominio.  
Aceptación: no se crea la entidad incidente en esta fase.

### Fase 8 — IA

Objetivo: una vista de cupo, uso, costo estimado e interruptores.  
Reutiliza: `AdminAiControl`, `GET /api/security/ai/dashboard`, flags.  
Reemplaza: la sensación de que hay que editar el tope en esta pantalla. El tope del plan se enlaza a Planes.  
Riesgo: mostrar el USD como si fuera una factura.  
Prueba: apagar `chat_publico` de un negocio se refleja en el flag; el número de tokens coincide con `ai_uso`.  
Aceptación: no hay rutas hijas Uso, Costos, Límites y Modelos.

### Fase 9 — Plataforma

Objetivo: Apariencia, Planes, Accesos, Técnico.  
Reutiliza: homepage, categorías, marcas, cupones, flags, multipaís, observabilidad, usuarios.  
Reemplaza: Configuración estática (política, métodos). Esas rutas dejan de estar enlazadas.  
Riesgo: categorías accesibles por URL sin permiso. Esta fase cierra el guard de frontend y verifica el de API.  
Prueba: cambiar un flag de no-IA queda auditado; un `EMPRENDEDOR` no abre categorías de plataforma.  
Aceptación: observabilidad no aparece en el sidebar de un operador sin `platform.ops`.

### Fase 10 — Auditoría transversal

Objetivo: historial en ficha y en moderación, más la búsqueda global. Completar las acciones de la sección 18 que las fases 3 a 9 aún no hayan escrito.  
Reutiliza: `GET /api/admin/auditorias`.  
Reemplaza: la idea de que auditoría es un ítem suelto sin contexto.  
Riesgo: migración de IP si se mete en esta fase. La IP es P2 opcional, no el criterio de cierre.  
Prueba: suspender, aprobar negocio, payout, flag e impersonar producen fila consultable por empresa y por actor.  
Aceptación: no existe una segunda tabla de auditoría.

### Fase 11 — Retiro del menú legado de plataforma

Objetivo: el `ADMIN` aterriza en `/plataforma`. El sidebar `buildAdminItLinks` deja de ser la navegación. Las URLs viejas redirigen al deep link nuevo o renderizan dentro del shell nuevo.  
Reutiliza: todas las páginas ya mudadas.  
Reemplaza: `buildAdminItLinks` como menú.  
Riesgo: romper al vendedor si se toca `buildSistemaLinks` o `AdminRoleSwitch` de más.  
Prueba: recorrido de vendedor (pedidos, productos, POS, su configuración) y recorrido de admin (las ocho colas).  
Aceptación: el vendedor no ve dominios de HotClick; el admin no ve “Más herramientas”.

Fases P2 y P3 (casos, staff, incidente, topes de IA, doble firma) se encargan después de la 11, cada una con su migración y su prueba. No se intercalan en el shell.

---

## 24. Riesgos

| Riesgo | Por qué importa | Cómo se contiene |
| --- | --- | --- |
| Seguir diseñando en `/admin` | El vendedor y la plataforma vuelven a mezclarse en el primer PR | Fase 1 crea `/plataforma` y no edita el menú del vendedor |
| Pantalla de casos vacía | Parece producto y no hay datos | Prohibido hasta la migración P2 |
| Estados de negocio inventados | El API rechaza `EN_REVISION` o `BLOQUEADO` | La ficha usa solo los estados de `ESTADOS_VALIDOS` más `PENDIENTE_APROBACION` y `RECHAZADO` |
| Comisión editable “por si acaso” | Un operador cambia el ingreso de todos los planes desde Dinero | La tasa solo vive en Planes |
| Impersonar “arreglado” en el PR del menú | Revocar JWT y filtrar webhooks es otro comportamiento | Queda escrito; corte aparte. No se maquilla y se da por cerrado |
| Webhooks de admin visibles con rol de vendedor | Ya está documentado en `docs/audit/modulos/admin-plataforma.md` | El corte de impersonación lo incluye. La ficha nueva no llama ese listado |
| Token de admin en el cliente durante impersonación | Superficie si el dispositivo no es de confianza | Mismo corte. La arquitectura no lo niega |
| Fiscal del JWT presentado como libros de HotClick | Se edita el certificado del tenant equivocado | Sigue en investigar, sin ítem en Dinero |
| Staff reactivado copiando V126 | Los guards no coinciden (soporte es el ejemplo) | P3, permiso por acción, API y menú a la vez |
| Home que vuelve a los KPI | Se siente “más completo” y deja de operar | Criterio de aceptación de la fase 2 |
| Dos auditorías | Alguien crea otra tabla “porque faltaba la IP” | Se amplía la tabla actual o se escribe la acción sin IP primero |
| Borrar rutas en la fase 4 | Bookmarks y el vendedor se rompen | Alias hasta la fase 11 |

---

## 25. Criterios de aceptación

De este documento:

- Se puede decir cuál es el trabajo de cada dominio, qué API reutiliza y qué no debe contener.
- Se puede clasificar cualquier pantalla del inventario actual con la matriz de la sección 21.
- Un encargo “implementa X” tiene fase, permiso, deep link y prueba, para X en Negocios, Moderación, Dinero, Operación, Seguridad, IA o Plataforma.

De la consola, cuando se construya:

- El vendedor completa un día de ventas sin ver un dominio de HotClick.
- El operador, al entrar, ve pendientes con verbo, no el censo de la plataforma.
- Aprobar, suspender, pagar un payout, resolver un reporte y apagar la IA de un negocio ocurren una sola vez, en su dominio, y dejan fila de auditoría.
- No hay ítem de menú cuyo click devuelva a Inicio por un guard de tienda.
- No hay pantalla cuyo backend no exista.
- Añadir un país, un método de pago o un permiso de equipo no obliga a redibujar los ocho dominios.

---

## Contrato para implementar un módulo después

Cuando el encargo sea un dominio, el trabajo se limita a esto:

1. Ruta bajo `/plataforma/{dominio}`, con alias a la ruta `/admin` que la matriz marca KEEP.
2. Sidebar: el dominio ya existe desde la fase 1. Solo se activa su contenido.
3. Permiso de la sección 9, comprobado en la ruta y en el API que ya autoriza esa acción.
4. Cola o ficha según las secciones 10 a 17. Sin subrutas que este documento no nombre.
5. Acciones críticas de la sección 18 escriben `AuditoriaAdminRegistroService` con acción, entidad, id, empresa y motivo.
6. Prueba de la fase correspondiente en la sección 23, más la prueba de que un `EMPRENDEDOR` no entra.
7. No se migra el esquema salvo que la fase sea explícitamente P2 (caso, IP) o P3 (permisos en base).

APIs que no hay que inventar para el P0: resumen de moderación, empresas, solicitudes de aprobación, reportes de producto, pagos, payouts, billing, tickets, security dashboard, ai dashboard, auditoría de lectura.

APIs que este diseño no da por existentes: objeto Caso, objeto Incidente, tope de IA por negocio distinto del plan, denuncia de usuario, denuncia de negocio, doble autorización, listado paginado de empresas si el actual no pagina, lectura cómoda de la DLQ del wallet. Se construyen solo en la fase que las nombra.
