import { isSignedIn } from "../access";

// Profile self-service limited to safe fields; goes through normal access and hooks.
export default async function updateActiveUser(_root: any, { data }: { data: any }, context: any) {
  if (!isSignedIn({ session: context.session })) throw new Error("Not authenticated");
  const allowed = new Set(["email", "name", "phone", "password", "onboardingStatus"]);
  if (Object.keys(data || {}).some(key => !allowed.has(key))) throw new Error("Unsupported profile field");
  if (data.onboardingStatus && !["not_started", "in_progress", "completed", "dismissed"].includes(data.onboardingStatus)) throw new Error("Invalid onboarding status");
  const user = await context.sudo().db.User.updateOne({ where: { id: context.session.itemId }, data });
  return { id: user.id, onboardingStatus: user.onboardingStatus };
}
