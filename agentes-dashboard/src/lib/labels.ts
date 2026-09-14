export const REPO = 'hotclickdev/Hot-click-dev';
export const GITHUB = `https://github.com/${REPO}`;

export const CADENCE_LABEL: Record<string, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  event: 'Evento',
};

export const STATUS_LABEL: Record<string, string> = {
  al_dia: 'Al día',
  activar: 'Activar',
  actualizar: 'Actualizar',
  mejorar: 'Mejorar',
};

export function workflowUrl(file: string | null): string | null {
  if (!file) return null;
  return `${GITHUB}/blob/master/.github/workflows/${file}`;
}

export function docUrl(doc: string | null): string | null {
  if (!doc) return null;
  return `${GITHUB}/blob/master/${doc}`;
}

export function formatCr(iso: string): string {
  try {
    return new Intl.DateTimeFormat('es-CR', {
      timeZone: 'America/Costa_Rica',
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
