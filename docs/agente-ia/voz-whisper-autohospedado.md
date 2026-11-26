# Voz del agente con Whisper autohospedado

## Qué es y cuándo usarlo

El adaptador `TranscriptorOpenAiCompatible` habla con cualquier servidor que implemente
`POST {base}/audio/transcriptions` de OpenAI y devuelva `verbose_json` con `text` y `duration`.
Con Groq (gratis, por defecto) no se instala nada. Con Whisper autohospedado la voz no sale de nuestra
infraestructura y no hay límite de cuota.

| | Groq | Whisper autohospedado |
|---|---|---|
| Costo | gratis, con límites de uso | gratis, consume CPU y RAM de la VM |
| Privacidad | el audio viaja a un tercero | el audio no sale de la red propia |
| Latencia | baja (sub-segundo, red incluida) | segundos en CPU (ver abajo) |
| Operación | ninguna | un contenedor más que vigilar |

Usarlo cuando se quiera evitar enviar audio de clientes a un tercero o cuando se agote la cuota de Groq.
Para el arranque, Groq sigue siendo la opción más simple.

Variables (iguales para ambos): `agente.voz.proveedor=openai-compatible`, `AGENTE_VOZ_BASE_URL`,
`AGENTE_VOZ_API_KEY`, `AGENTE_VOZ_MODELO`. El adaptador solo acepta `http` hacia localhost, 127.0.0.1 o ::1.

## Cómo se probó en una PC de desarrollo

- Windows 11, GPU de 8 GB (unos 5 GB libres), 32 GB de RAM, sin Docker.
- `speaches` no está publicado en PyPI, así que no se pudo instalar con pip. Se usó un servidor mínimo
  (FastAPI + faster-whisper, modelo `small`, GPU con `int8_float16`) que implementa solo
  `POST /v1/audio/transcriptions` con `text`, `duration` y `language`, escuchando en 127.0.0.1.
  Ese servidor NO está en el repo; sirve solo para validar el contrato del adaptador. Para la VM, usar speaches real.
- Audio de prueba generado con la voz TTS de Windows, convertido a OGG/Opus con ffmpeg:
  "Hola, quiero comprar unas tenis talla cuarenta" (3,6 s).
- Prueba: `TranscriptorOpenAiCompatibleE2ETest` (se salta si no está `AGENTE_VOZ_E2E_URL`):

```
AGENTE_VOZ_E2E_URL=http://127.0.0.1:8765/v1 AGENTE_VOZ_E2E_AUDIO=<ruta al .ogg> \
  mvn test -Dtest=TranscriptorOpenAiCompatibleE2ETest
```

Resultados (modelo `small`):

- Texto: "Hola, quiero comprar unas tenis talla 40." (correcto). `duration` llegó (3,644 s; el adaptador la redondea a 4).
- Latencia por nota de 3,6 s, medida desde el adaptador: 732 ms la primera, unos 290 ms las siguientes (GPU).
- GPU: unos 0,4 GB de VRAM en reposo con el modelo cargado (no se midió el pico durante la inferencia).
- RAM del proceso Python: unos 760 MB.
- Referencia en CPU x86 de escritorio (Ryzen 7, `small` int8, 8 hilos): unos 3,3 s por la misma nota (curl, tiempo total).

## Guía para la VM Oracle A1 ARM (4 OCPU, 24 GB, sin GPU)

No verificado: nada de esta sección se ejecutó en la VM ni en ARM.

1. Imagen: speaches publica imágenes CPU en `ghcr.io/speaches-ai/speaches`. Confirmar que la etiqueta elegida
   sea multi-arquitectura (`linux/arm64`) antes de usarla; si no lo es, construir la imagen desde el repo oficial
   en la propia VM. Fijar una etiqueta o digest concreto, no `latest`.
2. Modelo: `Systran/faster-whisper-small` con cuantización int8 (mejor español que `base`). Si la CPU va justa,
   `Systran/faster-whisper-base`. No usar `medium` en esta VM.
3. Red: publicar el puerto solo en `127.0.0.1` (si el backend corre en la misma VM) o en una red interna de Docker
   compartida con el backend. Nunca `0.0.0.0` ni regla de entrada en la lista de seguridad de Oracle.
4. Límites de memoria y CPU para no ahogar al backend y la base de datos.

Compose de ejemplo (ajustar etiqueta y nombres de variables a la documentación vigente de speaches):

```yaml
services:
  whisper:
    image: ghcr.io/speaches-ai/speaches:<etiqueta-cpu-arm64-fija>
    restart: unless-stopped
    ports:
      - "127.0.0.1:8000:8000"   # solo localhost
    environment:
      - WHISPER__MODEL=Systran/faster-whisper-small
      - WHISPER__COMPUTE_TYPE=int8
      - WHISPER__INFERENCE_DEVICE=cpu
    volumes:
      - whisper-modelos:/home/ubuntu/.cache/huggingface/hub
    deploy:
      resources:
        limits:
          cpus: "3"
          memory: 3g
volumes:
  whisper-modelos:
```

Variables del backend:

```
AGENTE_VOZ_PROVEEDOR=openai-compatible       # o agente.voz.proveedor=openai-compatible
AGENTE_VOZ_BASE_URL=http://127.0.0.1:8000/v1
AGENTE_VOZ_API_KEY=<cualquier valor no vacío si el servidor no exige clave; el adaptador deshabilita la voz sin clave>
AGENTE_VOZ_MODELO=Systran/faster-whisper-small
```

Si el backend corre en otro contenedor, `http` solo se acepta para localhost: poner el backend en
`network_mode: host` o poner un proxy TLS interno y usar `https`. El adaptador rechaza `http://whisper:8000`.

Verificación tras instalar: cargar el modelo una vez (la primera petición lo descarga), enviar una nota corta con curl
y comprobar que la respuesta trae `duration`.

## Latencia esperada

Estimación, no medida en ARM. En una CPU x86 de escritorio con 8 hilos, `small` int8 tardó unos 3,3 s para 3,6 s de
audio. Los 4 núcleos Ampere A1 son más lentos por núcleo, así que para notas de 5 a 15 s conviene esperar de 5 a 15 s
con `small` y de 2 a 6 s con `base`. El timeout del adaptador es `agente.voz.timeout-segundos` (20 por defecto):
subirlo a 30 si se usa `small`, y limitar la concurrencia a una transcripción a la vez. Medir en la VM antes de decidir.

## Si el servidor cae

El adaptador lanza `TranscripcionException` (sin reintentos) y el bot pide al cliente que escriba el mensaje.
