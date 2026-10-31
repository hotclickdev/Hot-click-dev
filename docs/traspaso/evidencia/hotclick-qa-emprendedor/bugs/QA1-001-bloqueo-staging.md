ID: QA1-001   Título: Sin URL de staging local para QA funcional Emprendedor (bloqueo)
Rol/cuenta usada: ninguna   Ruta/pantalla: /emprende, /registro, /registrar-negocio, /emprendedor/*
Pasos: 1. Buscar URL de staging en plan/estado. 2. Revisar servicios locales (8080/5173).
Esperado: URL de staging local con ONVO sandbox.
Obtenido: sin URL documentada; localhost:8080 y :5173 rechazan conexión (HTTP 000). Por instrucción, esperando URL de CI/CD; no se prueba contra ningún ambiente desplegado.
Evidencia: 23/10/2026 21:04 CR, evidencia-ambiente.txt
Severidad: Crítica (bloquea todo QA 1)
CERRADO 23/10/2026 21:07 CR: staging local responde (front :3000 200, backend :8080 cupos 200, Mailpit :8025 200). Ver evidencia/http/qa1-http-1.txt
¿Se pudo hacer desde la UI?: no — falta ambiente.
