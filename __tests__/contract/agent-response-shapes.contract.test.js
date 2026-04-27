const { describe, it, expect } = require('@jest/globals')
const fs = require('fs')
const path = require('path')

function read(file) {
  return fs.readFileSync(path.join(process.cwd(), file), 'utf8')
}

const ROUTES = {
  chat: 'app/api/agent/chat/route.ts',
  scheduling: 'app/api/agent/scheduling/route.ts',
  offerComparison: 'app/api/agent/offer-comparison/route.ts',
  taskDescription: 'app/api/agent/task-description/route.ts',
  videoDiagnosis: 'app/api/agent/video-diagnosis/route.ts',
  materials: 'app/api/agent/materials/route.ts',
  jobSummary: 'app/api/agent/job-summary/route.ts',
  quoteGenerator: 'app/api/agent/quote-generator/route.ts',
  genericAgent: 'app/api/agent/[agentType]/route.ts',
}

const CONSUMERS = {
  useAgentChat: 'components/agent/useAgentChat.ts',
  schedulingAssistant: 'components/agent/SchedulingAssistant.tsx',
  offerComparisonAgent: 'components/agent/OfferComparisonAgent.tsx',
  taskDescriptionAssistant: 'components/agent/TaskDescriptionAssistant.tsx',
  videoDiagnosisAssistant: 'components/agent/VideoDiagnosisAssistant.tsx',
  agentDialog: 'components/agents/AgentDialog.tsx',
}

const routeSrc = Object.fromEntries(Object.entries(ROUTES).map(([k, f]) => [k, read(f)]))
const consumerSrc = Object.fromEntries(Object.entries(CONSUMERS).map(([k, f]) => [k, read(f)]))

// Response shape inventory. Phase-1 migration endpoints use dual-shape compatibility.
const ENDPOINT_INVENTORY = {
  chat: {
    methods: {
      GET: {
        successTopLevelFields: ['messages'],
        canonicalSuccess: ['ok', 'data'],
        authDeniedShape: '{ error } @ 401',
      },
      POST: {
        successTopLevelFields: ['message', 'usage'],
        canonicalSuccess: ['ok', 'data'],
        errorShape: '{ error }',
        canonicalError: ['ok', 'canonical_error'],
        authDeniedShape: '{ error } @ 401',
      },
      DELETE: {
        successTopLevelFields: ['success'],
        canonicalSuccess: ['ok', 'data'],
        canonicalError: ['ok', 'canonical_error'],
        authDeniedShape: '{ error } @ 401',
      },
    },
  },
  scheduling: {
    methods: {
      POST: {
        successTopLevelFields: ['alreadyScheduled', 'suggestions'],
        canonicalSuccess: ['ok', 'data'],
        errorShape: '{ error }',
        canonicalError: ['ok', 'canonical_error'],
        authDeniedShape: '{ error } @ 401',
      },
      PUT: {
        successTopLevelFields: ['delegated to confirmSchedulingRequest'],
        errorShape: '{ error }',
        canonicalError: ['ok', 'canonical_error'],
        authDeniedShape: '{ error } @ 401',
      },
    },
  },
  offerComparison: {
    methods: {
      POST: {
        successTopLevelFields: ['analysis'],
        canonicalSuccess: ['ok', 'data'],
        errorShape: '{ error }',
        canonicalError: ['ok', 'canonical_error'],
        authDeniedShape: '{ error } @ 401',
      },
    },
  },
  taskDescription: {
    methods: {
      POST: {
        successTopLevelFields: ['variants', 'questions', 'suggestedTitle'],
        canonicalSuccess: ['ok', 'data'],
        errorShape: '{ error }',
        canonicalError: ['ok', 'canonical_error'],
        authDeniedShape: '{ error } @ 401',
      },
    },
  },
  videoDiagnosis: {
    methods: {
      POST: {
        successTopLevelFields: ['diagnosis'],
        canonicalSuccess: ['ok', 'data'],
        errorShape: '{ error }',
        canonicalError: ['ok', 'canonical_error'],
        authDeniedShape: '{ error } @ 401',
      },
    },
  },
  materials: {
    methods: {
      POST: {
        successTopLevelFields: ['material_list', 'usage'],
        errorShape: '{ error }',
        authDeniedShape: '{ error } @ 401',
      },
    },
  },
  jobSummary: {
    methods: {
      POST: {
        successTopLevelFields: ['report_text', 'usage'],
        errorShape: '{ error }',
        authDeniedShape: '{ error } @ 401',
      },
    },
  },
  quoteGenerator: {
    methods: {
      POST: {
        successTopLevelFields: ['draft_text', 'usage'],
        errorShape: '{ error }',
        authDeniedShape: '{ error } @ 401',
      },
    },
  },
  genericAgent: {
    methods: {
      GET: {
        successTopLevelFields: ['messages'],
        canonicalSuccess: ['ok', 'data'],
        authDeniedShape: '{ error } @ 401',
      },
      POST: {
        successTopLevelFields: ['message', 'usage'],
        errorShape: '{ error }',
        canonicalSuccess: ['ok', 'data'],
        canonicalError: ['ok', 'canonical_error'],
        authDeniedShape: '{ error } @ 401',
      },
      DELETE: {
        successTopLevelFields: ['success'],
        errorShape: '{ error }',
        canonicalSuccess: ['ok', 'data'],
        canonicalError: ['ok', 'canonical_error'],
        authDeniedShape: '{ error } @ 401',
      },
    },
  },
}

