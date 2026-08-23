import type { BillingPlanId } from '../api'

export type MiniAppId =
  | 'focus' | 'notes' | 'habits' | 'decision' | 'mood' | 'countdown'
  | 'flashcards' | 'homework' | 'vocab' | 'streaks'
  | 'ideas' | 'meetings' | 'deepwork' | 'wins'

export type MiniAppTier = 'free' | 'alpha' | 'orbit'

export interface MiniAppMeta {
  id: MiniAppId
  name: string
  eyebrow: string
  description: string
  color: string
  icon: 'timer' | 'note' | 'habit' | 'shuffle' | 'heart' | 'calendar' | 'cards' | 'list' | 'book' | 'flame' | 'bulb' | 'users' | 'target' | 'award'
  tier: MiniAppTier
}

export const HELIOS_MINI_APPS: MiniAppMeta[] = [
  { id: 'focus', name: 'Focus Orbit', eyebrow: 'TIME', description: 'A quiet focus timer that survives refreshes.', color: '#8576f5', icon: 'timer', tier: 'free' },
  { id: 'notes', name: 'Quick Notes', eyebrow: 'CAPTURE', description: 'Catch the thought before it leaves your orbit.', color: '#4fc3f7', icon: 'note', tier: 'free' },
  { id: 'habits', name: 'Habit Pulse', eyebrow: 'RHYTHM', description: 'Small daily signals, visible over time.', color: '#6ed69a', icon: 'habit', tier: 'free' },
  { id: 'decision', name: 'Decision Flip', eyebrow: 'CLARITY', description: 'Choose between good options without the spiral.', color: '#f2b84b', icon: 'shuffle', tier: 'free' },
  { id: 'mood', name: 'Mood Check', eyebrow: 'FEEL', description: 'Log how today actually felt, without performing.', color: '#ff7eb6', icon: 'heart', tier: 'free' },
  { id: 'countdown', name: 'Countdown', eyebrow: 'AHEAD', description: 'Keep exams, launches and due dates in sight.', color: '#68b7ff', icon: 'calendar', tier: 'free' },
  { id: 'flashcards', name: 'Flash Cards', eyebrow: 'REVISE', description: 'Flip cards until the answer lands in your head.', color: '#74c0e8', icon: 'cards', tier: 'alpha' },
  { id: 'homework', name: 'Homework Radar', eyebrow: 'DUE', description: 'See what is due next and knock it down.', color: '#ff9b6a', icon: 'list', tier: 'alpha' },
  { id: 'vocab', name: 'Vocab Spark', eyebrow: 'WORDS', description: 'Collect words, meanings and a one-line example.', color: '#b794ff', icon: 'book', tier: 'alpha' },
  { id: 'streaks', name: 'Streak Arena', eyebrow: 'FIRE', description: 'Protect a daily streak you actually care about.', color: '#ff8a65', icon: 'flame', tier: 'alpha' },
  { id: 'ideas', name: 'Idea Vault', eyebrow: 'SPARK', description: 'Park ideas before they evaporate.', color: '#f2b84b', icon: 'bulb', tier: 'orbit' },
  { id: 'meetings', name: 'Meeting Pulse', eyebrow: 'WORK', description: 'Capture decisions and the next owner in one pass.', color: '#4fc3f7', icon: 'users', tier: 'orbit' },
  { id: 'deepwork', name: 'Deep Work', eyebrow: 'FLOW', description: 'Longer focus blocks with a written intention.', color: '#8576f5', icon: 'target', tier: 'orbit' },
  { id: 'wins', name: 'Win Log', eyebrow: 'PROOF', description: 'Keep a private record of finished, real work.', color: '#6ed69a', icon: 'award', tier: 'orbit' },
]

export function miniAppUnlocked(tier: MiniAppTier, plan: BillingPlanId | undefined) {
  if (tier === 'free') return true
  if (plan === 'orbit') return true
  if (plan === 'alpha') return tier === 'alpha'
  return false
}

export function unlockLabel(tier: MiniAppTier) {
  return tier === 'alpha' ? 'Unlock with Alpha' : 'Unlock with Orbit'
}

export function miniAppsForPlan(plan: BillingPlanId | 'all' | undefined) {
  if (plan === 'all') return HELIOS_MINI_APPS
  return HELIOS_MINI_APPS.filter(app => miniAppUnlocked(app.tier, plan ?? 'free'))
}
