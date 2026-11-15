// Cliente GitHub de SOLO LECTURA: solo GET REST y GraphQL sin 'mutation'.
// Errores, rate limit o paginación inconsistente se devuelven como status!=200 / ok:false.
const API = 'https://api.github.com';
export function readOnlyClient(token, fetchImpl = globalThis.fetch) {
  if (!token) throw new Error('github-read: token de lectura ausente (fail-closed)');
  const h = { authorization: `Bearer ${token}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28' };
  async function get(path) {
    if (!path.startsWith('/')) throw new Error('github-read: ruta no relativa');
    const res = await fetchImpl(API + path, { method: 'GET', headers: h });
    let json = null; try { json = await res.json(); } catch { json = null; }
    return { status: res.status, json, link: res.headers?.get?.('link') ?? null };
  }
  async function paginate(path, field) {
    const pages = []; let url = path;
    for (let i = 0; i < 100 && url; i++) {
      const p = await get(url);
      if (p.status !== 200 || !p.json || !Array.isArray(p.json[field])) return [{ total_count: -1, [field]: [] }];
      pages.push(p.json);
      const m = /<https:\/\/api\.github\.com([^>]+)>;\s*rel="next"/.exec(p.link ?? '');
      url = m ? m[1] : null;
    }
    if (url) return [{ total_count: -1, [field]: [] }];
    return pages;
  }
  // Listas JSON (p. ej. anotaciones de un check run). Error/no-array/límite => null (fail-closed).
  async function paginateArray(path) {
    const pages = []; let url = path;
    for (let i = 0; i < 100 && url; i++) {
      const p = await get(url);
      if (p.status !== 200 || !Array.isArray(p.json)) return null;
      pages.push(p.json);
      const m = /<https:\/\/api\.github\.com([^>]+)>;\s*rel="next"/.exec(p.link ?? '');
      url = m ? m[1] : null;
    }
    return url ? null : pages;
  }
  async function graphql(query, variables) {
    if (/\bmutation\b/i.test(query) || /\bsubscription\b/i.test(query)) throw new Error('github-read: GraphQL de escritura prohibido');
    const res = await fetchImpl(API + '/graphql', { method: 'POST', headers: h, body: JSON.stringify({ query, variables }) });
    let json = null; try { json = await res.json(); } catch { json = null; }
    return { ok: res.status === 200 && !!json && !json.errors, json };
  }
  return { get, paginate, paginateArray, graphql };
}
