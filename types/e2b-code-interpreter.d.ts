declare module '@e2b/code-interpreter' {
  export class Sandbox {
    static create(options?: { apiKey?: string }): Promise<Sandbox>
    runCode(code: string, options?: { language?: 'python' | 'javascript' }): Promise<{
      text?: string
      logs?: {
        stdout?: string[]
        stderr?: string[]
      }
      error?: { message?: string }
    }>
    kill(): Promise<void>
  }
}
