ID: QA1-005   Título: Errores de validación exponen nombres técnicos de campo
Rol/cuenta usada: anónimo   Ruta/pantalla: POST /api/auth/register
Pasos: 1. Enviar nombre "Q", correo "no-correo", contraseña "123".
Esperado: Mensajes en español sin nombres internos (C7).
Obtenido: "contrasena: La contraseña debe…; nombre: …; correo: Correo inválido" (prefijos técnicos). Falta confirmar en UI si el front los muestra crudos (pendiente de captura).
Evidencia: 21:08:09 CR; evidencia/http/qa1-http-1.txt
Severidad: Baja
¿Se pudo hacer desde la UI?: pendiente de captura
