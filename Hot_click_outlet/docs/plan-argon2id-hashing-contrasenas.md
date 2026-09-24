# Plan — Migración a Argon2id para hashing de contraseñas

**Estado:** propuesta. No implementado. El paso previo (bcrypt cost 12) **sí** está aplicado.

## Problema

OWASP recomienda Argon2id como primera opción para hashing de contraseñas; bcrypt
es la alternativa aceptable. Hoy el proyecto usa bcrypt.

| | Estado |
|---|---|
| **Antes** | `new BCryptPasswordEncoder()` → cost 10 (mínimo aceptable OWASP) |
| **Ahora** | `new BCryptPasswordEncoder(bcryptCostOrDefault())` → cost 12, configurable vía `security.password.bcrypt-cost` |
| **Objetivo** | `DelegatingPasswordEncoder` con `{argon2}` por defecto y `{bcrypt}` para legacy |

El cost 12 cierra el hallazgo inmediato. Este documento describe el salto a Argon2id,
que es un cambio mayor porque toca el flujo de login y agrega una dependencia.

## Por qué Argon2id y no seguir subiendo el cost de bcrypt

- Bcrypt usa 4 KiB de memoria fijos: una GPU corre miles de instancias en paralelo.
  Subir el cost encarece al defensor y al atacante por igual, en la misma proporción.
- Argon2id es **memory-hard**: con 19 MiB por hash, una GPU con 24 GB solo sostiene
  ~1.200 instancias concurrentes. El atacante pierde su ventaja de paralelismo.
- Bcrypt **trunca la entrada a 72 bytes**. Argon2id no tiene ese límite, así que las
  passphrases largas cuentan enteras (ver `RegisterRequest.contrasena`).

## 1. Dependencia que hace falta

Spring Security declara `Argon2PasswordEncoder` pero delega el cómputo en Bouncy
Castle, que es **opcional** y hoy no está en el `pom.xml`.

```xml
<dependency>
    <groupId>org.bouncycastle</groupId>
    <artifactId>bcprov-jdk18on</artifactId>
    <version><!-- fijar versión: el BOM de Spring Boot 3.4.4 no la gestiona --></version>
</dependency>
```

Verificar con `.\maven\bin\mvn -pl Hot_click_outlet dependency:tree -Dincludes=org.bouncycastle`
que no entre ya por otra vía (ej. una lib de PDF o JWT) antes de fijar la versión, para
no terminar con dos.

Sin esta dependencia el bean arranca pero revienta con `NoClassDefFoundError` en el
primer `encode()` — es decir, en el primer registro, no al arrancar. Agregar un
`@PostConstruct` que haga un `encode("smoke")` descartable para fallar al inicio.

## 2. Cómo queda el `DelegatingPasswordEncoder`

En `SecurityConfig.passwordEncoder()`:

```java
private static final String ID_ARGON2 = "argon2";
private static final String ID_BCRYPT = "bcrypt";

@Bean
public PasswordEncoder passwordEncoder() {
    BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder(bcryptCostOrDefault());
    Map<String, PasswordEncoder> encoders = Map.of(
        ID_ARGON2, Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8(),
        ID_BCRYPT, bcrypt
    );
    DelegatingPasswordEncoder delegating = new DelegatingPasswordEncoder(ID_ARGON2, encoders);
    delegating.setDefaultPasswordEncoderForMatches(bcrypt);   // ← ver punto 3
    return delegating;
}
```

`defaultsForSpringSecurity_v5_8()` = `m=16384 (16 MiB), t=2, p=1, salt=16B, hash=32B`.
OWASP pide `m=19456 (19 MiB), t=2, p=1`. Si se sube a 19 MiB hay que usar el
constructor explícito y **releer el punto 6 (RAM)** antes.

## 3. El detalle que rompe todo si se olvida

Los hashes en `hot_click_usuario_tb.contrasena_hash` hoy son bcrypt **crudos**:
`$2a$10$...`, sin prefijo. `DelegatingPasswordEncoder.matches()` espera `{id}hash`
y, si no lo encuentra, lanza:

```
IllegalArgumentException: There is no PasswordEncoder mapped for the id "null"
```

Eso es **todos los logins caídos**, no una degradación parcial. Dos formas de evitarlo:

| Opción | Qué hace | Cuándo |
|---|---|---|
| **A — `setDefaultPasswordEncoderForMatches(bcrypt)`** | Los hashes sin prefijo se validan con bcrypt | Obligatoria. Va en el mismo PR. |
| **B — migración Flyway que prefija** | `UPDATE ... SET contrasena_hash = '{bcrypt}' \|\| contrasena_hash WHERE contrasena_hash LIKE '$2%'` | Opcional, después. Permite sacar la opción A cuando no queden crudos. |

