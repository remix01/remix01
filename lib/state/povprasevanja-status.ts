const INVALID_TRANSITION_MESSAGE = 'Neveljaven prehod statusa.'

export const POVPRASEVANJE_TRANSITIONS: Record<string, string[]> = {
  odprto: ['dodeljeno', 'preklicano', 'arhivirano'],
  dodeljeno: ['v_izvedbi', 'preklicano'],
  v_izvedbi: ['zakljuceno', 'sporno'],
  zakljuceno: ['ocenjeno', 'sporno'],
  sporno: ['zakljuceno', 'preklicano'],
  ocenjeno: [],
  preklicano: [],
  arhivirano: [],
}

export function canTransitionPovprasevanje(fromStatus: string, toStatus: string): boolean {
  if (fromStatus === toStatus) return true
  const allowed = POVPRASEVANJE_TRANSITIONS[fromStatus] ?? []
  return allowed.includes(toStatus)
}

export function assertPovprasevanjeTransition(fromStatus: string, toStatus: string): void {
  if (!canTransitionPovprasevanje(fromStatus, toStatus)) {
    throw new Error(INVALID_TRANSITION_MESSAGE)
  }
}
