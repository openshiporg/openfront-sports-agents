/** Offer the setup card until onboarding is finished or dismissed, or the agency already has athletes. */
export function shouldShowOnboardingCard(input: {
  canManageOnboarding?: boolean | null
  onboardingStatus?: string | null
  athletesCount?: number | null
}): boolean {
  if (!input.canManageOnboarding) return false
  if (input.onboardingStatus === "completed" || input.onboardingStatus === "dismissed") return false
  if (typeof input.athletesCount === "number" && input.athletesCount > 0) return false
  return true
}
