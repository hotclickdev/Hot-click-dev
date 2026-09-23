export type Cadence = 'daily' | 'weekly' | 'event';

export type InspectStatus = 'al_dia' | 'activar' | 'actualizar' | 'mejorar';

export type AgentRecord = {
  id: string;
  name: string;
  cadence: Cadence;
  ola: number;
  workflow: string | null;
  script: string | null;
  doc: string | null;
  triggerHint: string;
  skipLabel: string | null;
};

export type CatalogFile = {
  repo: string;
  generatedFrom: string[];
  agents: AgentRecord[];
};

export type OlaRecord = {
  n: number;
  status: 'en_master' | 'pendiente';
  pr: number | null;
  doc: string | null;
  title: string;
  ids: string[];
  summary: string;
};

export type OlasFile = {
  totalOlas: number;
  onMaster: number;
  headline: string;
  note: string;
  olas: OlaRecord[];
};

export type AgentInspection = {
  id: string;
  status: InspectStatus;
  workflowFound: boolean;
  workflowFile: string | null;
  docsFound: boolean;
  scriptFound: boolean;
  cadenceMatch: boolean;
  notes: string[];
};

export type InspectionRun = {
  id: string;
  ranAt: string;
  source: string;
  repoRoot: string;
  summary: Record<InspectStatus, number>;
  agents: AgentInspection[];
};

export type InspectionsFile = {
  updatedAt?: string;
  runs: InspectionRun[];
};