describe('Agent frontend consumers ↔ response shape contract', () => {
  it('chat consumer locks messages/message', () => {
    expect(consumerSrc.useAgentChat).toMatch(/Array\.isArray\(data\.messages\)/)
    expect(consumerSrc.useAgentChat).toMatch(/content:\s*data\.message\s*\|\|/)
    expect(routeSrc.chat).toMatch(/return success\(\{ messages:/)
    expect(routeSrc.chat).toMatch(/return success\(\{\s*message:/)
  })

  it('scheduling consumer locks alreadyScheduled/suggestions', () => {
    expect(consumerSrc.schedulingAssistant).toMatch(/if \(data\.alreadyScheduled\)/)
    expect(consumerSrc.schedulingAssistant).toMatch(/setSuggestions\(data\.suggestions\)/)
    expect(routeSrc.scheduling).toMatch(/alreadyScheduled:\s*true/)
    expect(routeSrc.scheduling).toMatch(/return success\(\{\s*suggestions,/)
  })

  it('offer comparison consumer locks analysis', () => {
    expect(consumerSrc.offerComparisonAgent).toMatch(/setAnalysis\(data\.analysis\)/)
    expect(routeSrc.offerComparison).toMatch(/return success\(\{ analysis, ponudbe \}\)/)
  })

  it('task description consumer locks generated fields', () => {
    expect(consumerSrc.taskDescriptionAssistant).toMatch(/setResult\(data\)/)
    expect(consumerSrc.taskDescriptionAssistant).toMatch(/result\.variants\[activeVariant\]/)
    expect(consumerSrc.taskDescriptionAssistant).toMatch(/result\.questions\.length/)
    expect(consumerSrc.taskDescriptionAssistant).toMatch(/result\.suggestedTitle/)
    expect(routeSrc.taskDescription).toMatch(/return success\(parsed\)/)
  })

  it('video diagnosis consumer locks diagnosis field', () => {
    expect(consumerSrc.videoDiagnosisAssistant).toMatch(/setDiagnosis\(data\.diagnosis\)/)
    expect(routeSrc.videoDiagnosis).toMatch(/return success\(\{ diagnosis \}\)/)
  })

  it('generic dialog consumer locks conversation/message fields', () => {
    expect(consumerSrc.agentDialog).toMatch(/\.then\(\(\{ messages: hist \}\)/)
    expect(consumerSrc.agentDialog).toMatch(/content:\s*data\.message/)
    expect(routeSrc.genericAgent).toMatch(/return success\(\{\s*message:/)
    expect(routeSrc.genericAgent).toMatch(/return success\(\{ messages:/)
  })
})

describe('Agent endpoint inventory contract (success/error/auth + plain JSON)', () => {
  it('documents the endpoint inventory in test file for migration safety', () => {
    expect(ENDPOINT_INVENTORY.chat.methods.POST.successTopLevelFields).toEqual(['message', 'usage'])
    expect(ENDPOINT_INVENTORY.scheduling.methods.POST.successTopLevelFields).toEqual(['alreadyScheduled', 'suggestions'])
    expect(ENDPOINT_INVENTORY.offerComparison.methods.POST.successTopLevelFields).toEqual(['analysis'])
    expect(ENDPOINT_INVENTORY.videoDiagnosis.methods.POST.successTopLevelFields).toEqual(['diagnosis'])
    expect(ENDPOINT_INVENTORY.taskDescription.methods.POST.successTopLevelFields).toEqual(['variants', 'questions', 'suggestedTitle'])
    expect(ENDPOINT_INVENTORY.genericAgent.methods.POST.successTopLevelFields).toEqual(['message', 'usage'])
  })

  it('all scoped endpoints are plain JSON (NextResponse.json)', () => {
    for (const source of Object.values(routeSrc)) {
      expect(source).toMatch(/NextResponse\.json\(/)
    }
  })

  it('all scoped endpoints keep legacy { error } branches and explicit 401 auth denied shape', () => {
    for (const [name, source] of Object.entries(routeSrc)) {
      if (['chat', 'scheduling', 'offerComparison', 'taskDescription', 'videoDiagnosis', 'genericAgent'].includes(name)) {
        expect(source).toMatch(/error:\s*message/)
      } else {
        expect(source).toMatch(/NextResponse\.json\(\{\s*error:/)
      }

      // chat has brace-wrapped auth branch, others mostly one-line return
      if (name === 'chat') {
        expect(source).toMatch(/if \(!user\) \{\s*return fail\('Nepooblaščen dostop\.', 401, 'UNAUTHORIZED'\)/)
      } else if (name === 'scheduling' || ['offerComparison', 'taskDescription', 'videoDiagnosis', 'genericAgent'].includes(name)) {
        expect(source).toMatch(/if \(!user\) return fail\('Nepooblaščen dostop\.', 401, 'UNAUTHORIZED'\)/)
      } else {
        expect(source).toMatch(/if \(!user\) return NextResponse\.json\(\{ error: 'Nepooblaščen dostop\.'/)
      }

      if (['chat', 'scheduling', 'offerComparison', 'taskDescription', 'videoDiagnosis', 'genericAgent'].includes(name)) {
        expect(source).toMatch(/fail\('Nepooblaščen dostop\.', 401, 'UNAUTHORIZED'\)/)
      } else {
        expect(source).toMatch(/status:\s*401/)
      }
    }
  })
})

describe('High-risk endpoints dual-shape compatibility (/agent/chat, /agent/scheduling)', () => {
  it('chat GET/POST/DELETE use canonical success wrapper while preserving legacy fields', () => {
    expect(routeSrc.chat).toMatch(/function success\(/)
    expect(routeSrc.chat).toMatch(/ok:\s*true/)
    expect(routeSrc.chat).toMatch(/data:\s*payload/)
    expect(routeSrc.chat).toMatch(/return success\(\{ messages:/)
    expect(routeSrc.chat).toMatch(/return success\(\{\s*message:/)
    expect(routeSrc.chat).toMatch(/return success\(\{ success: true \}\)/)
  })

  it('scheduling POST uses canonical success wrapper while preserving alreadyScheduled/suggestions', () => {
    expect(routeSrc.scheduling).toMatch(/function success\(/)
    expect(routeSrc.scheduling).toMatch(/ok:\s*true/)
    expect(routeSrc.scheduling).toMatch(/data:\s*payload/)
    expect(routeSrc.scheduling).toMatch(/alreadyScheduled:\s*true/)
    expect(routeSrc.scheduling).toMatch(/return success\(\{\s*suggestions,/)
  })

  it('chat + scheduling error responses keep legacy error string and add canonical structured error', () => {
    for (const name of ['chat', 'scheduling']) {
      const source = routeSrc[name]
      expect(source).toMatch(/function fail\(/)
      expect(source).toMatch(/ok:\s*false/)
      expect(source).toMatch(/error:\s*message/)
      expect(source).toMatch(/canonical_error:\s*\{/)
      expect(source).toMatch(/code,/)
      expect(source).toMatch(/message,/)
    }
  })

  it('scheduling ownership check remains unchanged', () => {
    expect(routeSrc.scheduling).toMatch(/if \(pov\?\.narocnik_id !== user\.id\)/)
    expect(routeSrc.scheduling).toMatch(/return fail\('Ni dovoljenja\.', 403, 'FORBIDDEN'\)/)
  })
})

describe('Conversation store contract (no persistence logic changes)', () => {
  it('chat still reads/writes agent_conversations', () => {
    expect(routeSrc.chat).toMatch(/from\('agent_conversations'\)/)
    expect(routeSrc.chat).toMatch(/\.upsert\(/)
    expect(routeSrc.chat).toMatch(/\.delete\(/)
  })

  it('chat route does not switch to ai_agent_conversations', () => {
    expect(routeSrc.chat).not.toMatch(/ai_agent_conversations/)
  })

  it('generic agent route keeps ai_agent_conversations persistence', () => {
    expect(routeSrc.genericAgent).toMatch(/from\('ai_agent_conversations'\)/)
    expect(routeSrc.genericAgent).toMatch(/agent_type', agentType/)
  })
})

describe('Generic /api/agent/[agentType] compatibility contract', () => {
  it('GET keeps messages field and adds canonical ok/data', () => {
    expect(routeSrc.genericAgent).toMatch(/return success\(\{ messages: data\?\.messages \?\? \[\] \}\)/)
    expect(routeSrc.genericAgent).toMatch(/ok:\s*true/)
    expect(routeSrc.genericAgent).toMatch(/data:\s*payload/)
  })

  it('POST keeps message field and adds canonical ok/data', () => {
    expect(routeSrc.genericAgent).toMatch(/return success\(\{\s*message: cached,/)
    expect(routeSrc.genericAgent).toMatch(/return success\(\{\s*message: assistantText,/)
    expect(routeSrc.genericAgent).toMatch(/usage:\s*\{ used: usedToday \+ 1, limit:/)
  })

  it('DELETE keeps success field and adds canonical ok/data', () => {
    expect(routeSrc.genericAgent).toMatch(/return success\(\{ success: true \}\)/)
  })

  it('unauthorized and invalid agentType return legacy + canonical error shape', () => {
    expect(routeSrc.genericAgent).toMatch(/if \(!isValidAgentType\(agentType\)\) \{\s*return fail\('Neveljaven tip agenta\.', 400, 'INVALID_AGENT_TYPE'\)/)
    expect(routeSrc.genericAgent).toMatch(/if \(!user\) return fail\('Nepooblaščen dostop\.', 401, 'UNAUTHORIZED'\)/)
    expect(routeSrc.genericAgent).toMatch(/ok:\s*false/)
    expect(routeSrc.genericAgent).toMatch(/error:\s*message/)
    expect(routeSrc.genericAgent).toMatch(/canonical_error:\s*\{/)
  })
})

describe('Phase-1 dual-shape compatibility (offer-comparison/task-description/video-diagnosis)', () => {
  it('success responses include ok=true and data payload while preserving legacy top-level fields', () => {
    for (const name of ['offerComparison', 'taskDescription', 'videoDiagnosis']) {
      const source = routeSrc[name]
      expect(source).toMatch(/function success\(/)
      expect(source).toMatch(/ok:\s*true/)
      expect(source).toMatch(/data:\s*payload/)
      expect(source).toMatch(/\.\.\.payload/)
    }
  })

  it('error responses include ok=false and canonical_error while preserving legacy error string', () => {
    for (const name of ['offerComparison', 'taskDescription', 'videoDiagnosis']) {
      const source = routeSrc[name]
      expect(source).toMatch(/function fail\(/)
      expect(source).toMatch(/ok:\s*false/)
      expect(source).toMatch(/error:\s*message/)
      expect(source).toMatch(/canonical_error:\s*\{/)
      expect(source).toMatch(/code,/)
      expect(source).toMatch(/message,/)
    }
  })

  it('auth/tier/business logic constraints remain: auth checks kept, no new tier checks introduced', () => {
    expect(routeSrc.offerComparison).toMatch(/if \(!user\)/)
    expect(routeSrc.taskDescription).toMatch(/if \(!user\)/)
    expect(routeSrc.videoDiagnosis).toMatch(/if \(!user\)/)

    expect(routeSrc.offerComparison).toMatch(/if \(!povprasevanje \|\| povprasevanje\.narocnik_id !== user\.id\)/)
    expect(routeSrc.offerComparison).toMatch(/ponudbe\.length < 2/)

    expect(routeSrc.offerComparison).not.toMatch(/isAgentAccessible/)
    expect(routeSrc.taskDescription).not.toMatch(/isAgentAccessible/)
    expect(routeSrc.videoDiagnosis).not.toMatch(/isAgentAccessible/)
  })

  it('usage/cost side-effects were not added to these three routes during shape migration', () => {
    for (const name of ['offerComparison', 'taskDescription', 'videoDiagnosis']) {
      const source = routeSrc[name]
      expect(source).not.toMatch(/ai_usage_logs/)
      expect(source).not.toMatch(/upsert_agent_cost_summary/)
      expect(source).not.toMatch(/estimateCost\(/)
    }
  })
})

describe('Usage logging / cost tracking side-effect contract', () => {
  it('chat keeps ai usage log + cost estimation side-effects', () => {
    expect(routeSrc.chat).toMatch(/from\('ai_usage_logs'\)\.insert\(/)
    expect(routeSrc.chat).toMatch(/ai_total_tokens_used/)
    expect(routeSrc.chat).toMatch(/estimateCost\(/)
  })

  it('generic agent route keeps ai usage log + cost estimation side-effects', () => {
    expect(routeSrc.genericAgent).toMatch(/from\('ai_usage_logs'\)\.insert\(/)
    expect(routeSrc.genericAgent).toMatch(/estimateCost\(/)
  })

  it('materials / job-summary / quote-generator keep cost summary + usage log side-effects', () => {
    expect(routeSrc.materials).toMatch(/upsert_agent_cost_summary/)
    expect(routeSrc.materials).toMatch(/from\('ai_usage_logs'\)\.insert\(/)

    expect(routeSrc.jobSummary).toMatch(/upsert_agent_cost_summary/)
    expect(routeSrc.jobSummary).toMatch(/from\('ai_usage_logs'\)\.insert\(/)

    expect(routeSrc.quoteGenerator).toMatch(/upsert_agent_cost_summary/)
    expect(routeSrc.quoteGenerator).toMatch(/from\('ai_usage_logs'\)\.insert\(/)
  })
})
