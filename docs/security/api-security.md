# Seguridad de API

## Input Validation

### Bean Validation

El sistema usa Jakarta Bean Validation (`@Valid`, `@Validated`) para validar objetos de entrada:

```java
// En controladores:
@PostMapping("/endpoint")
public ResponseEntity<?> create(@Valid @RequestBody ProductoDTO dto) { ... }

// En DTOs:
@NotBlank
@Size(max = 100)
private String nombre;

@Positive
private Integer precio;
```

El `GlobalExceptionHandler` captura errores de validación:
```java
@ExceptionHandler(MethodArgumentNotValidException.class)
// → HTTP 400
// → Agrega todos los mensajes de error de cada campo
// → Sin stack trace en la respuesta

@ExceptionHandler(ConstraintViolationException.class)
// → HTTP 400 — path variables y request params
```

### Validación de contraseñas

```java
// AuthController.esContrasenaValida(String pwd)
private boolean esContrasenaValida(String pwd) {
    if (pwd == null || pwd.length() < 8) return false;
    boolean hasUpper = false, hasDigit = false;
    for (char c : pwd.toCharArray()) {
        if (Character.isUpperCase(c)) hasUpper = true;
        if (Character.isDigit(c))     hasDigit = true;
    }
    return hasUpper && hasDigit;
}
// Reglas: ≥ 8 caracteres, ≥ 1 mayúscula, ≥ 1 dígito
// Aplicado en: /change-password, /reset-password
```

### Protección contra payloads masivos

Spring MVC tiene límite de tamaño en el request body (por defecto sin límite explícito para JSON). Sin embargo, el rate limiter y la detección de patrones mitigan el abuso. Para JSON, el consumo de CPU de Jackson está acotado.

El test `massivePayload_handledGracefully()` verifica que un payload de 10,000 caracteres en el campo correo retorna 401 (no 500 ni timeout).

---

## CORS

**Archivo:** `SecurityConfig.corsConfigurationSource()`

```java
CorsConfiguration config = new CorsConfiguration();
config.setAllowedOrigins(Arrays.asList(allowedOrigins.split(",")));
config.setAllowedMethods(List.of("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
config.setAllowedHeaders(List.of("*"));
config.setAllowCredentials(false);
```

- **Origins:** Configurados via `CORS_ALLOWED_ORIGINS` env var (no hardcodeados)
- **Credenciales:** `false` — No se comparten cookies entre dominios
- **Preflight OPTIONS:** Manejado automáticamente por Spring

**En producción:**
```
CORS_ALLOWED_ORIGINS=https://hotclick.cr,https://www.hotclick.cr
```

**Problema a evitar:** No usar `*` como origin permitido en producción. El `ProductionConfigValidator` alerta si `localhost` aparece en CORS origins en producción.

---

## Anti-enumeración de usuarios

**Problema:** Si el sistema retorna mensajes distintos para "usuario no existe" vs "contraseña incorrecta", un atacante puede enumerar todos los emails registrados.

**Implementación:**

| Escenario | Código HTTP | Mensaje |
|---|---|---|
| Usuario no existe | 401 | "Credenciales inválidas" |
| Contraseña incorrecta | 401 | "Credenciales inválidas" |
| Cuenta bloqueada | 403 | "Cuenta temporalmente bloqueada..." |

El mismo principio aplica en `/forgot-password`: se envía el email si el usuario existe, pero la respuesta HTTP es idéntica en ambos casos.

**Test:** `nonExistentEmail_sameResponseAsWrongPassword()` en `AuthSecurityHardeningTest.java`

---

## Manejo seguro de errores

**Archivo:** `config/GlobalExceptionHandler.java`

Principio: los errores internos no se exponen al cliente. Solo mensajes genéricos.

