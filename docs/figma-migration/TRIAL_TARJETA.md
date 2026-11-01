# Trial Emprendedor · captura de tarjeta (ONVO)

Flujo: el dueño de un negocio en `TRIAL` ve los días que le quedan y «Agregar tarjeta»; el botón abre el SDK web de ONVO
sobre la suscripción del trial (`paymentBehavior=allow_incomplete`, sin cobro). Con `PENDIENTE_CUPO` (#419) solo se avisa
que se espera la aprobación. La tarjeta guardada se lee de `paymentMethodId` de la suscripción ONVO (sin columna nueva).

## Pantalla derivada de Figma
El archivo Figma (`TmxYFj2nauu10WZnZ0t6yt`) **no tiene un frame de facturación del vendedor**. La tarjeta
`TarjetaTrialCard` se derivó de la plantilla aprobada, sin inventar estilo:

- Contenedor: «Aviso · compra en varios emprendimientos» (nodo `40:1350`): fondo `--hc-info-bg`, borde 1px `--hc-border`, radio 14, título `--hc-info`.
- Botón primario: «Cambiar método de pago» (nodo `29:2022`) → `hc-btn-primary`, alto mínimo 44.
- Estado guardado: tokens `--hc-success-*`. Sin gradientes ni banners flotantes. Montos en US$.

Dónde se muestra: menú del emprendedor (`MenuPage`), «Tu Plan» (`CompararPlanesVista`), `AdminPlanes` y `TrialBanner` (panel admin).
Pendiente de diseño: validar con Figma un frame propio si Diseño lo quiere distinto.

## Verificación
- Backend: `TrialTarjetaServiceTest`, `TrialTarjetaControllerTest`, `RolesBillingWalletCobrosTest` (EDITOR/LECTOR 403).
- Frontend: `trialTarjeta.test.ts` (vitest) y `tests/trial-tarjeta.spec.ts` (Playwright, SDK de ONVO simulado con `window.onvo`).
- E2E real con ONVO en modo TEST (tarjeta de prueba en el iframe del SDK): **pendiente**, requiere la llave pública de prueba
  (`VITE_ONVO_PUBLISHABLE_KEY` de test); solo se dispone de la llave secreta de prueba (verificación del lado servidor).
