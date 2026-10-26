ID: QA1-004   Título: POST /api/auth/registro-empresa devuelve 500 "Error al registrar la empresa"
Rol/cuenta usada: anónimo (qa1+b…@example.com)   Ruta/pantalla: /registrar-negocio → POST /api/auth/registro-empresa
Pasos: 1. POST con nombreEmpresa, correoAdmin nuevo, passwordAdmin válido, declaraMayoriaEdad=true.
Esperado: 200 y código de verificación enviado.
Obtenido: HTTP 500; log: cupo no reservado (tabla faltante) → "current transaction is aborted" al leer plan. Relacionado con QA1-003. El fallo del cupo debería no envenenar la transacción.
Evidencia: 21:08:38 CR; evidencia/http/qa1-http-2.txt; evidencia/logs/backend-registro-empresa.txt
Severidad: Crítica (bloquea alta de emprendedor)
¿Se pudo hacer desde la UI?: no


**Estado (21:18 CR):** Cerrado como duplicado de QA2-001 (responsable: QA 2), por decisión de Grok Bot.


**Estado (21:22 CR):** REABIERTO. Responsable: QA 1. QA2-001 queda cerrado como duplicado (decisión final de Grok Bot).

Re-verificación 24/10/2026 00:29 CR: NO re-probado (único intento de registro reservado al flujo send-verification; límite 5/h compartido). Causa raíz (tabla de cupo) resuelta según QA1-003; probable resuelto, sin evidencia directa. Estado: PENDIENTE DE RE-PRUEBA.
