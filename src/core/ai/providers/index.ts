import type { AIProvider } from '../interfaces'

export class DeterministicAIProvider implements AIProvider {
  readonly kind = 'deterministic' as const
  async generate<TInput, TOutput>(_operation: string, _input: TInput, local: () => TOutput) { return local() }
}

export class RemoteAIProvider implements AIProvider {
  readonly kind = 'remote' as const
  private readonly endpoint: string
  private readonly token?: () => Promise<string | undefined>
  constructor(endpoint = '/api/planner', token?: () => Promise<string | undefined>) { this.endpoint = endpoint; this.token = token }
  async generate<TInput, TOutput>(operation: string, input: TInput, local: () => TOutput): Promise<TOutput> {
    void local
    const controller = new AbortController(), timer = window.setTimeout(() => controller.abort(), 12_000)
    try {
      const token = await this.token?.()
      const response = await fetch(this.endpoint, { method: 'POST', headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify({ action: operation, payload: input }), signal: controller.signal })
      if (!response.ok) throw new Error(`RemoteAIProvider ${response.status}`)
      return await response.json() as TOutput
    } finally { window.clearTimeout(timer) }
  }
}

export class FallbackProvider implements AIProvider {
  readonly kind = 'fallback' as const
  private readonly primary: AIProvider
  private readonly fallback: AIProvider
  constructor(primary: AIProvider, fallback: AIProvider = new DeterministicAIProvider()) { this.primary = primary; this.fallback = fallback }
  async generate<TInput, TOutput>(operation: string, input: TInput, local: () => TOutput) {
    try { return await this.primary.generate<TInput, TOutput>(operation, input, local) }
    catch { return this.fallback.generate<TInput, TOutput>(operation, input, local) }
  }
}
