# Autorización — RBAC y Tenant Isolation

## Modelo de roles

El sistema implementa RBAC (Role-Based Access Control) con 4 roles, más un modelo de tenant isolation por empresa.

```
ADMIN_IT         (nivel 10) — Superadmin del sistema
EMPRENDEDOR      (nivel 5)  — Dueño de negocio
ADMIN_CLIENTE    (nivel 3)  — Administrador de un negocio específico
USUARIO_FINAL    (nivel 1)  — Cliente del e-commerce
```

Los roles se almacenan en `hot_click_rol_tb` y se asignan a usuarios en `hot_click_usuario_tb` (relación ManyToMany).

---

## Permisos por rol

### ADMIN_IT
- Acceso total al sistema sin restricción de empresa
- Único rol con acceso a `/actuator/**`
- Único rol con acceso a `/api/security/**` (Security Center)
- Único rol con acceso a `/api/admin/empresas/**` (gestión de tenants)
- Único rol con acceso a `/api/usuarios` (lista de todos los usuarios)
- Puede ejecutar `AdminResetController.resetDatos()` (purge de datos)
- `CompanyScope.getCurrentEmpresaId()` retorna `null` → sin filtro de tenant

### EMPRENDEDOR
- Acceso a su empresa asignada vía JWT `empresaId`
- Puede crear/gestionar productos, pedidos, finanzas de su empresa
- Puede gestionar equipo: invitar ADMIN_CLIENTE, cambiar roles, remover
- Puede crear negocios adicionales (máximo 20 negocios por usuario)
- No puede ver datos de otras empresas

### ADMIN_CLIENTE
- Subconjunto de EMPRENDEDOR sin gestión de equipo ni de la empresa
- Puede gestionar productos, pedidos y finanzas de su empresa asignada
- No puede cambiar roles ni remover miembros del equipo

### USUARIO_FINAL
- Acceso al catálogo público, su perfil, sus pedidos propios
- No tiene acceso a ninguna ruta `/api/admin/**`
- No puede listar pedidos de otros usuarios

---

## Implementación en SecurityConfig

Las reglas de autorización HTTP se definen en `SecurityConfig.java` con el patrón:
```java
.requestMatchers("/ruta").hasRole("ROL")
// o
.requestMatchers("/ruta").hasAnyRole("ROL1", "ROL2")
// o
.requestMatchers("/ruta").authenticated()
// o
.requestMatchers("/ruta").permitAll()
```

**Orden crítico:** Las reglas se evalúan de arriba hacia abajo. Las más específicas deben ir primero.

Reglas críticas de seguridad:
```java
// Actuator — superadmin exclusivo
.requestMatchers("/actuator/**").hasRole("ADMIN_IT")

// Security Center — superadmin exclusivo
.requestMatchers("/api/security/**").hasRole("ADMIN_IT")

// Lista de usuarios — solo superadmin
.requestMatchers(GET, "/api/usuarios").hasRole("ADMIN_IT")

// Gestión de empresas — solo superadmin
.requestMatchers("/api/admin/empresas/**").hasRole("ADMIN_IT")

// Productos — lectura pública, escritura requiere rol empresa
.requestMatchers(GET, "/api/productos").permitAll()
.requestMatchers(POST, "/api/productos").hasAnyRole("ADMIN_IT", "EMPRENDEDOR", "ADMIN_CLIENTE")
```

---

## Double-defense: @PreAuthorize

Además de las reglas en SecurityConfig, los endpoints más sensibles tienen `@PreAuthorize` a nivel de método:

```java
// SecurityController.java
@RestController
@RequestMapping("/api/security")
@PreAuthorize("hasRole('ADMIN_IT')")    // ← todo el controller
public class SecurityController { ... }

// AdminResetController.java
@PostMapping("/api/admin/reset-datos")
@PreAuthorize("hasRole('ADMIN_IT')")   // ← método individual
public ResponseEntity<?> resetDatos() { ... }
```

**Por qué doble validación:** Si alguien modifica SecurityConfig accidentalmente, el @PreAuthorize actúa como red de seguridad. Dos puntos de falla independientes.

---

## Tenant Isolation — CompanyScope

**Archivo:** `security/CompanyScope.java`

El aislamiento de tenants es el control más importante para un SaaS multi-negocio. Garantiza que los datos de un negocio no sean accesibles por otro.

### Mecanismo

```
1. Usuario hace login → JWT contiene claim empresaId
2. En cada request autenticado:
   - CompanyScope.getCurrentEmpresaId() extrae empresaId del JWT
   - Al acceder a un recurso: assertCanAccess(recurso.empresaId)
   - Si el empresaId del recurso != empresaId del JWT → TenantAccessDeniedException → 403
   - ADMIN_IT: bypass total (empresaId del JWT = null → todas las empresas)
```

### API del CompanyScope

