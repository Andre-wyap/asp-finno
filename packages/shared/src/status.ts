export const APPLICATION_STATUSES = [
  'lead',
  'paid',
  'payment_failed',
  'issued'
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  lead: ['paid', 'payment_failed'],
  paid: ['issued'],
  payment_failed: ['lead'],
  issued: []
};

export function canTransitionStatus(from: ApplicationStatus, to: ApplicationStatus) {
  return STATUS_TRANSITIONS[from].includes(to);
}