Empezar por A. B solo limpia; no habilita nada.

## 4. Dónde va el re-hash oportunista

Un solo lugar: `AuthCredentialLoginHandler.rechazarSiClaveIncorrecta()`, que hoy es el
único punto del login que ve la contraseña en claro.

```java
private ResponseEntity<?> rechazarSiClaveIncorrecta(Usuario usuario, JwtRequest request, HttpServletRequest httpRequest) {
    if (passwordEncoder.matches(request.getContrasena(), usuario.getContrasenaHash())) {
        rehashSiHaceFalta(usuario, request.getContrasena());   // ← nuevo
        return null;
    }
    // ... resto igual
}

private void rehashSiHaceFalta(Usuario usuario, String contrasenaPlana) {
    if (!passwordEncoder.upgradeEncoding(usuario.getContrasenaHash())) return;
    usuario.setContrasenaHash(passwordEncoder.encode(contrasenaPlana));
    usuarioService.guardar(usuario);
}
```

`DelegatingPasswordEncoder.upgradeEncoding()` devuelve `true` cuando el prefijo del
hash no es el `idForEncode` actual. Con la opción A, un hash bcrypt crudo (sin prefijo)
lo resuelve el `defaultPasswordEncoderForMatches`, que **no** participa de
`upgradeEncoding` → devuelve `false` y esos usuarios nunca migran. Por eso conviene
correr la migración B: después de prefijar, `{bcrypt}...` sí dispara el upgrade.

Restricciones:

- Solo en login con contraseña. `AuthPasswordChangeHandler` y `PasswordResetService`
  ya llaman a `encode()` y salen en Argon2id solos.
- El re-hash agrega un `encode()` (~50 ms) al login **una sola vez por usuario**.
- Si el `guardar()` falla, loguear y dejar pasar el login: el usuario ya se autenticó
  bien y reintenta en el próximo ingreso. Nunca convertir un fallo de re-hash en un 500.

## 5. Por qué los hashes existentes siguen funcionando

Tanto bcrypt como Argon2 son **self-describing**: el string guardado lleva algoritmo,
parámetros y salt.

```
$2a$10$N9qo8uLOickgx2ZMRZoMye...       ← bcrypt, cost 10, salt embebido
$2a$12$KIXQb5T1qBgLZ9W3xNvYCu...       ← bcrypt, cost 12
{argon2}$argon2id$v=19$m=16384,t=2,p=1$...
```

`matches()` lee esos parámetros del hash almacenado, no de la configuración actual.
Por eso subir el cost de 10 a 12 (ya hecho) o pasar a Argon2id **no invalida ninguna
contraseña** y no requiere pedirle nada al usuario.

## 6. Esquema de BD: no hace falta migración

| Columna | Tipo actual | Argon2 + prefijo | ¿Alcanza? |
|---|---|---|---|
| `hot_click_usuario_tb.contrasena_hash` | `VARCHAR(255)` | ~110 chars | Sí |
| `hot_click_codigo_otp_tb.codigo_hash` | `VARCHAR(255)` | ~110 chars | Sí |
| `hot_click_usuario_tb.recovery_codes` | `TEXT` | 8 × ~110 + JSON | Sí |

**RAM — el riesgo real en este deploy.** Argon2 con `m=19456` reserva 19 MiB de heap
por hash concurrente. En el EC2 t3.small (2 GB, compartido con nginx y el sidecar de
guardrails) 30 logins simultáneos son ~570 MiB de pico. Antes de subir a 19 MiB:
medir con `docker stats` bajo carga, o quedarse en los 16 MiB del default de Spring.

Ojo con `AuthTotpSetupHandler` / `AuthTotpRecoveryHandler`: hashean 8 recovery codes en
un stream secuencial. Con Argon2id eso es 8 × 19 MiB **secuenciales** (no simultáneos),
pero ~8 × 50 ms de latencia en una sola request.

## 7. Cómo se verifica la migración

**Antes del deploy** — test de compatibilidad (el que ya existe en
`PasswordEncoderConfigTest`, extendido):

```java
@Test
void argon2PorDefecto_peroBcryptLegacySigueValidando() {
    PasswordEncoder enc = passwordEncoderDeSecurityConfig();
    assertThat(enc.encode("x")).startsWith("{argon2}");
    assertThat(enc.matches("secreto", "$2a$10$<hash-cost-10-real>")).isTrue();
    assertThat(enc.matches("secreto", "$2a$12$<hash-cost-12-real>")).isTrue();
}
```

**Después del deploy** — avance de la migración en producción:

