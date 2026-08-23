import type { PlanId, User } from '../api'
import { catalogForAudience, isAlphaMiniApp, isAlphaSpace, isAdultMiniApp, isAdultSpace } from './catalog'

export const PLAN_PRICE_RMB = 20
export const ADULT_PLAN_PRICE_RMB = PLAN_PRICE_RMB
export const ADULT_AGE = 18

export function hasOrbitPlan(user: User | null | undefined) {
  return user?.plan_id === 'orbit' || Boolean(user?.adult_plan_active)
}

export function hasAlphaPlan(user: User | null | undefined) {
  return user?.plan_id === 'alpha'
}

export function hasAdultPlan(user: User | null | undefined) {
  return hasOrbitPlan(user)
}

export function needsBirthday(user: User | null | undefined) {
  return Boolean(user && !user.date_of_birth)
}

export function paidPlanForUser(user: User | null | undefined): Exclude<PlanId, 'free'> | '' {
  if (user?.account_kind === 'adult') return 'orbit'
  if (user?.account_kind === 'student') return 'alpha'
  return ''
}

export function planLabel(plan: PlanId | '' | undefined) {
  if (plan === 'orbit') return 'Orbit Plan'
  if (plan === 'alpha') return 'Alpha'
  return 'Free'
}

export function canOpenAdultContent(user: User | null | undefined, spaceId?: string, appKind?: string) {
  if (spaceId && isAdultSpace(spaceId) && !hasOrbitPlan(user)) return false
  if (appKind && isAdultMiniApp(appKind) && !hasOrbitPlan(user)) return false
  if (spaceId && isAlphaSpace(spaceId) && !hasAlphaPlan(user)) return false
  if (appKind && isAlphaMiniApp(appKind) && !hasAlphaPlan(user)) return false
  return true
}

export function appsForUser(user: User | null | undefined) {
  return catalogForAudience({ orbit: hasOrbitPlan(user), alpha: hasAlphaPlan(user) })
}
