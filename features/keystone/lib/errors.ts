/** A refusal thrown on purpose for the operator to read ("Notice period runs until ...").
 *  Only DomainError reaches the dashboard; every other error (config, provider, driver, bug) is masked. */
const BRAND = Symbol.for('openfront.sports-agents.DomainError');
export class DomainError extends Error {
  readonly [BRAND] = true;
  constructor(message: string) { super(message); this.name = 'DomainError'; }
}
/** Brand check survives duplicate module instances (dev reloads, bundles) where instanceof would not. */
export const isDomainError = (e: unknown): e is DomainError => e instanceof Error && (e as any)[BRAND] === true && e.message.length > 0;
