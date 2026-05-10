export const APPLICATION_STATUSES = [
  'applied',
  'lead',
  'paid',
  'payment_failed',
  'issued',
  'drop'
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const STATUS_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  applied: ['paid', 'payment_failed', 'drop'],
  lead: ['paid', 'payment_failed'],
  paid: ['issued', 'drop'],
  payment_failed: ['applied', 'drop'],
  issued: ['drop'],
  drop: ['applied']
};

export function canTransitionStatus(from: ApplicationStatus, to: ApplicationStatus) {
  return STATUS_TRANSITIONS[from].includes(to);
}
