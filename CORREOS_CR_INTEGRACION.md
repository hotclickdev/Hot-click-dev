# HOTCLICK — Integración Correos de Costa Rica

> Generado: Mayo 2026  
> Estado: Investigación completada — pendiente de implementación  
> Contexto: Volumen de pedidos bajo, mayoría contra entrega (pago al recibir)

---

## Resumen ejecutivo

Correos de Costa Rica **sí tiene API** llamada **Pymexpress Web Service**, pero el acceso requiere un **convenio empresarial firmado**. No hay documentación pública. Dado que el volumen actual es bajo y la mayoría de pedidos son contra entrega, la estrategia recomendada es implementar un MVP con tarifas estáticas primero y conectar la API oficial cuando el volumen lo justifique.

---

## Estado actual de la API

| Aspecto | Detalle |
|---|---|
| Nombre del servicio | Pymexpress Web Service |
| Tipo | HTTP/SOAP con credenciales por convenio |
| Documentación pública | No existe. Solo cliente PHP en GitHub |
| Autenticación | Usuario + Contraseña + UserID + ServiceID + ClientCode |
| Acceso | Requiere convenio empresarial con Correos CR |
| Sandbox | Existe (URL de pruebas disponible al firmar convenio) |

### Capacidades confirmadas

| Función | Estado |
|---|---|
| Calcular tarifa (`get_tarifa`) | Disponible |
| Generar guía (`generar_guia`) | Disponible |
| Registrar envío (`registro_envio`) | Disponible |
| Provincias / Cantones / Distritos / Barrios | Disponible |
| Tracking en tiempo real | Limitado — requiere TrackingMore como complemento |
| Sucursales (lista oficial) | No expuesto como API |

### Contactos para convenio

| Contacto | Propósito |
|---|---|
| pymexpress@correos.go.cr | PyMEs y acceso sandbox |
| jmora@correos.go.cr | Soporte técnico Pymexpress |
| https://correos.go.cr/conecta-tu-negocio-con-correos-de-costa-rica/ | Portal de integración |

---

## Contexto del negocio actual

- **Volumen:** Bajo (arranque, primeros meses)
- **Método de pago dominante:** Contra entrega (cliente paga al recibir el paquete)
- **Implicación:** No es urgente automatizar generación de guías. La prioridad es calcular el costo de envío en el checkout y que el admin genere guías manualmente desde el panel.

---

## Estrategia por etapas

### Etapa 1 — MVP inmediato (sin convenio)

**Qué hace:**
- Tabla interna de tarifas por zona (GAM / Provincial / Remota)
- El checkout muestra costo de envío calculado localmente
- El admin genera la guía manualmente en correos.go.cr (sucursal virtual)
- El número de guía se ingresa manual en el panel admin

**Cuándo usar:** Ahora, mientras el volumen es bajo y la mayoría son contra entrega.

**Tiempo de implementación:** 1 semana.

**Ventaja:** Cero dependencia de API externa, cero costo.

### Etapa 2 — Tracking por TrackingMore (cuando se tengan guías activas)

**Qué hace:**
- Integra TrackingMore API para consultar estado de guías de Correos CR
- El cliente puede ver historial de su envío desde su perfil
- Polling automático cada 30 minutos para actualizar estados

**Costo:** $0 hasta 100 trackings/mes, $9/mes hasta 1,000 trackings.

**Tiempo de implementación:** 1 semana adicional.

### Etapa 3 — Pymexpress directo (cuando el volumen lo justifique)

**Cuándo activar:** 50+ envíos mensuales, o cuando procesar guías manualmente sea ineficiente.

**Qué agrega:**
- Generación de guías automática desde el panel admin
- Cálculo de tarifas en tiempo real (reemplaza tabla estática)
- Etiquetas PDF generadas automáticamente

**Tiempo de implementación post-convenio:** 2-3 semanas.

---

## Tarifas estáticas para MVP (aproximadas 2025)

> Reguladas por ARESEP. Última actualización: Resolución RE-0041-IT-2025 (agosto 2025).  
> Estos valores son referenciales — confirmar en https://correos.go.cr/tarifas/

| Zona | Cobertura | Tiempo entrega | Tarifa base estimada |
|---|---|---|---|
| GAM | San José, Alajuela, Cartago, Heredia | 1-2 días hábiles | ₡1,200 - ₡1,800 |
| Provincial | Guanacaste, Puntarenas, Limón | 2-5 días hábiles | ₡1,800 - ₡2,800 |
| Remota | Zonas de difícil acceso | 5-7 días | ₡2,800+ |
| Retiro en tienda | — | Inmediato | ₡0 |