```sql
SELECT CASE
         WHEN contrasena_hash LIKE '{argon2}%' THEN 'argon2'
         WHEN contrasena_hash LIKE '{bcrypt}%' THEN 'bcrypt-prefijado'
         WHEN contrasena_hash LIKE '$2%'       THEN 'bcrypt-crudo'
         ELSE 'desconocido'
       END AS formato,
       count(*)
FROM hot_click_usuario_tb
GROUP BY 1;
```

Correrlo semanalmente. Criterio de salida: `argon2` cubre a los usuarios activos
(los inactivos nunca van a migrar solos — es esperado, no un bug). Cuando no queden
`bcrypt-crudo`, se puede sacar `setDefaultPasswordEncoderForMatches`.

**Señales de alarma en las primeras 24 h:**

- Cualquier `There is no PasswordEncoder mapped for the id` en los logs → rollback.
- `logLoginFailed` con motivo `wrong_password` por encima de la línea base.
- Latencia p95 de `POST /api/auth/login` (el re-hash agrega un `encode()` por usuario
  la primera vez; debería normalizarse al segundo login).

**Rollback:** volver el bean a `new BCryptPasswordEncoder(cost)`. Los usuarios que ya
migraron a `{argon2}` **no van a poder entrar** — `BCryptPasswordEncoder.matches()`
sobre un hash `{argon2}...` devuelve `false` y loguea "Encoded password does not look
like BCrypt". Por eso el rollback hay que decidirlo en las primeras horas, o preverlo
dejando el `DelegatingPasswordEncoder` con `idForEncode = bcrypt` (revierte el default
sin romper a los ya migrados). Esta segunda forma es la recomendada.

## 8. Contraseñas filtradas — Have I Been Pwned (k-anonymity)

Hallazgo separado, mismo tema. Hoy el mínimo es 8 caracteres sin más chequeos, así que
`12345678` pasa. Exigir símbolos y mayúsculas no ayuda (produce `Password1!`); lo que
sirve es rechazar contraseñas que ya están en un dump conocido.

**Cómo funciona k-anonymity:** se calcula el SHA-1 de la contraseña, se mandan los
**primeros 5 caracteres del hash** a `https://api.pwnedpasswords.com/range/{prefijo}`,
y la API devuelve ~800 sufijos con su conteo. La comparación se hace local. La
contraseña nunca sale del servidor, ni completa ni hasheada entera.

Spring Security trae el cliente: `HaveIBeenPwnedRestApiPasswordChecker`
(`spring-security-core` 6.3+, sin dependencias extra).

Dónde iría:

| Camino | Archivo |
|---|---|
| Registro usuario | `AuthRegistrationService.register()` |
| Registro empresa | `EmprendedorRegistroService.registrar()` |
| Cambio de contraseña | `AuthPasswordChangeHandler` |
| Reset | `PasswordResetService` |

Decisiones a tomar antes de implementar:

1. **Es una llamada de red en el camino de registro.** Timeout corto (≤ 2 s) y
   *fail-open*: si la API no responde, se acepta la contraseña. Nunca bloquear un
   registro porque un tercero está caído.
2. **No validar en login**, solo al fijar una contraseña. En login agrega latencia y
   no aporta (la contraseña ya existe).
3. **Mensaje al usuario**: "Esta contraseña apareció en filtraciones conocidas. Elegí
   otra." Sin el conteo de apariciones — asusta y no ayuda a decidir.
4. **Rate limit**: la API es gratuita y sin key, pero conviene cachear los prefijos
   consultados (Caffeine, ya está en el proyecto) para no salir a la red en cada intento.

## Fuera de alcance de este documento

- Aumentar el mínimo de 8 caracteres (decisión de producto, no técnica).
- 2FA obligatorio para EMPRENDEDOR/ADMIN.
- Rotación forzada de contraseñas (OWASP la desaconseja explícitamente).

## Orden de trabajo sugerido

| # | Trabajo | Riesgo |
|---|---|---|
| 1 | ~~bcrypt cost 10 → 12~~ **hecho** | Bajo |
| 2 | Falta `@Valid` en `/auth/registro-empresa` y `/auth/nuevo-negocio` (`AuthController`): hoy el `@Size` de `RegistroEmpresaDTO` no se aplica | Bajo |
| 3 | HIBP en registro y cambio de contraseña | Medio (red) |
| 4 | Bouncy Castle + `DelegatingPasswordEncoder` + re-hash oportunista | Alto (toca login) |
| 5 | Flyway que prefija `{bcrypt}` y retiro de `setDefaultPasswordEncoderForMatches` | Bajo, después de que 4 esté estable |
