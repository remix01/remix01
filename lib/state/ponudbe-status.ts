export const PONUDBA_TRANSITIONS: Record<string, string[]> = {
  poslana: ['sprejeta', 'zavrnjena', 'umaknjena'],
  sprejeta: [],
  zavrnjena: [],
  umaknjena: [],
}

export function canTransitionPonudba(fromStatus: string, toStatus: string): boolean {
  if (fromStatus === toStatus) return true
  const allowed = PONUDBA_TRANSITIONS[fromStatus] ?? []
  return allowed.includes(toStatus)
}

export function assertPonudbaTransition(fromStatus: string, toStatus: string): void {
  if (!canTransitionPonudba(fromStatus, toStatus)) {
    throw new Error(`Neveljaven prehod stanja ponudbe: ${fromStatus} → ${toStatus}`)
  }
}
