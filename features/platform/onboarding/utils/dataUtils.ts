export function getItemsFromJsonData(data: any, type: string): string[] {
  if (!data) return [];
  const v = data[type];
  if (type === 'agency') return v ? [v.name] : [];
  if (type === 'money') return v ? ['Payment schedules', 'Commission invoices', 'Ledger entries', 'Client trust'] : [];
  const label = (r: any) => (type === 'splits' ? `${r.athlete} / ${String(r.userEmail).split('@')[0]}` : '') || r.fullName || r.name || r.title || (r.userEmail ? `${r.body} ${r.number}` : '') || (r.athlete ? `${r.athlete}${r.brand ? ' / ' + r.brand : r.startSeason ? ' ' + r.startSeason : ''}` : '') || r.code || 'Record';
  return Array.isArray(v) ? v.map(label) : [];
}

export function getSeedForTemplate(template: 'full' | 'minimal' | 'custom', seed: any) {
  return JSON.parse(JSON.stringify(seed[template === 'custom' ? 'minimal' : template]));
}
