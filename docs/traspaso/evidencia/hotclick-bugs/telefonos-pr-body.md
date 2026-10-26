## fix: teléfono/WhatsApp de soporte por configuración (backend + frontend)

Elimina el número de soporte hardcodeado del código. El valor llega solo por configuración:

- **Backend**: `hotclick.soporte.telefono=${HOTCLICK_SOPORTE_TELEFONO:}` (vacío por defecto). Lo usan `CustomErrorController` (página 500 de visitante), `EmailLayoutHelper` (pie de correos) y `TelegramNotificacionClienteService`. Vacío ⇒ se oculta el enlace/texto de WhatsApp.
- **Frontend**: `VITE_SOPORTE_TELEFONO` (build). `src/config/soporteTelefono.ts` centraliza el valor; contacto, identidad del comerciante, devoluciones, pedidos, FAB, checkout, JSON-LD (`telephone`, `servicePhone`, `sameAs` de wa.me) lo leen de ahí. Vacío ⇒ se oculta la UI y se omiten los campos del JSON-LD. Se quitó `telephone`/wa.me del `index.html` estático.
- Seeders locales/QA con valores ficticios. Sin cambios en migraciones Flyway.
- `static/` regenerado con todas las `VITE_*` vacías (salvo `VITE_APP_RELEASE=ci-spa-gate`).

## Checklist de deploy

- [ ] Definir `HOTCLICK_SOPORTE_TELEFONO` en el entorno de runtime del backend (prod).
- [ ] Definir `VITE_SOPORTE_TELEFONO` en el entorno de build del frontend en CI (el que genera `static/`).
- [ ] Ambas variables deben tener **el mismo valor** (formato visible, p. ej. con código de país; el enlace wa.me se arma con los dígitos).
- [ ] Si no se definen, el sitio funciona igual pero sin teléfono/WhatsApp visible (degradación intencional).
- [ ] Tras el deploy, verificar la página de Contacto, el pie de un correo y la página 500 de visitante.

## Chat público y e2e (segundo commit)
- `ContactoPublicoPolicy` ya no tiene constante: `whatsappHotclick(telefono)` deriva los dígitos de `hotclick.soporte.telefono`; vacío ⇒ sin WhatsApp.
- `PublicChatClaudeClient`: SQL sin literal (`COALESCE(numero_whatsapp, telefono_empresa)`); fallback de BD usa el valor configurado u omite el teléfono. `PublicChatPromptBuilder` remite a la página de Contacto cuando está vacío.
- Tests Java con el ficticio `+000 0000 0000` y casos de valor vacío.
- Specs Playwright: sin el número real; `playwright.config.ts` inyecta `VITE_SOPORTE_TELEFONO` ficticio solo en el webServer de Vite (dev). `static/` no cambia.

## Despliegue
- El build de prod corre en Lightsail con su `.env` (no en CI): definir `VITE_SOPORTE_TELEFONO` y `hotclick.soporte.telefono` (`HOTCLICK_SOPORTE_TELEFONO`) ahí antes de desplegar; si faltan, la UI y el chat ocultan WhatsApp (fail-closed).
