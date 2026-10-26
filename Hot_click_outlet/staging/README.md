# Staging en un segundo Lightsail

Es una copia de HotClick para probar `master` antes de producción. Usa base propia con **datos de prueba**, ONVO **solo en modo prueba** y ningún recurso compartido con producción.

> **Estado:** código preparado. No se creó la instancia, ni cuentas, ni recursos, y no se desplegó nada.

| Archivo | Para qué |
| --- | --- |
| `.env.staging.example` | Variables con placeholders. Se copia a `.env.staging` en el servidor (chmod 600, ignorado por git). |
| `docker-compose.staging.yml` | Postgres + app, proyecto `hotclick-staging`, app solo en `127.0.0.1:8080`. |
| `nginx/hotclick-staging.conf` | Proxy a la app con `client_max_body_size 30m` (igual que el límite de 30MB de prod) y `noindex`. |
| `lib-staging.sh` | Valida el `.env.staging` sin ejecutarlo. |
| `deploy-staging.sh` | Valida y después hace `git pull --ff-only` de master, build, up y health check. **Aborta ante cualquier llave live.** |
| `seed-staging.sh` | Carga el catálogo ficticio (`seed_marcas_manual.sql`, `seed_catalogo_manual.sql`). Se niega si la base ya tiene pedidos. |

## Pasos para Andrés (a mano, en la consola de AWS)

Esto genera costo: el plan de 2 GB cuesta unos USD 10/mes, o USD 20/mes el de 4 GB.

1. Abrí Lightsail, región Ohio (us-east-2), y elegí **Create instance**: Linux, *OS only*, Ubuntu 24.04.
2. Plan: **2 GB** alcanza para staging (los límites del compose suman unos 1.9 GB). Si querés paridad con prod, usá 4 GB.
3. Nombre: `hotclick-staging`.
4. Creá una IP estática y adjuntala a la instancia.
5. Configurá el firewall: puerto **22** solo para tu IP, **80** y **443**. **No** abras 5432 ni 8080.
6. En el DNS, creá un registro A `staging.<tu-dominio>` que apunte a esa IP estática.
7. Entrá por SSH e instalá Docker Engine, el plugin `docker compose`, Nginx, Certbot y git.
8. Cloná el repo en `/opt/hotclick`. Si es privado, usá una deploy key de **solo lectura**.
9. Prepará el `.env.staging`:
   - `cp Hot_click_outlet/staging/.env.staging.example Hot_click_outlet/staging/.env.staging && chmod 600 Hot_click_outlet/staging/.env.staging`
   - Completá los placeholders con secretos **nuevos**, no los de prod.
   - ONVO acepta solo llaves `onvo_test_`. Dejá `PAYMENTS_ONVO_ENABLED=false` hasta que haga falta probar pagos.
10. Configurá Nginx:
    - Copiá `nginx/hotclick-staging.conf` a `/etc/nginx/conf.d/` y cambiá el `server_name`.
    - Corré `sudo nginx -t && sudo systemctl reload nginx`.
    - Corré `sudo certbot --nginx -d staging.<tu-dominio>`.
11. Primer deploy: `Hot_click_outlet/staging/deploy-staging.sh`. Flyway crea el esquema.
12. Datos de prueba: `Hot_click_outlet/staging/seed-staging.sh`.
13. Para los siguientes deploys de master, repetí el paso 11.

## Reglas

- Nunca copies la base, los dumps ni el `.env` de producción a staging.
- `SPRING_PROFILES_ACTIVE=prod`, nunca `dev` ni `test`, para que staging se comporte como producción.
- No pongas llaves de S3 de producción. Si hacen falta fotos, usá un bucket aparte, que es una decisión pendiente y tiene costo.

## Prueba

`node --test scripts/eng-gates/staging-lightsail.test.mjs` corre en el workflow *Eng gates — selftest*. Valida lo siguiente:
- que el `.example` no tenga secretos, use perfil prod y ONVO test;
- que nginx use 30m;
- que el deploy (con git, docker y curl falsos) se niegue ante una llave live, un perfil dev o test, o ONVO habilitado sin llave;
- que no imprima el `.env`.