```java
// Obtener empresa del contexto actual (puede ser null para ADMIN_IT)
Long empresaId = companyScope.getCurrentEmpresaId();

// Verificar acceso a un recurso (lanza 403 si no tiene acceso)
companyScope.assertCanAccess(producto.getEmpresaId());

// Verificar acceso cuando el recurso puede ser huérfano (null empresa)
// Solo ADMIN_IT puede acceder a recursos sin empresa
companyScope.assertCanAccessNullable(recurso.getEmpresaId());

// Helpers de rol
boolean isAdmin   = companyScope.isAdminIT();
boolean isEmprendedor = companyScope.isEmprendedor();
boolean hasRole   = companyScope.hasRole("EMPRENDEDOR");

// Usuario actual del contexto de seguridad
Usuario current = companyScope.getCurrentUser();
```

### Ejemplo de uso en controlador

```java
@GetMapping("/{id}")
public ResponseEntity<Producto> getProducto(@PathVariable Long id) {
    Producto producto = productoRepo.findById(id)
        .orElseThrow(() -> new NoSuchElementException("Producto no encontrado"));
    
    // Tenant isolation: solo el dueño del negocio o ADMIN_IT puede ver
    companyScope.assertCanAccess(producto.getEmpresaId());
    
    return ResponseEntity.ok(producto);
}
```

### Propagación del tenant en JWT

Al hacer login con múltiples negocios, el usuario selecciona uno:
```
POST /api/auth/seleccionar-empresa
Body: { "tempToken": "<EmpresaSelectionToken>", "empresaId": 42 }

→ Nuevo AccessToken con claim empresaId=42
```

Al cambiar de negocio (ya autenticado):
```
POST /api/auth/cambiar-negocio
Body: { "empresaId": 43 }

→ Nuevo AccessToken con claim empresaId=43
→ El refresh token previo queda asociado al usuario, no a la empresa
```

---

## Protección de rutas del SPA

Las rutas del frontend React se protegen con:

```jsx
// App.jsx
function AdminRoute({ children, itOnly = false }) {
  const { token, userRole } = useAuthStore()
  if (!isTokenAlive(token)) return <Navigate to="/login" replace />
  const isAdmin = ['ADMIN_IT', 'ADMIN_CLIENTE', 'EMPRENDEDOR'].includes(userRole)
  if (!isAdmin) return <Navigate to="/" replace />
  if (itOnly && userRole !== 'ADMIN_IT') return <Navigate to="/admin" replace />
  return children
}

// Ejemplo de uso:
<Route path="/admin/security"
  element={<AdminRoute itOnly><AdminSecurityCenter /></AdminRoute>} />
<Route path="/admin/usuarios"
  element={<AdminRoute itOnly><AdminUsers /></AdminRoute>} />
```

**Importante:** Esta protección es de UX, no de seguridad. La seguridad real está en el backend. Un atacante que llame directamente a la API recibirá 403 del servidor independientemente del estado del frontend.

---

## Modelo de membresías (multi-tenant)

Un usuario puede pertenecer a múltiples empresas con roles distintos en cada una:

```
hot_click_miembro_empresa_tb
  id_miembro
  fk_id_usuario    → hot_click_usuario_tb
  fk_id_empresa    → hot_click_empresa_tb
  rol_en_empresa   → 'EMPRENDEDOR' | 'ADMIN_CLIENTE'
  estado           → 1 (activo) | 0 (inactivo)
  fecha_ingreso
```

El rol efectivo en el JWT es el `rol_en_empresa` de la membresía seleccionada, NO el rol global del usuario.

---

## TenantAccessDeniedException → 403

Cuando `assertCanAccess()` detecta una violación:

```java
// CompanyScope.java
public void assertCanAccess(Long resourceEmpresaId) {
    if (isAdminIT()) return;           // ADMIN_IT pasa siempre
    Long currentId = getCurrentEmpresaId();
    if (!Objects.equals(currentId, resourceEmpresaId)) {
        throw new TenantAccessDeniedException(
            "Acceso denegado: recurso pertenece a otra empresa");
    }
}
```

```java
// GlobalExceptionHandler.java
@ExceptionHandler(TenantAccessDeniedException.class)
public ResponseEntity<?> handleTenantAccess(TenantAccessDeniedException ex) {
    return ResponseEntity.status(403).body(
        ResponseDTO.error("Acceso denegado"));    // Mensaje genérico al cliente
}
// El detalle completo va a logs internos, nunca al cliente
```

---

## Checklist de security review para nuevos endpoints

Al agregar un nuevo endpoint, verificar:

- [ ] ¿Está en SecurityConfig con el rol correcto? (ni más permisivo ni más restrictivo)
- [ ] ¿Tiene `@PreAuthorize` si es operación sensible?
- [ ] ¿Llama `companyScope.assertCanAccess()` si devuelve/modifica datos de una empresa?
- [ ] ¿Tiene `assertCanAccessNullable()` si el recurso puede no tener empresa?
- [ ] ¿La ruta SPA tiene `AdminRoute` con `itOnly` si corresponde?
- [ ] ¿La ruta SPA está en el permit-list de SecurityConfig (para que Spring sirva el HTML)?
