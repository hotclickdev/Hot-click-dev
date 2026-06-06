# PROTOCOLO INTERNO DE NOTIFICACIÓN DE INCIDENTES DE SEGURIDAD

## HotClick — Documento de Gobernanza Interna

**Clasificación:** Uso interno — Debida Diligencia (Ley N.° 8968)
**País:** República de Costa Rica
**Fecha de entrada en vigencia:** 5 de junio de 2025
**Última modificación:** 5 de junio de 2025
**Responsable:** Administración de HotClick · <hotclick.cr@gmail.com>

---

## SECCIÓN I: OBJETO Y ALCANCE

El presente protocolo establece las pautas de acción inmediata ante cualquier evento fortuito o de fuerza mayor que vulnere las medidas de seguridad técnicas de la Plataforma, resultando en la destrucción, pérdida, alteración, acceso no autorizado o filtración de la base de datos de los usuarios (en adelante, la "Brecha de Seguridad").

Este documento forma parte del sistema de cumplimiento de la **Ley N.° 8968 de Protección de la Persona frente al Tratamiento de sus Datos Personales** y su Reglamento (Decreto Ejecutivo N.° 37554-JP), y acredita ante la PRODHAB que HotClick actúa con la debida diligencia exigida por el principio de responsabilidad proactiva.

---

## SECCIÓN II: PROCEDIMIENTO DE CONTENCIÓN Y COMUNICACIÓN

Ante la confirmación de una Brecha de Seguridad, la administración de HotClick ejecutará el siguiente plan de contingencia en un plazo perentorio:

### Paso 1 — Aislamiento Técnico (0–2 horas)

Desactivación temporal de los servidores afectados o revocación de credenciales comprometidas para detener la fuga de información de manera inmediata.

Acciones técnicas:
- Revocar tokens JWT activos de usuarios potencialmente afectados.
- Rotación inmediata de secretos (JWT_SECRET, API keys, credenciales de base de datos).
- Activar modo de mantenimiento en la Plataforma si la brecha es de alcance masivo.
- Preservar logs de auditoría sin alteración para la investigación forense.

### Paso 2 — Evaluación del Alcance (2–24 horas)

- Determinar qué categorías de datos fueron comprometidos (identificativos, financieros, de contacto, contraseñas).
- Estimar el número de titulares afectados.
- Identificar el vector de ataque y el período de exposición.
- Documentar en acta interna con firma de la administración y fecha.

### Paso 3 — Notificación a la PRODHAB (dentro de las 72 horas)

En cumplimiento del principio de responsabilidad proactiva, se remitirá un informe técnico a la **Agencia de Protección de Datos de los Habitantes (PRODHAB)** que contendrá:

- Naturaleza e índole de la Brecha de Seguridad.
- Categorías y volumen aproximado de datos personales comprometidos.
- Categorías y número aproximado de titulares afectados.
- Nombre y datos de contacto del responsable del tratamiento.
- Consecuencias probables de la brecha.
- Medidas técnicas y organizativas adoptadas o propuestas para remediarla.

### Paso 4 — Notificación a los Afectados (dentro de las 72 horas)

Se enviará una comunicación directa y expedita a los correos electrónicos de los usuarios cuyos datos hayan sido vulnerados, detallando:

- Descripción clara de lo ocurrido, sin tecnicismos innecesarios.
- Categorías de datos comprometidos del titular.
- Recomendaciones de seguridad inmediatas (cambio de contraseñas, alerta bancaria si aplica).
- Canales de soporte habilitados para atención de afectados.
- Referencia a la PRODHAB como instancia ante la cual el titular puede presentar reclamaciones.

---

## SECCIÓN III: UMBRALES DE NOTIFICACIÓN

| Alcance de la Brecha | Notificación PRODHAB | Notificación Usuarios |
| --- | --- | --- |
| 1–10 usuarios, datos no sensibles | Opcional (recomendada) | Sí |
| 11–100 usuarios, cualquier dato | Obligatoria | Sí |
| Más de 100 usuarios | Obligatoria, urgente | Sí, por todos los medios |
| Datos bancarios o contraseñas | Obligatoria, inmediata | Sí, inmediata |

---

## SECCIÓN IV: REGISTRO DE INCIDENTES

HotClick mantendrá un registro interno de incidentes de seguridad que incluirá como mínimo:

- Fecha y hora de detección.
- Descripción técnica del incidente.
- Alcance estimado (usuarios y categorías de datos afectados).
- Medidas adoptadas y fecha de resolución.
- Comunicaciones enviadas a PRODHAB y usuarios.

Este registro estará disponible para inspección de la PRODHAB en caso de procedimiento administrativo.

---

*Documento de Gobernanza Interna. Redactado conforme a la Ley N.° 8968 y el Decreto Ejecutivo N.° 37554-JP vigentes en la República de Costa Rica. Su existencia acredita la debida diligencia del Responsable del Tratamiento ante la PRODHAB.*