> Peso máximo por paquete: 30 kg. Cobro adicional por kg extra.

---

## Arquitectura técnica diseñada

### Paquetes nuevos (Spring Boot)

```
com.hotclick/
└── envio/
    ├── config/         CorreosCRConfig.java
    ├── client/         PymexpressClient.java, TrackingMoreClient.java
    ├── service/        EnvioService.java, CorreosCRService.java, TrackingService.java
    ├── controller/     EnvioController.java
    ├── dto/
    │   ├── request/    ShippingQuoteRequest.java, ShippingLabelRequest.java
    │   └── response/   ShippingQuoteResponse.java, ShippingLabelResponse.java,
    │                   TrackingResponse.java, SucursalResponse.java
    ├── model/          Envio.java, DireccionEnvio.java, EventoTracking.java
    ├── repository/     EnvioRepository.java, EventoTrackingRepository.java
    └── scheduler/      TrackingPollingJob.java
```

### Endpoints nuevos

| Método | Ruta | Descripción | Auth |
|---|---|---|---|
| POST | `/api/envio/cotizar` | Calcular costo de envío | Público |
| POST | `/api/envio/guia/generar` | Generar guía en Correos CR | ADMIN |
| GET | `/api/envio/rastrear/{guia}` | Consultar tracking por número de guía | Público |
| GET | `/api/envio/pedido/{id}/tracking` | Tracking de un pedido | Autenticado |
| GET | `/api/envio/sucursales` | Sucursales cercanas (lat/lon) | Público |
| GET | `/api/envio/ubicacion/provincias` | Lista de provincias | Público |
| GET | `/api/envio/ubicacion/cantones/{prov}` | Cantones por provincia | Público |
| GET | `/api/envio/ubicacion/distritos/{cant}` | Distritos por cantón | Público |
| GET | `/api/envio/ubicacion/barrios/{dist}` | Barrios por distrito | Público |

---

## Tablas de base de datos a crear

```sql
-- Envío principal (vinculado a hot_click_pedido_tb)
hot_click_envio_tb
├── id, fk_id_pedido, numero_guia, codigo_rastreo
├── estado_envio (PENDIENTE_DESPACHO | EN_TRANSITO | EN_SUCURSAL | ENTREGADO | DEVUELTO)
├── metodo_envio (CORREOS_CR_PYMEXPRESS | RETIRO_TIENDA)
├── proveedor_envio, costo_envio_calculado, costo_envio_cobrado
├── peso_gramos, zona (GAM | PROVINCIAL | REMOTA)
├── fecha_despacho, fecha_entrega_estimada, fecha_entrega_real
└── url_etiqueta, fecha_creacion, fecha_actualizacion

-- Dirección del destinatario
hot_click_direccion_envio_tb
├── id, fk_id_envio
├── nombre_destinatario, telefono, correo
├── provincia_id/nombre, canton_id/nombre, distrito_id/nombre, barrio_id/nombre
├── codigo_postal, direccion_exacta, indicaciones

-- Historial de tracking
hot_click_evento_tracking_tb
├── id, fk_id_envio
├── codigo_estado, descripcion_estado, ubicacion
├── fecha_evento, es_entregado, datos_raw (JSONB)
└── fecha_creacion
```

### Cambios en tablas existentes

El modelo `Pedido` ya tiene:
- `metodoEnvio` (String) — ya existe, usar `"CORREOS_CR_PYMEXPRESS"` o `"RETIRO_TIENDA"`
- `costoEnvio` (Integer) — ya existe, guardar tarifa calculada
- `fechaEntregaEstimada` (LocalDate) — ya existe

No se requieren cambios en `hot_click_pedido_tb`.

---

## Flujo de checkout (versión MVP contra entrega)

```
1. Cliente agrega productos al carrito
2. Cliente va al checkout → ingresa dirección de entrega
3. Sistema calcula zona (GAM/Provincial/Remota) según provincia seleccionada
4. Sistema muestra opciones:
   - Correos CR — ₡X,XXX — estimado X días
   - Retiro en tienda — Gratis — hoy
5. Cliente selecciona método y confirma pedido
6. Pedido se crea con metodoEnvio y costoEnvio
7. Admin ve el pedido en el panel → despacha manualmente
8. Admin ingresa número de guía en el panel → sistema guarda en hot_click_envio_tb
9. Cliente consulta tracking desde su perfil
```

---

## Flujo de checkout (versión Pymexpress automatizado — Etapa 3)

