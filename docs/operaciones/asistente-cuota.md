# Cupo diario del asistente: operación

## Sal de IPs (`ASISTENTE_CUOTA_SAL_IP`)
- **Recomendado:** definir `ASISTENTE_CUOTA_SAL_IP` en producción con un valor aleatorio propio (32 bytes o más), distinto de `JWT_SECRET`.
- Si no está definida, se deriva una subclave con HMAC-SHA256(`JWT_SECRET`, `hotclick/asistente-cuota/sal-ip/v1`). El secreto JWT nunca se usa en crudo.
- Si faltan las dos, la app **no arranca**. No hay respaldo con SHA-256 sin llave.
- Cambiar la sal (o rotar `JWT_SECRET` sin sal propia) reinicia los contadores por red del día. Es aceptable, pero conviene hacerlo de madrugada.

## IP real detrás de CDN o proxy
- Los topes por IP y subred usan la IP que resuelve `ClientIpResolver`. Si hay CDN o balanceador, sus rangos **deben** ir en `SECURITY_TRUSTED_PROXIES` (`security.trusted-proxies`).
- Si no van, todo el tráfico parece venir de pocas IPs del CDN y choca con los topes de red. Y si se confía en un `X-Forwarded-For` que no viene de un proxy listado, un atacante puede falsear su IP.

## Llaves viejas con IP en claro
- Antes de MEDIO-2 las llaves `r:`, `s:`, `rn:` y `c:ip:` guardaban la IP en claro. Desde este cambio se guarda una huella HMAC.
- Las filas viejas no se migran: la purga diaria (`PURGAR`, filas de días anteriores) las elimina sola, sin acción manual.

## `x:desconocida` es un pozo compartido
- Todo pedido sin IP utilizable (ausente o no literal) comparte un solo cupo diario, `ASISTENTE_CUOTA_IP_DESCONOCIDA_DIA` (100).
- Si se llena, **todos** los visitantes sin IP quedan sin asistente ese día. Si pasa seguido, revisar primero `SECURITY_TRUSTED_PROXIES` antes de subir el tope.

## Otras variables
- `ASISTENTE_CUOTA_IP_DIA`, `ASISTENTE_CUOTA_SUBRED_DIA` y `ASISTENTE_CUOTA_SUBRED_NEGOCIO_DIA`.
- `ASISTENTE_CUOTA_PREFIJO_V4_SUBRED` (24), `ASISTENTE_CUOTA_PREFIJO_V6_IP` (64) y `ASISTENTE_CUOTA_PREFIJO_V6_SUBRED` (48).
- `ASISTENTE_CUOTA_ALERTA_GLOBAL_PORCENTAJE` (80): log ERROR una vez por día, sin IP ni visitorId.
