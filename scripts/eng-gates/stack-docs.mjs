/**
 * DOC1 — facts from the repo (pom, Flyway, frontend, module counts).
 * Never reads .env or invents secrets.
 */

import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const GENERATED_STACK_PATH = 'docs/GENERATED_STACK.md';

const POM = 'Hot_click_outlet/pom.xml';
const PKG = 'Hot_click_outlet/frontend/package.json';
const MIGRATION_DIR = 'Hot_click_outlet/src/main/resources/db/migration';
const JAVA_ROOT = 'Hot_click_outlet/src/main/java';

function walk(dir, predicate, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, predicate, acc);
    else if (!predicate || predicate(full)) acc.push(full);
  }
  return acc;
}

function countLines(file) {
  return readFileSync(file, 'utf8').split('\n').length;
}

function depVersion(pkg, name) {
  return pkg.dependencies?.[name] || pkg.devDependencies?.[name] || '';
}

export function collectStackFacts(root = '.') {
  const pom = readFileSync(join(root, POM), 'utf8');
  const javaVersion = pom.match(/<java\.version>([^<]+)<\/java\.version>/)?.[1]?.trim() || 'unknown';
  const springBoot = pom.match(/<artifactId>spring-boot-starter-parent<\/artifactId>\s*<version>([^<]+)<\/version>/)?.[1]?.trim()
    || 'unknown';

  const pkg = JSON.parse(readFileSync(join(root, PKG), 'utf8'));
  const migrations = walk(join(root, MIGRATION_DIR), (file) => /\/V\d+__.+\.sql$/i.test(file.replaceAll('\\', '/')));
  const versions = migrations.map((file) => {
    const name = file.split(/[/\\]/).pop();
    const num = Number(name.match(/^V(\d+)__/)?.[1] || 0);
    return { num, name, file: file.replaceAll('\\', '/') };
  }).filter((item) => item.num > 0).sort((a, b) => a.num - b.num);

  const controllers = walk(join(root, JAVA_ROOT), (file) => file.endsWith('Controller.java') || file.includes('/controller/'));
  const controllerFiles = walk(join(root, JAVA_ROOT), (file) => /Controller\.java$/.test(file));
  const services = walk(join(root, JAVA_ROOT), (file) => /Service\.java$/.test(file));
  const repos = walk(join(root, JAVA_ROOT), (file) => /Repository\.java$/.test(file));
  const entities = walk(join(root, JAVA_ROOT, 'com/hotclick/model'), (file) => file.endsWith('.java'));

  const sized = (files) => files
    .map((file) => ({ file: file.replaceAll('\\', '/').replace(`${root.replaceAll('\\', '/')}/`, ''), lines: countLines(file) }))
    .sort((a, b) => b.lines - a.lines);

  return {
    javaVersion,
    springBoot,
    react: depVersion(pkg, 'react').replace(/^\^/, ''),
    vite: depVersion(pkg, 'vite').replace(/^\^/, ''),
    nodeEngine: pkg.engines?.node || '',
    packageManager: pkg.packageManager || 'pnpm',
    flywayCount: versions.length,
    flywayMin: versions[0]?.num || 0,
    flywayMax: versions.at(-1)?.num || 0,
    flywayLatest: versions.at(-1)?.name || '',
    controllers: controllerFiles.length,
    services: services.length,
    repositories: repos.length,
    entities: entities.length,
    topControllers: sized(controllerFiles).slice(0, 8),
    topServices: sized(services).slice(0, 8),
    extraControllerHits: controllers.length,
  };
}

export function renderGeneratedStack(facts, generatedOn) {
  const date = generatedOn || new Date().toISOString().slice(0, 10);
  const fp = fingerprint(facts);
  const rows = (items) => items.map((item) => `| \`${item.file.replace(/^Hot_click_outlet\//, '')}\` | ${item.lines} |`).join('\n');
  return `# Stack generado (DOC1)

<!-- generated-by: scripts/eng-gates/stack-docs.mjs -->
<!-- fingerprint: ${fp} -->

> Autogenerado el **${date}** desde \`pom.xml\`, Flyway, \`frontend/package.json\` y conteos de Java.
> No editar a mano. Corré \`scripts/generate-stack-docs.sh\`. **No incluye secretos.**

## Runtime (fuente: repo, no marketing)

| Hecho | Valor | Fuente |
| --- | --- | --- |
| Java | **${facts.javaVersion}** | \`Hot_click_outlet/pom.xml\` \`java.version\` |
| Spring Boot | **${facts.springBoot}** | \`spring-boot-starter-parent\` |
| React | **${facts.react}** | \`frontend/package.json\` |
| Vite | **${facts.vite}** | \`frontend/package.json\` |
| Node (engines) | ${facts.nodeEngine} | \`frontend/package.json\` |
| Package manager | ${facts.packageManager} | \`frontend/package.json\` |
| Flyway archivos | **${facts.flywayCount}** (\`V${facts.flywayMin}\`–\`V${facts.flywayMax}\`) | \`src/main/resources/db/migration/\` |
| Última migración | \`${facts.flywayLatest}\` | mismo dir |
| Controllers | ${facts.controllers} | \`*Controller.java\` |
| Services | ${facts.services} | \`*Service.java\` |
| Repositories | ${facts.repositories} | \`*Repository.java\` |
| Entidades \`model/\` | ${facts.entities} | \`com/hotclick/model\` |

## Controllers más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
${rows(facts.topControllers)}

## Services más grandes (líneas)

| Archivo | Líneas |
| --- | --- |
${rows(facts.topServices)}

## Docs que suelen quedar viejos

Si README o ESTADO_ACTUAL dicen **Java 24** o **Flyway V1–V56**, están desfasados. El número canónico es esta tabla.

Claims seguros que el generador puede parchear: versión de Java (pom), rango Flyway (archivos \`V*__\`), React (package.json). Nunca escribe API keys ni \`.env\`.
`;
}

