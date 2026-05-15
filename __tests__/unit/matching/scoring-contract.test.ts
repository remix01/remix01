import { scoreClassicCandidates } from '@/lib/services/matching'
import { buildScoringAudit, type ScoringCandidate, type ScoringInput, type ScoringResult } from '@/lib/services/matchingScoringContract'

describe('matching scoring contract', () => {
  const input: ScoringInput = {
    requestId: 'req-1',
    categoryId: 'cat-1',
    locationCity: 'Ljubljana',
    locationRegion: 'Osrednjeslovenska',
  }

  it('returns consistent ScoringResult shape for classic and smart-like pipelines', () => {
    const classic = scoreClassicCandidates(input, [
      { id: 'c1', available: true, city: 'Ljubljana', rating: 4.8, categoryIds: ['cat-1'] },
    ])

    const smartLike: ScoringResult[] = [
      {
        candidateId: 's1',
        score: 86,
        rank: 1,
        selected: true,
        reasons: [{ code: 'category', message: 'Category match', impact: 25 }],
        pipelineVersion: 'smart-v3-production',
      },
    ]

    for (const result of [classic[0], smartLike[0]]) {
      expect(result).toHaveProperty('candidateId')
      expect(result).toHaveProperty('score')
      expect(result).toHaveProperty('rank')
      expect(result).toHaveProperty('selected')
      expect(result).toHaveProperty('reasons')
      expect(result).toHaveProperty('pipelineVersion')
    }
  })

  it('handles empty candidates', () => {
    expect(scoreClassicCandidates(input, [])).toEqual([])
    expect(buildScoringAudit([])).toEqual({
      selectedCandidateId: null,
      score: null,
      mainReasons: [],
      pipelineVersion: 'classic-v1',
    })
  })

  it('filters unavailable partners via score impact and keeps stable order on tie', () => {
    const candidates: ScoringCandidate[] = [
      { id: 'b', available: false, city: 'Ljubljana', rating: 4.0, categoryIds: ['cat-1'] },
      { id: 'a', available: false, city: 'Ljubljana', rating: 4.0, categoryIds: ['cat-1'] },
    ]

    const results = scoreClassicCandidates(input, candidates)
    expect(results[0].score).toBe(results[1].score)
    expect(results[0].candidateId).toBe('a')
    expect(results[1].candidateId).toBe('b')
    expect(results[0].selected).toBe(true)
  })
})