```java
// Errores de negocio → mensajes específicos pero seguros
TenantAccessDeniedException → 403 "Acceso denegado"
AccessDeniedException       → 403 "Acceso denegado"
SecurityException           → 401 (mensaje de la excepción si es controlado)
NoSuchElementException      → 404 "Recurso no encontrado"

// Errores de validación → mensajes de campos (no stack trace)
MethodArgumentNotValidException → 400 + lista de errores de campo
ConstraintViolationException    → 400 + lista de violaciones

// Errores de input
HttpMessageNotReadableException → 400 "Formato de datos inválido"
IllegalArgumentException        → 400 + mensaje de la excepción
MaxUploadSizeExceededException  → 413 "La imagen no puede superar 10 MB"

// Errores inesperados → mensaje genérico
Exception (fallback)            → 500 "Error interno del servidor"
                                    + log completo con stack trace (solo server-side)
```

---

## Inyección SQL

Todas las queries usan JPA con parámetros nombrados:

```java
@Query("SELECT u FROM Usuario u WHERE u.correo = :correo")
Optional<Usuario> findByCorreo(@Param("correo") String correo);
```

Hibernate genera prepared statements. No hay concatenación de strings en queries. No hay queries nativas con input de usuario (excepto en JPQL con parámetros, que son safe).

---

## Inyección de cabeceras

Los headers de seguridad (CSP, HSTS, etc.) son **escritos por el servidor**, no reflejados desde el cliente. Ningún valor de header proviene del request del cliente.

---

## Swagger / OpenAPI en producción

**Dependencia:** `springdoc-openapi-starter-webmvc-ui 2.6.0`  
**Endpoint:** `/swagger-ui.html` y `/v3/api-docs`

**RIESGO:** Swagger UI expone la documentación completa de la API, facilitando el reconocimiento para atacantes.

**Acción requerida:** Verificar en Render que Swagger no está accesible en producción, o deshabilitarlo:

```properties
# application.properties (si se quiere deshabilitar en producción)
springdoc.swagger-ui.enabled=false
springdoc.api-docs.enabled=false
```

O protegerlo con perfil:
```java
@ConditionalOnProperty(name = "springdoc.swagger-ui.enabled", havingValue = "true", matchIfMissing = true)
```

---

## Sanitización de slugs

El endpoint de creación de empresa usa `slugify()` para generar URLs amigables:

```java
// AuthController.slugify(String text)
String normalized = Normalizer.normalize(text.toLowerCase().trim(), Normalizer.Form.NFD);
return normalized
    .replaceAll("[^\\p{ASCII}]", "")    // quitar no-ASCII (acentos)
    .replaceAll("[^a-z0-9\\s-]", "")    // solo alfanumérico + guión
    .replaceAll("\\s+", "-")
    .replaceAll("-{2,}", "-")
    .replaceAll("^-|-$", "");
// Resultado: "Mi Empresa S.A." → "mi-empresa-s-a"
```

Esto previene inyección de caracteres especiales en URLs y slugs almacenados en DB.

---

## Protección de webhooks

### PayPal

La verificación de firma de webhooks de PayPal está implementada en `WebhookController`. Los webhooks verifican la firma usando el `PAYPAL_WEBHOOK_ID` configurado en env vars.

**Endpoint:** `POST /api/webhooks/paypal` — `permitAll()` pero valida firma  
**Protección contra replay:** PayPal incluye timestamp en firma

### PayXpert

**Estado:** Archivado (2026-05-21). Las credenciales en `application.properties` son `ARCHIVED`. Los endpoints de PayXpert están inactivos.

---

## Monitoring de API abuse

Patrones de abuso que activan eventos en el Security Center:
- `RATE_LIMIT_TRIGGERED` — endpoint + IP
- `BRUTE_FORCE_DETECTED` — ≥5 fallos/10min misma IP
- `JWT_SCANNING_DETECTED` — ≥15 tokens inválidos/5min misma IP
- `PERMISSION_DENIED` — accesos no autorizados (potencial reconocimiento)