export function fingerprint(facts) {
  const slim = {
    javaVersion: facts.javaVersion,
    springBoot: facts.springBoot,
    react: facts.react,
    vite: facts.vite,
    flywayCount: facts.flywayCount,
    flywayMax: facts.flywayMax,
    flywayLatest: facts.flywayLatest,
    controllers: facts.controllers,
    services: facts.services,
    repositories: facts.repositories,
    entities: facts.entities,
  };
  return Buffer.from(JSON.stringify(slim)).toString('base64url');
}

export function readFingerprint(markdown) {
  return markdown.match(/<!-- fingerprint: ([^\s]+) -->/)?.[1] || '';
}

export function plannedSafeDocPatches(facts, files) {
  const patches = [];
  const java = facts.javaVersion;
  if (files.readme) {
    if (files.readme.includes('Java 24') && java === '21') {
      patches.push({ file: 'README.md', from: 'Java 24', to: 'Java 21', reason: 'pom.xml java.version=21' });
    }
    const flywayOld = /Flyway \(56 versiones, V1–V56\)/;
    if (flywayOld.test(files.readme)) {
      patches.push({
        file: 'README.md',
        from: 'Flyway (56 versiones, V1–V56)',
        to: `Flyway (${facts.flywayCount} archivos, V${facts.flywayMin}–V${facts.flywayMax})`,
        reason: 'conteo real de V*__.sql',
      });
    }
    if (files.readme.includes('Flyway V1–V56')) {
      patches.push({
        file: 'README.md',
        from: 'Flyway V1–V56',
        to: `Flyway V${facts.flywayMin}–V${facts.flywayMax} (${facts.flywayCount} archivos)`,
        reason: 'rango Flyway real',
      });
    }
    if (files.readme.includes('React 18') && facts.react.startsWith('19')) {
      patches.push({ file: 'README.md', from: 'React 18', to: 'React 19', reason: 'frontend/package.json react@19' });
    }
    if (files.readme.includes('Última migración: `V56__consentimiento_log.sql`')) {
      patches.push({
        file: 'README.md',
        from: 'Última migración: `V56__consentimiento_log.sql` (bitácora de consentimiento Ley 8968).',
        to: `Última migración: \`${facts.flywayLatest}\` (canónico: [docs/GENERATED_STACK.md](docs/GENERATED_STACK.md)). V56 consentimiento Ley 8968 sigue existiendo.`,
        reason: 'última V* no es V56',
      });
    }
  }
  if (files.estado && files.estado.includes('Java 24') && java === '21') {
    patches.push({
      file: 'ESTADO_ACTUAL.md',
      from: 'Spring Boot 3.4.4 / Java 24',
      to: `Spring Boot ${facts.springBoot} / Java 21`,
      reason: 'tabla Stack vs pom.xml',
    });
  }
  return patches;
}

export function applyPatches(patches, readers, writers) {
  const working = { ...readers };
  const applied = [];
  for (const patch of patches) {
    const current = working[patch.file];
    if (!current || !current.includes(patch.from)) continue;
    working[patch.file] = current.replaceAll(patch.from, patch.to);
    applied.push(patch);
  }
  const written = new Set();
  for (const patch of applied) {
    if (written.has(patch.file)) continue;
    writers[patch.file](working[patch.file]);
    written.add(patch.file);
  }
  return applied;
}

export function writeGeneratedStack(root, facts, generatedOn) {
  const path = join(root, GENERATED_STACK_PATH);
  writeFileSync(path, renderGeneratedStack(facts, generatedOn));
  return path;
}

export function summarizeDrift(oldMarkdown, newMarkdown) {
  const oldFp = readFingerprint(oldMarkdown || '');
  const newFp = readFingerprint(newMarkdown || '');
  return {
    drifted: Boolean(oldFp && newFp && oldFp !== newFp) || (!oldFp && Boolean(newMarkdown)),
    oldFp,
    newFp,
  };
}
