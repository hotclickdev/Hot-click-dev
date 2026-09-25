# Upgrade — Spring Boot 3.4.4 → 3.5.16

**Estado:** pom aplicado (parent + deps de choque/CVE). **Sin** cambios `.java`.
**Verificación Maven:** pendiente (este cambio se documentó sin correr `mvn`).

| | Valor |
|---|---|
| **Origen** | `spring-boot-starter-parent` **3.4.4** (`Hot_click_outlet/pom.xml` L16) |
| **Destino** | **3.5.16** (último OSS de la línea 3.5.x en Maven Central) |
| **Java** | `java.version=21` (sin cambio; 3.5.16 soporta 17–25) |
| **Fecha investigación** | 2026-09-23 |

## Por qué 3.5.16 y no el último parche 3.4.x

| Opción | Versión Maven Central | OSS support | Parches Actuator 2026 |
|---|---|---|---|
| Quedarse / parche 3.4 | **3.4.13** (último en Central) | EOL **2025-12-31** | **CVE-2026-22731 / 22733** → fix **3.4.15 solo Enterprise** |
| Saltar a 3.5 | **3.5.16** (último OSS 3.5) | EOL **2026-06-30** (también pasado) | Fix OSS en **3.5.12+** |

Subir solo a **3.4.13** hubiera sido la respuesta “ciega-segura” (sin compile), pero **no** cierra los bypass de Actuator en Central. Hotclick **no** tiene `spring-boot-starter-actuator` (comentado en `application.properties`), así que el riesgo residual de esos CVE es bajo hoy; aun así 3.5.16 es el camino OSS correcto y trae el resto de upgrades de Framework/Tomcat/Jackson del year.

**Riesgo aceptado:** no se corrió Maven en este cambio. Compilar/testear antes de deploy es obligatorio (checklist abajo).

### Fuentes

