export const permissionNames = ['canSeeOtherPeople','canEditOtherPeople','canManagePeople','canManageRoles','canAccessDashboard','canManageAthletes','canManageContracts','canManageEndorsements','canManageCommissions','canManageTrust','canViewAllClients','canManagePayments','canReadPayments','canIssueRefunds','canReadAudit','canManageOnboarding','canApproveActions'] as const;
export type Permission = typeof permissionNames[number];
export type Session = { itemId: string; listKey: string; data: { name: string; email?: string; role: { id: string; name: string } & Record<Permission, boolean> } };
type Args = { session?: Session };
export const isSignedIn = ({session}: Args) => Boolean(session);
export const permissions = Object.fromEntries(permissionNames.map(name => [name, ({session}: Args) => session?.data.role?.[name] ?? false])) as Record<Permission, (args: Args) => boolean>;
export function athleteScope({session}: Args): any {
  if (!session) return false;
  if (session.data.role?.canViewAllClients) return true;
  return { OR: [{leadAgent: {id: {equals: session.itemId}}}, {supportStaff: {some: {id: {equals: session.itemId}}}}] };
}
// Relation filters must not read through to a list the session cannot read in full.
export const canFilterRelations = ({session}: Args) => Boolean(session?.data.role?.canViewAllClients);
export const canFilterPeople = ({session}: Args) => Boolean(session?.data.role?.canSeeOtherPeople);
export const rules = {
  canReadPeople: ({session}: Args): any => !session ? false : session.data.role?.canSeeOtherPeople ? true : {id: {equals: session.itemId}},
  canUpdatePeople: ({session}: Args): any => !session ? false : session.data.role?.canEditOtherPeople ? true : {id: {equals: session.itemId}},
};