```
1-4. Igual al MVP
5. Sistema llama Pymexpress → tarifa en tiempo real
6. Cliente confirma pedido
7. Admin aprueba → sistema genera guía automáticamente via Pymexpress
8. Etiqueta PDF disponible en el panel admin para imprimir
9. Tracking automático via TrackingMore cada 30 minutos
10. Cliente recibe notificación cuando cambia el estado
```

---

## Consideración específica: contra entrega

Como la mayoría de pedidos son contra entrega:

- **Riesgo principal:** El cliente rechaza el paquete al momento de la entrega → Correos CR cobra el envío de ida y vuelta.
- **Mitigación recomendada:** Mostrar en el checkout un campo de confirmación ("Entiendo que el pago se realiza al recibir el paquete") y guardar el teléfono del cliente para coordinación previa.
- **Costo de devolución:** Mismo costo que el envío original, doble. Considerar política de máximo 1 intento de entrega para contra entrega.
- **Zonas de riesgo:** Correos CR no entrega a domicilio en ciertas zonas remotas — el paquete queda en sucursal. Para contra entrega en esas zonas, el cobro ocurre en la sucursal.

---

## Variables de entorno necesarias (Etapa 3)

```properties
# Pymexpress — obtenidas al firmar convenio
CORREOS_CR_USERNAME=
CORREOS_CR_PASSWORD=
CORREOS_CR_USER_ID=
CORREOS_CR_SERVICE_ID=
CORREOS_CR_CLIENT_CODE=
CORREOS_CR_BASE_URL=https://sandbox.correos.go.cr/pymexpress

# TrackingMore — crear cuenta en trackingmore.com
TRACKINGMORE_API_KEY=
```

---

## Riesgos

| Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|
| Correos CR demora en otorgar convenio | Alta | Medio | MVP con tarifas estáticas resuelve el problema |
| Cliente rechaza paquete (contra entrega) | Media | Alto | Confirmar antes del despacho por WhatsApp/teléfono |
| Web Service no disponible | Media | Alto | Cache de tarifas + tabla estática como fallback |
| Cambio de tarifas ARESEP | Alta (anual) | Medio | Tabla actualizable sin redeploy |
| Entrega fallida en zonas remotas | Media | Medio | Advertencia en checkout para provincias de alto riesgo |
| Guía duplicada por retry | Baja | Alto | Verificar existencia antes de generar |

---

## Costos estimados

| Componente | Costo mensual |
|---|---|
| TrackingMore (hasta 100 trackings) | Gratis |
| TrackingMore (hasta 1,000 trackings) | $9/mes |
| TrackingMore (hasta 5,000 trackings) | $29/mes |
| Pymexpress (costo por guía generada) | ~₡800 - ₡2,500 por envío |
| Desarrollo Etapa 1 (tarifas estáticas) | ~10-15 horas |
| Desarrollo Etapa 2 (TrackingMore) | ~8-12 horas |
| Desarrollo Etapa 3 (Pymexpress completo) | ~20-30 horas |

---

## Acción inmediata recomendada

**Ahora (volumen bajo, contra entrega):**
- Implementar Etapa 1: campo de dirección en checkout + tarifa estática por zona + guardar número de guía manual en el panel admin.
- Contactar Correos CR para iniciar el proceso del convenio (tarda semanas).

**Email para enviar a Correos CR:**

```
Para: pymexpress@correos.go.cr
CC: jmora@correos.go.cr
Asunto: Solicitud de acceso API Pymexpress — HOTCLICK Outlet

Buenos días,

Somos HOTCLICK Outlet, empresa de comercio electrónico en Costa Rica.
Estamos desarrollando integración con Pymexpress para automatizar el cálculo
y generación de guías de envío desde nuestro sistema en Java/Spring Boot.

Solicitamos acceso al sandbox del Web Service Pymexpress para iniciar pruebas
de integración. Nuestro volumen inicial es de 50-200 envíos mensuales.

¿Podría indicarnos los pasos para obtener credenciales de prueba
y la documentación técnica del servicio?

Gracias.
```

---

## Referencias

- Portal negocios Correos CR: https://correos.go.cr/conecta-tu-negocio-con-correos-de-costa-rica/
- Tarifas oficiales: https://correos.go.cr/tarifas/
- Tarifas ARESEP: https://aresep.go.cr/correo-postal/tarifas/
- Cliente PHP Pymexpress (referencia de endpoints): https://github.com/nomanualdev/correos-de-costa-rica-pymexpress-ws-client
- TrackingMore API: https://www.trackingmore.com/correos-de-costa-rica-tracking-api
- EasyPost (alternativa): https://www.easypost.com/correos-costa-rica-tracking