- [Spring Boot 3.5.16 available now](https://spring.io/blog/2026/06/25/spring-boot-3-5-16-available-now) — último OSS 3.5.x
- [Spring Boot 3.4.13 available now](https://spring.io/blog/2025/12/18/spring-boot-3-4-13-available-now) — fin OSS 3.4.x
- [Support / EOL 3.4](https://endoflife.ai/spring-boot/3.4) · [tabla Spring Boot](https://endoflife.ai/spring-boot)
- [Spring Boot 3.5 Release Notes](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.5-Release-Notes)
- [Configuration Changelog 3.4→3.5](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.5-Configuration-Changelog)
- [CVE-2026-22731](https://spring.io/security/cve-2026-22731) · [CVE-2026-22733](https://spring.io/security/cve-2026-22733)
- [CVE-2025-22235](https://www.cve.org/CVERecord?id=CVE-2025-22235) (EndpointRequest `/null/**`, fix ≥3.4.5)
- [springdoc #3005](https://github.com/springdoc/springdoc-openapi/issues/3005) · [v2.8.17](https://github.com/springdoc/springdoc-openapi/releases/tag/v2.8.17)
- [CVE-2026-71497 jsoup](https://nvd.nist.gov/vuln/detail/CVE-2026-71497)

## CVEs relevantes vs 3.4.4

| CVE | Resumen | Fix OSS | Impacto Hotclick |
|---|---|---|---|
| **CVE-2025-22235** | `EndpointRequest.to()` → matcher `/null/**` si el endpoint no está expuesto | ≥ **3.4.5** | Bajo: no usamos `EndpointRequest`; actuator no instalado |
| **CVE-2026-22731** | Auth bypass bajo paths de Health groups | **3.5.12** (3.4.15 Enterprise) | Bajo sin actuator; igual hay que salir de 3.4.4 |
| **CVE-2026-22733** | Auth bypass bajo Actuator CloudFoundry | **3.5.12** (3.4.15 Enterprise) | Ídem |
| Otros listados en scanners para 3.4.4 (cert validation / temp files 2026) | Varios | 3.5.14+ / commercial 3.4.16+ | Cubiertos al ir a **3.5.16** |

## Cambios aplicados en `pom.xml` (solo pom)

| Artefacto | Antes | Después | Motivo |
|---|---|---|---|
| `spring-boot-starter-parent` | 3.4.4 | **3.5.16** | Salto justificado |
| `springdoc-openapi-starter-webmvc-ui` | 2.6.0 | **2.8.17** | **Choque duro** con Boot 3.5 (`HateoasProperties.getUseHal…` → `isUseHal…`); 2.8.9+ obligatorio |
| `jsoup` | 1.17.2 | **1.23.2** | **CVE-2026-71497**; bump solo versión. Built-in `Safelist.none()` / `basic()` no son el vector del advisory |
| `jackson-dataformat-cbor` (pin + dep) | 2.18.3 | **2.21.4** | Alinear al BOM 3.5.16; evita classpath Jackson viejo vs Boot |
| `jjwt-*` | 0.11.5 | **0.11.5** (sin cambio) | 0.12 obliga reescribir `JwtUtil` — ver mapeo abajo |
| `awssdk` s3/rekognition | 2.25.60 | **2.25.60** | GHSA-443w-3rq3-5m5h es del módulo **cloudfront** (sin CVE ID); no usamos CloudFront signing → no bump |
| `resilience4j-spring-boot3` | 2.2.0 | 2.2.0 | Compatible Boot 3 / Spring 6; sin choque conocido |
| `sentry-spring-boot-starter-jakarta` | 7.14.0 | 7.14.0 | Línea Jakarta Boot 3; sin bump forzado |
| `selenium-java` | 4.27.0 | 4.27.0 | Pin explícito; Boot gestiona 4.31.0 pero no hace falta alinear sin CVE |

## Qué puede romper (migración 3.4 → 3.5)

De las [release notes 3.5](https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-3.5-Release-Notes):

1. **Boolean `.enabled`** — solo `true`/`false` (valores raros dejan de contar como enabled).
2. **Nombres de profile** — letras/dígitos/`-`/`_` (desde 3.5.1 también `.` `+` `@`); no empezar/terminar con `-`/`_`. Hotclick usa `local` → OK.
3. **Bean `taskExecutor`** — el alias auto-configurado desaparece; queda `applicationTaskExecutor`. Buscar `@Qualifier("taskExecutor")` / `getBean("taskExecutor")` si falla arranque.
4. **Redis URL vs `database`** — si hubiera `spring.data.redis.url`, la DB la dicta la URL. Hotclick no usa Redis URL hoy.
5. **heapdump actuator** — default `access=NONE`. Sin actuator → N/A.
6. **Removals de APIs deprecadas en 3.3** — si algún código nuestro (o lib) aún llama APIs removidas en 3.5, falla en compile/runtime.
7. **Upgrades transitivos** — Spring Security **6.5**, Spring Framework **6.2.x**, Hibernate **6.6.x**, Jackson **2.21.x**, Tomcat **10.1.x**.

Propiedades renombradas (OpenRewrite / config changelog) que **no** usamos hoy:  
`spring.mvc.converters.preferred-json-mapper` → `spring.http.converters.preferred-json-mapper`, `spring.codec.*` → `spring.http.codecs.*`, etc.

## Dependencias pineadas — veredicto

| Dep | ¿Choca con 3.5.16? | Acción |
|---|---|---|
| springdoc **2.6.0** | **Sí** (arranque) | Subido a **2.8.17** |
| jjwt **0.11.5** | No (API propia) | Queda; doc 0.12 abajo |
| jsoup **1.17.2** | No de Boot; **CVE** | Subido a **1.23.2** |
| awssdk **2.25.60** | No de Boot; GHSA solo cloudfront | Sin cambio |
| resilience4j **2.2.0** | No | Sin cambio |
| sentry **7.14.0** | Bajo riesgo | Sin cambio (opcional futuro: 8.x) |
| jackson-cbor **2.18.3** | **Sí** vs BOM 2.21.4 | Pin a **2.21.4** |
| selenium **4.27.0** | No crítico | Sin cambio |

## jjwt 0.11.5 → 0.12.x — mapeo API (NO aplicado)

Archivo: `Hot_click_outlet/src/main/java/com/hotclick/security/JwtUtil.java`  
Fuente: [jjwt 0.12.0 CHANGELOG](https://github.com/jwtk/jjwt/blob/0.12.0/CHANGELOG.md).

| Línea(s) | API 0.11.5 (actual) | API 0.12+ |
|---|---|---|
| L4 | `import io.jsonwebtoken.SignatureAlgorithm` | Quitar; usar `Jwts.SIG` |
| L10 / L33–35 | `Key getSigningKey()` + `Keys.hmacShaKeyFor(...)` | Preferir `SecretKey` (tipo que exige `verifyWith`) |
| L50–54 | `Jwts.parserBuilder().setSigningKey(key).build().parseClaimsJws(token).getBody()` | `Jwts.parser().verifyWith(secretKey).build().parseSignedClaims(token).getPayload()` |
| L109–115 | `.setClaims` / `.setSubject` / `.setIssuedAt` / `.setExpiration` / `.signWith(key, SignatureAlgorithm.HS256)` | `.claims(...)` / `.subject(...)` / `.issuedAt(...)` / `.expiration(...)` / `.signWith(key)` o `.signWith(Jwts.SIG.HS256, key)` según overload |

`JwtUtilTest.java` y cualquier mock que asuma el parser viejo habría que retocar en el mismo PR que suba jjwt.

## Cambios Java que **no** se hicieron

Ninguno en este cambio (restricción explícita). Pendientes solo si el compile/arranque lo exige:

| Si falla… | Archivo probable | Acción documentada |
|---|---|---|
| Arranque por bean `taskExecutor` | Cualquier `@Qualifier("taskExecutor")` / `AsyncConfigurer` | Alias o usar `applicationTaskExecutor` |
| jjwt 0.12 (futuro) | `JwtUtil.java` L4, L33–35, L50–54, L109–115 | Tabla de mapeo arriba |
| Sentry auto-config rara | beans Sentry | Probar bump a `sentry-spring-boot-starter-jakarta` 8.x en PR aparte |

## Checklist pre-deploy

1. `.\maven\bin\mvn -pl Hot_click_outlet -DskipTests package` — debe compilar limpio.
2. `.\maven\bin\mvn -pl Hot_click_outlet test` — suite Java.
3. Arranque local (`spring-boot:run` / Docker) con profile `local`.
4. Smoke: login JWT, `/v3/api-docs` + Swagger UI (springdoc 2.8), upload S3, scraping Jsoup, circuit breaker Resilience4j.
5. Confirmar que **no** se agregó actuator por accidente.
6. `pnpm build` del frontend **antes** de `docker build` (regla de repo; no relacionado al pom, pero sí al deploy).

## Rollback

1. Revertir en `pom.xml`: parent `3.5.16` → `3.4.4`, springdoc `2.8.17` → `2.6.0`, jsoup `1.23.2` → `1.17.2`, jackson-cbor `2.21.4` → `2.18.3`.
2. Rebuild imagen / redeploy compose (`docker-compose.prod.yml`).
3. No hay migración Flyway asociada a este upgrade → la DB no se toca.

## Comando de verificación

```bash
.\maven\bin\mvn -pl Hot_click_outlet -DskipTests package
.\maven\bin\mvn -pl Hot_click_outlet test
```

Opcional: `.\maven\bin\mvn -pl Hot_click_outlet dependency:tree -Dincludes=org.springframework.boot:spring-boot,org.springdoc,org.jsoup,com.fasterxml.jackson.dataformat:jackson-dataformat-cbor`
