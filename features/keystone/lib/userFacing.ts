import { GraphQLError } from 'graphql';

/** Domain refusals ("Notice period runs until ...") are plain Errors. Surface them as user input errors so the dashboard can show them;
 *  driver, Prisma and unexpected failures keep their original shape and stay masked. */
const INTERNAL = /prisma|invocation|\bSQL\b|ECONN|ETIMEDOUT|postgres|node_modules|\.(ts|js):\d+|\bat\s+\S+\s*\(/i;
export function isDomainRefusal(e: unknown): e is Error {
  if (!(e instanceof Error) || e instanceof GraphQLError) return false;
  if (!e.constructor || e.constructor.name !== 'Error') return false;
  return e.message.length > 0 && e.message.length <= 400 && !INTERNAL.test(e.message) && !INTERNAL.test(e.stack?.split('\n')[0] ?? '');
}
export function userFacing<T extends (...a: any[]) => any>(fn: T): T {
  return (async (...args: any[]) => {
    try { return await fn(...args); }
    catch (e) { if (isDomainRefusal(e)) throw new GraphQLError(e.message, { extensions: { code: 'KS_USER_INPUT_ERROR' } }); throw e; }
  }) as T;
}
export function userFacingAll<T extends Record<string, any>>(r: T): T {
  return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'function' ? userFacing(v) : v])) as T;
}
