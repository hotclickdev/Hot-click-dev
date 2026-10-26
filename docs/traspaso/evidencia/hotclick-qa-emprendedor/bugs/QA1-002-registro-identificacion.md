ID: QA1-002   Título: Registro /api/auth/register falla siempre: columna "identificacion" NOT NULL en hot_click_usuario_tb
Rol/cuenta usada: anónimo (qa1+a…@example.com)   Ruta/pantalla: /registro → POST /api/auth/register
Pasos: 1. POST register con nombre, correo nuevo, contraseña válida, declaraMayoriaEdad=true.
Esperado: 200, cuenta creada pendiente de verificación.
Obtenido: 400 "No se pudo completar el registro…". Log: DataIntegrityViolation null value in column "identificacion" (SQLState 23502). Ningún usuario creado.
Evidencia: 21:08:08 CR; evidencia/http/qa1-http-1.txt; evidencia/logs/backend-register.txt
Severidad: Crítica (bloquea registro)
¿Se pudo hacer desde la UI?: no. Probable desfase esquema DB staging vs código (el servicio no setea identificación; el plan prohíbe cédulas reales).


**Estado (21:18 CR):** Abierto. Grok Bot lo confirmó como bug de código; espera decisión de Andrés.


**Estado (21:22 CR):** Decisión de Andrés (vía Grok Bot): el registro pide la cédula en el formulario. El fix va en fix/registro-cedula-otp (Dev Marketplace). Falta verificarlo en staging.

Re-verificación 24/10/2026 00:29 CR (staging 387bab8c, V188): NO re-probado por /api/auth/register para no gastar intento del límite compartido (5/h). El flujo vigente send-verification ya exige y normaliza cédula (código AuthVerificationHandler.prepararAltaSiAplica) y el error ahora fue por otra columna (telefono, ver QA1-006), lo que indica que "identificacion" ya no falla en ese flujo. Estado: PROBABLEMENTE RESUELTO en send-verification; /register sin re-probar.
