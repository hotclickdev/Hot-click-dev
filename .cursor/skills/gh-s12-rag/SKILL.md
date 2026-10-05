---
name: gh-s12-rag
description: Atiende el atraso de embeddings sin correr el indexer ni escribir en la base. Usar cuando S12 abra un issue de lag o se salte por falta de URL.
disable-model-invocation: true
---

# S12 RAG lag

Workflow: `.github/workflows/rag-embeddings-lag.yml`
Check: `S12 RAG lag`

## Cuándo corre

Los viernes. Sin URL de base, skip honesto. Con URL, cuenta productos visibles sin embedding. No escribe y no corre el indexer.

## Qué hacer para que no salga en rojo

1. No lances el indexer contra producción para bajar el número.
2. Sin URL el skip es correcto. No commitees la cadena de conexión.
3. El umbral por defecto es 50. No lo subas para esconder el atraso.

## Label de skip

Label `skip-rag-lag` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
