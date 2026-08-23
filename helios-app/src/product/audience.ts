import type { User } from '../api'
import { catalogForAudience, isAdultMiniApp, isAdultSpace } from './catalog'

export const ADULT_PLAN_PRICE_RMB = 20

export function hasAdultPlan(user: User | null | undefined) {
  return Boolean(user?.account_kind === 'adult' && user.adult_plan_active)
}

export function needsAccountKind(user: User | null | undefined) {
  return Boolean(user && !user.account_kind)
}

export function needsAdultPlan(user: User | null | undefined) {
  return Boolean(user?.account_kind === 'adult' && !user.adult_plan_active)
}

export function canOpenAdultContent(user: User | null | undefined, spaceId?: string, appKind?: string) {
  if (spaceId && isAdultSpace(spaceId) && !hasAdultPlan(user)) return false
  if (appKind && isAdultMiniApp(appKind) && !hasAdultPlan(user)) return false
  return true
}

export function appsForUser(user: User | null | undefined) {
  return catalogForAudience(hasAdultPlan(user))
}
