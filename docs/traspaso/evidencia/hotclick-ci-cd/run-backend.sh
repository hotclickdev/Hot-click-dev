#!/bin/bash
set -a; source /workspace/Hot-click-dev/Hot_click_outlet/.env; set +a   # .env local NO versionado (ver .env.example)
export MAIL_PROVIDER=smtp SPRING_PROFILES_ACTIVE=dev SPRING_JPA_HIBERNATE_DDL_AUTO=${DDL:-validate} HOTCLICK_SEED_CATALOGO_LOCAL=false SPRING_MAIL_HOST=localhost SPRING_MAIL_PORT=1025 SPRING_MAIL_PROPERTIES_MAIL_SMTP_AUTH=false
cd /workspace/staging-43188186/Hot_click_outlet
export SERVER_PORT=8081
exec -a hotclick-staging-backend /workspace/tools/jdk21/bin/java -Xmx1g -jar target/hot-click-outlet-1.0.0.jar
