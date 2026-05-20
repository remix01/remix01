import fs from 'fs'
import { canCancelPovprasevanje } from '@/components/narocnik/povprasevanje-actions'
import { canWithdrawPonudba } from '@/components/partner/offers-list'

describe('dashboard cancel/withdraw visibility guards', () => {
  it('cancel is hidden for terminal statuses', () => {
    expect(canCancelPovprasevanje('new')).toBe(true)
    expect(canCancelPovprasevanje('matched')).toBe(true)
    expect(canCancelPovprasevanje('contacted')).toBe(false)
    expect(canCancelPovprasevanje('in_progress')).toBe(false)
    expect(canCancelPovprasevanje('completed')).toBe(false)
    expect(canCancelPovprasevanje('cancelled')).toBe(false)
    expect(canCancelPovprasevanje('v_izvedbi')).toBe(false)
    expect(canCancelPovprasevanje('v_teku')).toBe(false)
    expect(canCancelPovprasevanje('zakljuceno')).toBe(false)
    expect(canCancelPovprasevanje('preklicano')).toBe(false)
    expect(canCancelPovprasevanje('odprto')).toBe(true)
    expect(canCancelPovprasevanje('dodeljeno')).toBe(true)
  })

  it('withdraw is hidden for non-owner', () => {
    expect(canWithdrawPonudba('poslana', 'owner-1', 'owner-2')).toBe(false)
  })

  it('withdraw is hidden after sprejeta/zavrnjena/umaknjena', () => {
    expect(canWithdrawPonudba('sprejeta', 'owner-1', 'owner-1')).toBe(false)
    expect(canWithdrawPonudba('zavrnjena', 'owner-1', 'owner-1')).toBe(false)
    expect(canWithdrawPonudba('umaknjena', 'owner-1', 'owner-1')).toBe(false)
  })

  it('successful withdraw action path uses guarded mutation', () => {
    const src = fs.readFileSync('app/actions/ponudbe.ts', 'utf8')
    expect(src).toMatch(/assertPonudbaTransition\(ponudba\.status, 'umaknjena'\)/)
    expect(src).toMatch(/updatePonudba\(ponudbaId, \{ status: 'umaknjena' \}\)/)
  })

  it('cancel action path uses guarded mutation function', () => {
    const src = fs.readFileSync('app/actions/povprasevanja.ts', 'utf8')
    expect(src).toMatch(/const result = await cancelPovprasevanje\(id\)/)
  })
})
