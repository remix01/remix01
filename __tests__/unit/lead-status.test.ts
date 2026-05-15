import { getLeadStatusLabelSl, toCanonicalLeadStatus, toLegacyInquiryStatus } from '@/lib/lead-status'

describe('lead status mapping', () => {
  it('maps legacy Slovene statuses to canonical enum', () => {
    expect(toCanonicalLeadStatus('odprto')).toBe('new')
    expect(toCanonicalLeadStatus('v_teku')).toBe('in_progress')
    expect(toCanonicalLeadStatus('zakljuceno')).toBe('completed')
    expect(toCanonicalLeadStatus('preklicano')).toBe('cancelled')
  })

  it('maps canonical statuses back to db-compatible legacy status', () => {
    expect(toLegacyInquiryStatus('new')).toBe('odprto')
    expect(toLegacyInquiryStatus('matched')).toBe('odprto')
    expect(toLegacyInquiryStatus('contacted')).toBe('v_teku')
    expect(toLegacyInquiryStatus('completed')).toBe('zakljuceno')
  })

  it('returns Slovenian labels while business logic stays canonical', () => {
    expect(getLeadStatusLabelSl('new')).toBe('Odprto')
    expect(getLeadStatusLabelSl('in_progress')).toBe('V teku')
  })
})
