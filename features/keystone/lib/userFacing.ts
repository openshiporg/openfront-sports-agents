import { GraphQLError } from 'graphql';
import { isDomainError } from './errors';

/** Allowlist: only DomainError is shown to the operator (as a user input error). Every other error, including config
 *  ("Missing STRIPE_SECRET_KEY"), third-party and driver errors and bugs, keeps its original shape and is masked by the dashboard. */
export function userFacing<T extends (...a: any[]) => any>(fn: T): T {
  return (async (...args: any[]) => {
    try { return await fn(...args); }
    catch (e) { if (isDomainError(e)) throw new GraphQLError(e.message.slice(0, 400), { extensions: { code: 'KS_USER_INPUT_ERROR' } }); throw e; }
  }) as T;
}
export function userFacingAll<T extends Record<string, any>>(r: T): T {
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'function' ? userFacing(v) : v])) as T;
}
