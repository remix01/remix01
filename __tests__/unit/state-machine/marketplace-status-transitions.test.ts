import { assertPovprasevanjeTransition, canTransitionPovprasevanje } from '@/lib/state/povprasevanja-status'
import { assertPonudbaTransition, canTransitionPonudba } from '@/lib/state/ponudbe-status'

describe('marketplace status transitions', () => {
  test('allows valid povprasevanje transitions', () => {
    expect(canTransitionPovprasevanje('odprto', 'dodeljeno')).toBe(true)
    expect(canTransitionPovprasevanje('odprto', 'arhivirano')).toBe(true)
    expect(() => assertPovprasevanjeTransition('v_izvedbi', 'sporno')).not.toThrow()
  })

  test('blocks invalid povprasevanje transitions', () => {
    expect(canTransitionPovprasevanje('odprto', 'zakljuceno')).toBe(false)
    expect(() => assertPovprasevanjeTransition('odprto', 'zakljuceno')).toThrow(
      'Neveljaven prehod stanja povpraševanja: odprto → zakljuceno'
    )
  })

  test('allows valid ponudba transitions', () => {
    expect(canTransitionPonudba('poslana', 'sprejeta')).toBe(true)
    expect(canTransitionPonudba('poslana', 'umaknjena')).toBe(true)
    expect(() => assertPonudbaTransition('poslana', 'zavrnjena')).not.toThrow()
  })

  test('blocks invalid ponudba transitions', () => {
    expect(canTransitionPonudba('sprejeta', 'zavrnjena')).toBe(false)
    expect(() => assertPonudbaTransition('sprejeta', 'zavrnjena')).toThrow(
      'Neveljaven prehod stanja ponudbe: sprejeta → zavrnjena'
    )
  })
})
