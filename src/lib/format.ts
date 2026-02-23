const AGENCY_LABELS: Record<string, string> = {
  fda_food: 'FDA Food',
  fda_drug: 'FDA Drug',
  fda_device: 'FDA Devices',
  cpsc: 'CPSC',
  nhtsa: 'NHTSA',
  usda: 'USDA FSIS',
};

const SEVERITY_LABELS: Record<number, string> = {
  1: 'Critical',
  2: 'Moderate',
  3: 'Low',
};

const SEVERITY_COLORS: Record<number, string> = {
  1: 'text-amber-600 dark:text-amber-400',
  2: 'text-yellow-600 dark:text-yellow-400',
  3: 'text-teal-600 dark:text-teal-400',
};

const SEVERITY_BG: Record<number, string> = {
  1: 'bg-red-500/10 text-amber-700 dark:text-amber-400',
  2: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400',
  3: 'bg-emerald-500/10 text-teal-700 dark:text-teal-400',
};

export function agencyLabel(agency: string): string {
  return AGENCY_LABELS[agency] || agency;
}

export function severityLabel(severity: number): string {
  return SEVERITY_LABELS[severity] || 'Unknown';
}

export function severityColor(severity: number): string {
  return SEVERITY_COLORS[severity] || '';
}

export function severityBg(severity: number): string {
  return SEVERITY_BG[severity] || '';
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatShortDate(dateStr: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US');
}

export function classLabel(classification: string | null): string {
  if (!classification) return '';
  if (classification.includes('I') && !classification.includes('II')) return 'Class I';
  if (classification.includes('III')) return 'Class III';
  if (classification.includes('II')) return 'Class II';
  return classification;
}

export function statusLabel(status: string | null): string {
  if (!status) return 'Unknown';
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
}

export function truncate(text: string | null, maxLen: number): string {
  if (!text) return '';
  if (text.length <= maxLen) return text;
  return text.substring(0, maxLen - 1) + '\u2026';
}
