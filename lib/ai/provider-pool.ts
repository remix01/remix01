import Anthropic from '@anthropic-ai/sdk'

let _instance: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (_instance) return _instance

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error(
      '[provider-pool] ANTHROPIC_API_KEY is not set. ' +
      'Set it in your environment before calling any AI endpoint.'
    )
  }

  _instance = new Anthropic({ apiKey })
  return _instance
}
