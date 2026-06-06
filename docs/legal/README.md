# Documentación Legal — HOTCLICK

Expediente jurídico completo de la plataforma HotClick conforme a la Ley N.° 8968 y la normativa de la PRODHAB. Todos los documentos están redactados en estilo formal abogado con cláusulas numeradas.

**Fecha de vigencia:** 5 de junio de 2025
**Correo legal:** <hotclick.cr@gmail.com>

---

## Índice

| Documento | Archivo | Página pública |
| --- | --- | --- |
| Términos y Condiciones (Contrato de Adhesión) | [terminos.md](terminos.md) | `/terminos` |
| Política de Privacidad (Ley N.° 8968) | [privacidad.md](privacidad.md) | `/privacidad` |
| Política de Devoluciones | [devoluciones.md](devoluciones.md) | `/devoluciones` |
| Política de Envíos | [envios.md](envios.md) | `/envios` |
| Política de Cookies (PRODHAB) | [cookies.md](cookies.md) | `/cookies` |
| Acuerdo de Vendedores (Encargados de Tratamiento) | [acuerdo-vendedores.md](acuerdo-vendedores.md) | `/acuerdo-vendedores` |
| Formulario de Consentimiento Informado | [consentimiento.md](consentimiento.md) | (checkbox en registro y checkout) |
| Protocolo de Notificación de Incidentes | [protocolo-incidentes.md](protocolo-incidentes.md) | (uso interno — debida diligencia PRODHAB) |

---

## Leyes citadas

| Ley | Aplicación |
| --- | --- |
| Ley N.° 8968 | Protección de datos personales — toda la plataforma |
| Decreto Ejecutivo N.° 37554-JP | Reglamento Ley 8968 — consentimiento informado |
| Ley N.° 7472 | Protección al Consumidor — garantías y devoluciones |
| Ley N.° 6683 | Derechos de Autor — propiedad intelectual de HotClick |

---

## Flujos de consentimiento implementados

```
Registro de usuario   → tipo REGISTRO  → RegisterPage.jsx
Proceso de pago       → tipo CHECKOUT  → CheckoutPage.jsx
Registro de negocio   → tipo VENDEDOR  → RegistrarNegocioPage.jsx
```

Cada aceptación se registra en `hot_click_consentimiento_log_tb` con:
- `usuario_id` (nullable para invitados)
- `tipo` (REGISTRO / CHECKOUT / VENDEDOR)
- `ip_address` (IP real via `X-Forwarded-For`)
- `user_agent`
- `fecha_consentimiento` (inmutable — `updatable = false`)
- `version_doc` (fecha del documento aceptado)

---

## Próximo paso legal

Inscripción formal de la base de datos ante la **PRODHAB** declarando:
- Titular responsable: HotClick
- Finalidad: comercio electrónico
- Transferencia necesaria a vendedores para logística de entrega
- Medidas de seguridad implementadas
