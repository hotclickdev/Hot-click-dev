"""Sidecar de NeMo Guardrails delante de NVIDIA NIM para AiCopilotService.java.

Wrapper FastAPI propio (no el `nemoguardrails server` embebido) porque
AiCopilotService.processStream() ya parsea un contrato SSE muy específico:
líneas "data: {...}" con choices[0].delta.content, sentinel "[DONE]", y un
chunk final con "usage" cuando stream_options.include_usage=true. Ese
contrato hay que preservarlo byte-a-byte.

Flujo por request:
  1. Recibe POST /v1/chat/completions con el mismo body que ya arma
     AiCopilotService.buildRequestBody() (model, messages, stream, stop, ...).
  2. Corre el input rail (NeMo Guardrails, solo modo "input" — no dispara
     generación) sobre el último mensaje "user".
  3. Si el rail bloquea (jailbreak/prompt injection detectado): corta ahí,
     responde con una respuesta SSE sintética que respeta el mismo contrato,
     SIN llamar a NVIDIA NIM.
  4. Si pasa: reenvía la conversación tal cual a NVIDIA NIM en modo streaming
     y hace passthrough línea por línea — Java recibe exactamente lo mismo
     que recibiría llamando a NIM directo.

Output rail queda fuera de v1 a propósito (bufferear la respuesta completa
antes de reenviar rompería el streaming incremental del chat) — ver README.

IMPORTANTE: no verificado contra una corrida real de nemoguardrails en esta
sesión (sin entorno Python disponible) — correr el smoke test de la sección
"Verificación" del plan antes de dejarlo fijo en producción.
"""

import json
import logging
import os

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from nemoguardrails import LLMRails, RailsConfig

load_dotenv()

logging.basicConfig(level=logging.INFO)
log = logging.getLogger("guardrails-sidecar")

NVIDIA_CHAT_URL = os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1").rstrip("/") + "/chat/completions"
DEFAULT_MODEL = os.environ.get("NVIDIA_MODEL", "meta/llama-3.1-70b-instruct")
DEFAULT_API_KEY = os.environ.get("NVIDIA_API_KEY", "")

app = FastAPI(title="HOTCLICK Guardrails Sidecar")

# ── Carga de NeMo Guardrails, con el modelo/base_url/api_key inyectados en
# tiempo de ejecución (no dependemos de la interpolación ${ENV_VAR} de
# nemoguardrails, que puede variar entre versiones) ─────────────────────────
_rails_config = RailsConfig.from_path("config")
for m in _rails_config.models:
    if m.type == "main":
        m.model = DEFAULT_MODEL
        m.parameters = {
            **(m.parameters or {}),
            "base_url": os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1"),
            "api_key": DEFAULT_API_KEY or "placeholder",
        }
# LangChain's ChatOpenAI suele leer OPENAI_API_KEY del entorno además del
# parámetro explícito — se fija como fallback para evitar errores de auth.
os.environ.setdefault("OPENAI_API_KEY", DEFAULT_API_KEY or "placeholder")

_rails = LLMRails(_rails_config)


def _last_user_message(messages: list[dict]) -> str:
    for m in reversed(messages):
        if m.get("role") == "user":
            return m.get("content", "")
    return ""


def _sse_chunk(text: str) -> str:
    return "data: " + json.dumps({"choices": [{"delta": {"content": text}}]}) + "\n\n"


def _sse_final(prompt_tokens: int = 0, completion_tokens: int = 0) -> str:
    payload = {
        "choices": [],
        "usage": {"prompt_tokens": prompt_tokens, "completion_tokens": completion_tokens},
    }
    return "data: " + json.dumps(payload) + "\n\ndata: [DONE]\n\n"


async def _blocked_stream(refusal_text: str):
    yield _sse_chunk(refusal_text)
    yield _sse_final()


async def _passthrough_stream(body: dict, auth_header: str):
    async with httpx.AsyncClient(timeout=60.0) as client:
        async with client.stream(
            "POST",
            NVIDIA_CHAT_URL,
            json=body,
            headers={
                "Content-Type": "application/json",
                "Authorization": auth_header,
                "Accept": "text/event-stream",
            },
        ) as response:
            if response.status_code >= 400:
                error_body = await response.aread()
                log.error("NVIDIA NIM respondió %s: %s", response.status_code, error_body[:500])
                yield _sse_chunk("El asistente AI no está disponible temporalmente. Intente en unos minutos.")
                yield _sse_final()
                return
            async for line in response.aiter_lines():
                if line:
                    yield line + "\n"
                else:
                    yield "\n"


@app.post("/v1/chat/completions")
async def chat_completions(request: Request):
    body = await request.json()
    messages = body.get("messages", [])
    user_input = _last_user_message(messages)
    auth_header = request.headers.get("authorization") or f"Bearer {DEFAULT_API_KEY}"

    blocked_reply = None
    try:
        result = await _rails.generate_async(
            messages=[{"role": "user", "content": user_input}],
            options={"rails": ["input"]},
        )
        response_obj = getattr(result, "response", result)
        if isinstance(response_obj, list) and response_obj:
            candidate = response_obj[-1].get("content", "")
        elif isinstance(response_obj, dict):
            candidate = response_obj.get("content", "")
        else:
            candidate = ""
        if candidate:
            blocked_reply = candidate
    except Exception:
        # Si el rail falla (p.ej. NVIDIA caído para el self-check), no se
        # bloquea el chat completo por eso — se deja pasar y NVIDIA NIM real
        # responderá o fallará por su cuenta (mismo comportamiento que hoy).
        log.exception("Fallo corriendo el input rail — dejando pasar sin bloquear")

    if blocked_reply:
        log.info("Input bloqueado por guardrails: %r", user_input[:200])
        return StreamingResponse(_blocked_stream(blocked_reply), media_type="text/event-stream")

    return StreamingResponse(_passthrough_stream(body, auth_header), media_type="text/event-stream")


@app.get("/health")
async def health():
    return {"status": "ok"}
