import { STATUS_LABEL } from '@/lib/labels';
import type { InspectStatus } from '@/lib/types';

export function StatusBadge({ status }: { status: InspectStatus | string }) {
  const label = STATUS_LABEL[status] ?? status;
  return <span className={`badge ${status}`}>{label}</span>;
}
