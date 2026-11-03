import { Building2, Package, CircleCheck } from 'lucide-react';

export type TemplateKey = 'full' | 'minimal' | 'custom';

export const SECTION_DEFINITIONS: { id: number; type: string; label: string; entity: string }[] = [
  { id: 1, type: 'agency', label: 'Agency', entity: 'Agency' },
  { id: 2, type: 'roles', label: 'Roles', entity: 'Role' },
  { id: 3, type: 'staff', label: 'Staff', entity: 'Staff' },
  { id: 4, type: 'certifications', label: 'Certifications', entity: 'AgentCertification' },
  { id: 5, type: 'teams', label: 'Teams', entity: 'Team' },
  { id: 6, type: 'athletes', label: 'Athletes', entity: 'Athlete' },
  { id: 7, type: 'agreements', label: 'Representation agreements', entity: 'RepresentationAgreement' },
  { id: 8, type: 'contacts', label: 'Contacts', entity: 'Contact' },
  { id: 9, type: 'brands', label: 'Brands', entity: 'Brand' },
  { id: 10, type: 'contracts', label: 'Playing contracts', entity: 'PlayingContract' },
  { id: 11, type: 'deals', label: 'Endorsement deals', entity: 'EndorsementDeal' },
  { id: 12, type: 'splits', label: 'Agent splits', entity: 'AgentSplit' },
  { id: 13, type: 'paymentProviders', label: 'Payment providers', entity: 'PaymentProvider' },
  { id: 14, type: 'money', label: 'Schedules, invoices and ledger', entity: 'Money' },
];

export const TEMPLATES: Record<TemplateKey, { name: string; description: string; icon: React.ReactNode }> = {
  full: { name: 'Complete agency', description: 'Staff, 14 athletes, contracts, endorsements, invoices and ledger.', icon: <Building2 className="h-5 w-5" /> },
  minimal: { name: 'Basic agency', description: 'One agent, one athlete, one agreement, one contract and one deal.', icon: <Package className="h-5 w-5" /> },
  custom: { name: 'Custom', description: 'Edit the JSON for each section.', icon: <CircleCheck className="h-5 w-5" /> },
};

export type SectionDefinition = (typeof SECTION_DEFINITIONS)[number];
