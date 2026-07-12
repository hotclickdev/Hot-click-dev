# DeepTeam — red-teaming del Copilot de HOTCLICK

Herramienta de **testing** (red-teaming) para probar el prompt y el modelo
que usa `AiCopilotService.java` contra jailbreak, prompt injection, bias y
fuga de PII. Corre en dev/CI, **nunca contra tráfico de clientes reales**.

## Qué hace y qué no hace

- Ataca directo a NVIDIA NIM replicando el system prompt de
  `AiCopilotService.buildSystemPrompt()` (ver `target_callback.py`).
- **No** le pega al endpoint real `POST /api/admin/ai/chat` — ese requiere
  login (JWT) + rol EMPRENDEDOR/ADMIN + tenant, y no está pensado para
  recibir ataques automatizados.
- **No** ejercita `TextModerationService` (filtro de contenido previo), el
  rate limiter, ni el circuit breaker — solo el modelo + prompt.
- Usa NVIDIA NIM (mismas `NVIDIA_API_KEY`/`NVIDIA_MODEL` que el backend
  Java) como simulador de ataques y como juez de evaluación — **no
  requiere una API key nueva de OpenAI**.

## Uso

```bash
cd security-tools/deepteam
python -m venv .venv
.venv/Scripts/activate       # Windows
pip install -r requirements.txt
cp .env.example .env         # rellenar NVIDIA_API_KEY con el mismo valor de Hot_click_outlet/.env
python run_red_team.py
```

## Resultado esperado

Un reporte con % de éxito por vulnerabilidad/ataque — sirve como baseline
para trackear mejoras del prompt o del sidecar de NeMo Guardrails
(`security-tools/guardrails/`) en el tiempo. No tiene que dar 0% de éxito
de entrada; lo importante es tener una medición, no un resultado perfecto.

## CI (opcional, no bloqueante)

Si se agrega un job en GitHub Actions para correr esto en `schedule`
semanal, hace falta crear el secret `NVIDIA_API_KEY` en
Settings → Secrets del repo — no existe hoy en ningún workflow.
