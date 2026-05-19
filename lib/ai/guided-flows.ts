/**
 * Guided Conversation Flows for LiftGO AI Concierge
 *
 * Step-by-step interactive flows that collect structured input from the user
 * before submitting to the appropriate agent endpoint. Each flow has a series
 * of steps with questions, input types, and validation rules.
 */

// ═══════════════════════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════════════════════

export type FlowInputType = 'text' | 'select' | 'multiselect' | 'image' | 'number'

export interface FlowOption {
  value: string
  label: string
  labelEn?: string
}

export interface FlowStep {
  id: string
  question: string
  questionEn?: string
  inputType: FlowInputType
  options?: FlowOption[]
  placeholder?: string
  placeholderEn?: string
  required?: boolean
  validation?: {
    minLength?: number
    maxLength?: number
    min?: number
    max?: number
  }
}

export interface GuidedFlow {
  id: string
  name: string
  nameEn?: string
  description: string
  descriptionEn?: string
  triggerKeywords: string[]
  steps: FlowStep[]
  submitEndpoint: string
  buildPayload: (answers: Record<string, string | string[]>) => Record<string, unknown>
}

export interface FlowState {
  flowId: string
  currentStepIndex: number
  answers: Record<string, string | string[]>
  completed: boolean
}

// ═══════════════════════════════════════════════════════════════════════════
// Flow Definitions
// ═══════════════════════════════════════════════════════════════════════════

