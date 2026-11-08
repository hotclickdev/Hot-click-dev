# HTTPS local de QA y excepción de un alta PYME TEST

Preparación. No crea el negocio, no cobra, no instala una CA y no toca producción.

La superficie de hoy es `http://localhost:3000/registro-empresa` (Vite en el puerto 3000, proxy de `/api` a `http://localhost:8080`). No hay en este repo otra superficie HTTPS de QA ya acreditada. Este documento no promete que el Vault de ONVO acepte `localhost`.

## Qué se observó y qué no se pudo verificar

Quien opera el Vault reporta dos controles distintos:

1. El Vault genera un acceso nuevo solo si la página es HTTPS.
2. `RequestUserForm` rechaza el dominio `localhost`.

Este entorno no llama al Vault, no tiene las llaves reales y no instaló una CA. Los dos controles quedan como reporte, no como una prueba repetida acá. Un certificado válido en `localhost` puede cumplir el control de TLS y seguir fallando el de dominio. Si después de los pasos locales el formulario sigue rechazando `localhost`, ahí se frena: no se inventa otro host, no se ignora TLS y no se usa un túnel público.

## HTTPS local que sí queda preparado

El dev server sigue en HTTP si no hay variables. Si las dos están definidas y los archivos existen, Vite sirve `https://localhost:3000` con ese material:

- `VITE_DEV_HTTPS_KEY`
- `VITE_DEV_HTTPS_CERT`

El proxy de `/api` no cambia de destino y no apaga `secure`. El navegador habla con el mismo origen (`/api` relativo en `api.ts`); Vite reenvía a `http://localhost:8080`. Eso no es contenido mixto. El backend no pasa a TLS.

`application-dev.properties` suma `https://localhost:3000` y `https://127.0.0.1:3000` al CORS de desarrollo, para cuando esa página exista. El default de `app.url` sigue en `http://localhost:3000`.

### Pasos locales que requieren autorización y no se ejecutaron

Hacerlos en la máquina de quien va a probar, con una CA local nueva. No reutilizar material de producción ni commitear los PEM (`Hot_click_outlet/frontend/certs/local/` está en `.gitignore`).

1. Instalar [mkcert](https://github.com/FiloSottile/mkcert) y correr `mkcert -install`. Eso mete la CA local en el trust store del sistema y de los navegadores que mkcert conoce. Hay que revisarlo y aceptarlo en esa máquina; este cambio no lo hace.
2. En `Hot_click_outlet/frontend/certs/local/`:

   `mkcert -key-file localhost-key.pem -cert-file localhost.pem localhost 127.0.0.1 ::1`

   Esos nombres son el loopback, no un dominio nuevo. La página se abre como `https://localhost:3000`. No agregar un nombre en `/etc/hosts` ni un túnel.
3. Exportar `VITE_DEV_HTTPS_KEY` y `VITE_DEV_HTTPS_CERT` hacia esos dos archivos y arrancar `pnpm dev`.
4. Confiar el candado en el navegador (la CA del paso 1). Si el navegador avisa que el certificado no es de confianza, no seguir con el Vault.
5. Para que los retornos de pago usen el mismo origen, en esa sesión local exportar `APP_URL=https://localhost:3000`. No dejarlo así en un entorno compartido.
6. Abrir `https://localhost:3000/registro-empresa` y mirar el formulario de ONVO. Si pide HTTPS y el candado es el de mkcert, el primer control está cubierto en esa máquina. Si rechaza el host `localhost` igual, el segundo control no se resuelve con este certificado. Parar y reportarlo. No declarar el alta ONVO como hecha.

## Excepción de un solo alta PYME a cobro TEST

El alta normal deja el negocio `PENDIENTE_CUPO` (plan Emprendedor). El puesto y los días (`hotclick.trial-emprendedor.cupo` 70, `hotclick.trial-emprendedor.dias` 90) se asignan al aprobar. Esos defaults no se mueven. Los precios USD que ya documenta el repo siguen: PYME 24 y Negocio Plus 49 (`.env.example` y `application-dev.properties`). No se cambia la regla de subida a Negocio Plus: precio completo, sin prorrateo, período desde el pago confirmado, y el plan viejo sigue hasta ese pago.

La excepción es la fila de `V235__qa_alta_pyme_test.sql`:

| Campo | Valor |
| --- | --- |
| Correo | `qa.sim.alta20261108@hotclick.test` |
| Plan | PYME |
| Estado inicial | `DISPONIBLE` |
| Vence | 30-nov-2026 23:59:59, hora de Costa Rica |

`HOTCLICK_QA_ALTA_PYME_TEST_HABILITADO` sale en `false`. Con el flag apagado, ese correo no toma el atajo demo de `@hotclick.test`: queda pendiente de cupo, como un alta real, y la fila no se toca. Las otras cuentas `@hotclick.test` siguen el demo de desarrollo.

La fila se consume solo si, a la vez:

- el flag de servidor está en true (no hay campo, query ni header del cliente que lo encienda);
- el perfil activo es únicamente `dev`, `test`, o los dos (prod, production, staging, sin perfil o cualquier mezcla no entran);
- `ONVO_SECRET_KEY` empieza por `onvo_test_` y tiene cuerpo, y no contiene `onvo_live_`;
- `ONVO_PUBLISHABLE_KEY` empieza por `onvo_test_` o `pk_test`, y no es live ni vacía.

El consumo es un `UPDATE` condicionado (`DISPONIBLE`, sin revocar, `vence_en` todavía en el futuro). Dos altas a la vez dejan una sola fila `CONSUMIDO`. Si la transacción del registro se revierte, la fila vuelve a `DISPONIBLE` y se puede reintentar. Un commit segundo no la toma. Pasada la fecha, el intento la deja `EXPIRADO`. `QaAltaPymeTestService.revocar()` la cierra antes del uso; no hay endpoint para eso. Revocar no deshace un consumo ya guardado.

El negocio, cuando la puerta sí se abre, queda plan PYME, `REQUIERE_MEMBRESIA`, sin puesto y sin fechas de trial, y sigue `PENDIENTE_APROBACION`. Al aprobarlo no se llama al cupo: no se publica y no arranca el trial de 90 días. El cobro posterior es el `cambiarPlan` que ya existe. Sin puesto de trial, `diasRestantes` es 0, así que ese camino pide el precio completo. Este cambio no llama a ONVO, no crea la suscripción y no valida webhook, timeout ni cruce de día.

El correo del negocio tiene que ser exactamente el del fixture (mayúsculas y espacios no importan; un `+alias` no matchea). El correo del admin, si es otro, no enciende la excepción.

## Qué queda pendiente antes de merge y antes del alta

- CI de este PR en verde, con el hash que se indique en el PR.
- Veredicto APTO de Seguridad. El cambio toca planes y la puerta de un alta de pago.
- Autorización para `mkcert -install` en la máquina local, y la prueba del Vault descrita arriba.
- Recién entonces, en local y con llaves TEST ya configuradas fuera del repo: encender el flag, registrar solo `qa.sim.alta20261108@hotclick.test`, aprobar y seguir el cobro PYME TEST. No hacerlo desde este entorno.
- No registrar ese correo con el flag apagado si se quiere conservar el único uso: el alta normal ocuparía el correo y la fila no podría crear otro negocio con el mismo correo.
- No usar la fila para emp13, emp20, otras tiendas ni para cerrar el flujo de la subida a Negocio Plus.
