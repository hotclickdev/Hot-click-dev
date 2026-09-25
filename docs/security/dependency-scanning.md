# Gate de dependencias vulnerables (osv-scanner)

> **Última actualización:** 2026-09-23  
> **Herramienta:** [Google OSV-Scanner](https://google.github.io/osv-scanner/) v2.5.1  
> **Workflow:** [`.github/workflows/deps-vuln.yml`](../../.github/workflows/deps-vuln.yml)

## Por qué osv-scanner

- Lee `pnpm-lock.yaml` y `pom.xml` **sin** `pnpm install` ni `mvn` compile.
- Consulta [osv.dev](https://osv.dev) (gratis, sin API key de pago).
- Alineado con el patrón de `security.yml` (binario + checksum SHA-256 + script en `scripts/eng-gates/`).

Dependabot abre PRs de bumps pero **no bloquea** merge. Este workflow sí falla el check cuando hay HIGH/CRITICAL en el árbol real del lockfile/manifiesto.

## Qué escanea

| Ecosistema | Archivo | Notas |
|---|---|---|
| npm / pnpm | `Hot_click_outlet/frontend/pnpm-lock.yaml` | Versiones resueltas del lockfile (no solo `package.json`) |
| Maven | `Hot_click_outlet/pom.xml` | Resolución transitiva vía Maven Central (red), sin compilar el proyecto |

## Umbral

| Severidad | Efecto en CI |
|---|---|
| **CRITICAL / HIGH** | **Falla** el job (bloquea merge si el check es required) |
| Medium / Moderate / Low | Se listan en el log como *INFORMATIVO* — **no** fallan |
| Sin severidad resoluble | Fail-closed (falla el gate) |

## Cómo leer un fallo

1. Abrí el check **Security — Dependencias vulnerables** → job `osv-scanner (HIGH/CRITICAL)`.
2. En el log buscá la sección `=== BLOQUEA (HIGH/CRITICAL) ===`.
3. Cada línea tiene `paquete@version`, severidad, ID (`GHSA-…` / `CVE-…`), resumen y fuente (lockfile o pom).
4. Artefacto `osv-deps-report` = JSON completo de osv-scanner (14 días).
5. Remedio preferido: subir la dependencia (y regenerar el lockfile con `pnpm install` / bump en `pom.xml`) en un PR aparte. **No** edites el lockfile a mano para “mentir” versiones.

Ejemplo típico: `xlsx@0.18.5` en `pnpm-lock.yaml` aunque `package.json` ya apunte a 0.20.3 — el escáner ve el lockfile.

## Cómo suprimir (allowlist)

Solo cuando el hallazgo **no aplica** a nuestro uso o no hay fix todavía. El archivo versionado es:

[`scripts/eng-gates/osv-deps-allowlist.json`](../../scripts/eng-gates/osv-deps-allowlist.json)

```json
{
  "version": 1,
  "entries": [
    {
      "id": "GHSA-xxxx-xxxx-xxxx",
      "aliases": ["CVE-2024-xxxxx"],
      "reason": "No alcanzable: módulo X solo corre en CI offline; sin red ni parseo de input de usuario.",
      "acceptedAt": "2026-09-23",
      "expiresOn": "2026-12-31"
    }
  ]
}
```

Reglas:

- `id`, `reason`, `acceptedAt` son obligatorios.
- Preferí `expiresOn` (YYYY-MM-DD). Al vencer, el ID vuelve a **fallar** el PR.
- Excepción permanente (`expiresOn` omitido) solo si no hay versión parcheada y el riesgo está documentado.
- No uses la allowlist para “silenciar” un bump pending de Dependabot.

## Corrida local

En Linux/macOS/Git Bash (mismo flujo que CI):

```bash
# Binario Linux (o exportá OSV_SCANNER_BIN al de tu OS)
VERSION=v2.5.1
curl -sSL "https://github.com/google/osv-scanner/releases/download/${VERSION}/osv-scanner_linux_amd64" -o osv-scanner
echo "f9f25499a2c8cc367b3af45df2ea7eeca7fbccceab9c35079968f4b3652194be  osv-scanner" | sha256sum -c -
chmod +x osv-scanner
export OSV_SCANNER_BIN=./osv-scanner
bash scripts/eng-gates/osv-deps-scan.sh
```

Windows (PowerShell), solo el gate sobre un JSON ya generado:

```powershell
node scripts/eng-gates/osv-deps-gate.mjs osv-deps-report.json --osv-rc 1
```

Tests unitarios del gate (sin red):

```bash
node --test scripts/eng-gates/osv-deps-gate.test.mjs
```

## Configuración en GitHub

1. Mergiá el workflow `deps-vuln.yml`.
2. En **Settings → Branches → Branch protection** de `master`, marcá como required el check:
   - `osv-scanner (HIGH/CRITICAL)`
3. Sin eso, el job falla en rojo pero GitHub aún permite merge (igual que Dependabot hoy).
4. No requiere secretos nuevos: solo `GITHUB_TOKEN` implícito + egress a GitHub Releases y osv.dev.

## Duración estimada

| Paso | Tiempo típico |
|---|---|
| Checkout + setup-node | ~20–40 s |
| Descarga binario + checksum | ~10–20 s |
| Scan pom + pnpm-lock (API osv.dev) | ~30–90 s (local Windows medido ~160 s con resolución Maven) |
| Gate Node | &lt; 2 s |
| **Total en CI (ubuntu)** | **~1–3 min** |

## Estado al activar (snapshot 2026-09-23)

Corrida local contra los lockfiles actuales: **40 HIGH/CRITICAL** (bloquean) y **42 medium/low** (informativos). Incluye `xlsx@0.18.5` en `pnpm-lock.yaml` (CVE-2023-30533, CVE-2024-22363) aunque `package.json` ya cite 0.20.3. El primer PR que active el check required fallará hasta subir dependencias o documentar excepciones.

## Archivos

| Ruta | Rol |
|---|---|
| `.github/workflows/deps-vuln.yml` | Triggers (push/PR `master`, `workflow_dispatch`) |
| `scripts/eng-gates/osv-deps-scan.sh` | Invoca osv-scanner + gate |
| `scripts/eng-gates/osv-deps-gate.mjs` | Umbral HIGH/CRITICAL + allowlist |
| `scripts/eng-gates/osv-deps-allowlist.json` | Excepciones versionadas |
| `scripts/eng-gates/osv-deps-gate.test.mjs` | Tests del clasificador |