export const GUIDED_FLOWS: GuidedFlow[] = [
  {
    id: 'device_diagnosis',
    name: 'Diagnoza napake',
    nameEn: 'Problem Diagnosis',
    description: 'Korak za korakom opišite težavo za natančnejšo diagnozo.',
    descriptionEn: 'Step by step describe your problem for a more accurate diagnosis.',
    triggerKeywords: ['diagnoza', 'napaka', 'napako', 'pokvarjen', 'ne deluje', 'diagnosis', 'broken', 'not working'],
    steps: [
      {
        id: 'category',
        question: 'Katera kategorija najbolje opisuje vašo težavo?',
        questionEn: 'Which category best describes your problem?',
        inputType: 'select',
        required: true,
        options: [
          { value: 'vodovod', label: 'Vodovod', labelEn: 'Plumbing' },
          { value: 'elektrika', label: 'Elektrika', labelEn: 'Electrical' },
          { value: 'ogrevanje', label: 'Ogrevanje / HVAC', labelEn: 'Heating / HVAC' },
          { value: 'streha', label: 'Streha / fasada', labelEn: 'Roof / facade' },
          { value: 'notranjost', label: 'Notranjost (pleskanje, tlaki...)', labelEn: 'Interior (painting, floors...)' },
          { value: 'drugo', label: 'Drugo', labelEn: 'Other' },
        ],
      },
      {
        id: 'description',
        question: 'Opišite težavo čim bolj natančno.',
        questionEn: 'Describe the problem as accurately as possible.',
        inputType: 'text',
        placeholder: 'npr. Iz pipe pod umivalnikom kaplja voda, ko odpirem tuš...',
        placeholderEn: 'e.g. Water drips from the pipe under the sink when I turn on the shower...',
        required: true,
        validation: { minLength: 20, maxLength: 1000 },
      },
      {
        id: 'urgency',
        question: 'Kako nujno je popravilo?',
        questionEn: 'How urgent is the repair?',
        inputType: 'select',
        required: true,
        options: [
          { value: 'normalno', label: 'Ni nujno — v naslednjem tednu', labelEn: 'Not urgent — within a week' },
          { value: 'kmalu', label: 'Kmalu — v 2-3 dneh', labelEn: 'Soon — within 2-3 days' },
          { value: 'nujno', label: 'Nujno — danes/jutri', labelEn: 'Urgent — today/tomorrow' },
        ],
      },
      {
        id: 'photo',
        question: 'Imate fotografijo problema? (neobvezno)',
        questionEn: 'Do you have a photo of the problem? (optional)',
        inputType: 'image',
        required: false,
      },
    ],
    submitEndpoint: '/api/ai/concierge',
    buildPayload: (answers) => ({
      message: `Kategorija: ${answers.category}\nOpis: ${answers.description}\nNujnost: ${answers.urgency}`,
      context: {
        guided_flow: 'device_diagnosis',
        category: answers.category,
        urgency: answers.urgency,
      },
      imageUrl: answers.photo || undefined,
    }),
  },
  {
    id: 'new_inquiry',
    name: 'Novo povpraševanje',
    nameEn: 'New Service Request',
    description: 'Pomagamo vam sestaviti povpraševanje za mojstre.',
    descriptionEn: 'We help you create a service request for craftsmen.',
    triggerKeywords: ['povpraševanje', 'novo', 'iščem mojstra', 'potrebujem', 'request', 'looking for', 'need'],
    steps: [
      {
        id: 'service_type',
        question: 'Kakšno storitev potrebujete?',
        questionEn: 'What kind of service do you need?',
        inputType: 'text',
        placeholder: 'npr. Zamenjava bojlerja, pleskanje sobe, montaža klime...',
        placeholderEn: 'e.g. Boiler replacement, room painting, AC installation...',
        required: true,
        validation: { minLength: 5, maxLength: 200 },
      },
      {
        id: 'location',
        question: 'Kje se nahaja objekt?',
        questionEn: 'Where is the property located?',
        inputType: 'text',
        placeholder: 'npr. Ljubljana, Maribor, Koper...',
        placeholderEn: 'e.g. Ljubljana, Maribor, Koper...',
        required: true,
        validation: { minLength: 2, maxLength: 100 },
      },
      {
        id: 'budget',
        question: 'Kakšen je vaš okvirni proračun (EUR)?',
        questionEn: 'What is your approximate budget (EUR)?',
        inputType: 'select',
        required: false,
        options: [
          { value: 'do_200', label: 'Do 200 €', labelEn: 'Up to €200' },
          { value: '200_500', label: '200 – 500 €', labelEn: '€200 – €500' },
          { value: '500_1000', label: '500 – 1.000 €', labelEn: '€500 – €1,000' },
          { value: '1000_5000', label: '1.000 – 5.000 €', labelEn: '€1,000 – €5,000' },
          { value: 'nad_5000', label: 'Nad 5.000 €', labelEn: 'Over €5,000' },
          { value: 'ne_vem', label: 'Ne vem', labelEn: "I don't know" },
        ],
      },
      {
        id: 'details',
        question: 'Še kakšne podrobnosti? (neobvezno)',
        questionEn: 'Any additional details? (optional)',
        inputType: 'text',
        placeholder: 'npr. Dostop do objekta, posebne zahteve...',
        placeholderEn: 'e.g. Property access, special requirements...',
        required: false,
        validation: { maxLength: 500 },
      },
    ],
    submitEndpoint: '/api/ai/parse-inquiry',
    buildPayload: (answers) => ({
      message: [
        `Storitev: ${answers.service_type}`,
        `Lokacija: ${answers.location}`,
        answers.budget ? `Proračun: ${answers.budget}` : null,
        answers.details ? `Podrobnosti: ${answers.details}` : null,
      ].filter(Boolean).join('\n'),
    }),
  },
  {
    id: 'get_quote',
    name: 'Pridobi ponudbo',
    nameEn: 'Get a Quote',
    description: 'Zberite informacije za hitro ponudbo od mojstrov.',
    descriptionEn: 'Collect information for a quick quote from craftsmen.',
    triggerKeywords: ['ponudba', 'koliko stane', 'cena', 'quote', 'how much', 'price'],
    steps: [
      {
        id: 'work_type',
        question: 'Kakšno delo potrebujete?',
        questionEn: 'What kind of work do you need?',
        inputType: 'text',
        placeholder: 'Opišite delo čim bolj natančno...',
        placeholderEn: 'Describe the work as accurately as possible...',
        required: true,
        validation: { minLength: 10, maxLength: 500 },
      },
      {
        id: 'scope',
        question: 'Kakšen je obseg dela?',
        questionEn: 'What is the scope of work?',
        inputType: 'select',
        required: true,
        options: [
          { value: 'malo', label: 'Manjše popravilo (1-2 uri)', labelEn: 'Small repair (1-2 hours)' },
          { value: 'srednje', label: 'Srednje delo (pol dneva)', labelEn: 'Medium work (half day)' },
          { value: 'veliko', label: 'Večje delo (1+ dni)', labelEn: 'Major work (1+ days)' },
          { value: 'projekt', label: 'Celoten projekt', labelEn: 'Full project' },
        ],
      },
      {
        id: 'timeline',
        question: 'Kdaj bi radi, da se delo izvede?',
        questionEn: 'When would you like the work done?',
        inputType: 'select',
        required: true,
        options: [
          { value: 'takoj', label: 'Čim prej', labelEn: 'As soon as possible' },
          { value: 'teden', label: 'V naslednjem tednu', labelEn: 'Within a week' },
          { value: 'mesec', label: 'V naslednjem mesecu', labelEn: 'Within a month' },
          { value: 'fleksibilno', label: 'Fleksibilno', labelEn: 'Flexible' },
        ],
      },
    ],
    submitEndpoint: '/api/ai/concierge',
    buildPayload: (answers) => ({
      message: `Želim ponudbo za: ${answers.work_type}\nObseg: ${answers.scope}\nČasovnica: ${answers.timeline}`,
      context: { guided_flow: 'get_quote' },
    }),
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// Flow Engine
// ═══════════════════════════════════════════════════════════════════════════

export function detectFlow(userMessage: string): GuidedFlow | null {
  const lower = userMessage.toLowerCase()
  for (const flow of GUIDED_FLOWS) {
    const matchCount = flow.triggerKeywords.filter(kw => lower.includes(kw)).length
    if (matchCount >= 1) return flow
  }
  return null
}

export function createFlowState(flowId: string): FlowState {
  return {
    flowId,
    currentStepIndex: 0,
    answers: {},
    completed: false,
  }
}

export function getCurrentStep(flow: GuidedFlow, state: FlowState): FlowStep | null {
  if (state.currentStepIndex >= flow.steps.length) return null
  return flow.steps[state.currentStepIndex]!
}

export function validateStepAnswer(step: FlowStep, answer: string | string[]): string | null {
  if (step.required && (!answer || (Array.isArray(answer) && answer.length === 0))) {
    return 'To polje je obvezno.'
  }

  if (typeof answer === 'string' && step.validation) {
    if (step.validation.minLength && answer.length < step.validation.minLength) {
      return `Najmanj ${step.validation.minLength} znakov.`
    }
    if (step.validation.maxLength && answer.length > step.validation.maxLength) {
      return `Največ ${step.validation.maxLength} znakov.`
    }
  }

  return null
}

export function advanceFlow(flow: GuidedFlow, state: FlowState, stepId: string, answer: string | string[]): FlowState {
  const newAnswers = { ...state.answers, [stepId]: answer }
  const nextIndex = state.currentStepIndex + 1
  return {
    ...state,
    answers: newAnswers,
    currentStepIndex: nextIndex,
    completed: nextIndex >= flow.steps.length,
  }
}

export function getFlowById(flowId: string): GuidedFlow | null {
  return GUIDED_FLOWS.find(f => f.id === flowId) ?? null
}
