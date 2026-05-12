'use client'

import { FormEvent, useMemo, useState } from 'react'
import { useChat } from 'ai/react'
import Prism from 'prismjs'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-javascript'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

type SandboxTemplate = 'python' | 'nodejs'
type ModelOption = 'gpt-4o' | 'claude-3.5-sonnet'

function extractCode(content: string) {
  const match = content.match(/```(?:\w+)?\n([\s\S]*?)```/)
  return match?.[1]?.trim() ?? ''
}

export function SandboxModule() {
  const [template, setTemplate] = useState<SandboxTemplate>('python')
  const [model, setModel] = useState<ModelOption>('gpt-4o')
  const [sandboxId, setSandboxId] = useState<string | null>(null)
  const [stdout, setStdout] = useState('')
  const [stderr, setStderr] = useState('')
  const [running, setRunning] = useState(false)

  const { messages, input, setInput, handleInputChange, append, isLoading } = useChat({ api: '/api/sandbox/chat' })

  const onChatSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const value = input.trim()
    if (!value) return

    await append({ role: 'user', content: value }, { body: { model } })
    setInput('')
  }

  const latestCode = useMemo(() => {
    const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant')
    return lastAssistant ? extractCode(lastAssistant.content) : ''
  }, [messages])

  const highlightedCode = useMemo(() => {
    if (!latestCode) return ''
    const grammar = template === 'python' ? Prism.languages.python : Prism.languages.javascript
    return Prism.highlight(latestCode, grammar, template === 'python' ? 'python' : 'javascript')
  }, [latestCode, template])

  const runCode = async () => {
    if (!latestCode) return
    setRunning(true)
    setStdout('')
    setStderr('')

    try {
      const res = await fetch('/api/sandbox/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: latestCode, language: template, sandboxId }),
      })

      const payload = await res.json()
      if (payload.sandboxId) {
        setSandboxId(payload.sandboxId)
      }
      setStdout(payload.stdout ?? '')
      setStderr(payload.stderr ?? payload.error ?? '')
    } catch (error) {
      setStderr(error instanceof Error ? error.message : 'Napaka pri izvajanju kode.')
    } finally {
      setRunning(false)
    }
  }

  const onTemplateChange = (next: SandboxTemplate) => {
    setTemplate(next)
    setSandboxId(null)
    setStdout('')
    setStderr('')
  }

  return (
    <div className="grid h-[calc(100vh-6rem)] grid-cols-1 gap-4 p-4 lg:grid-cols-2">
      <Card className="flex min-h-0 flex-col">
        <CardHeader>
          <CardTitle>LiftGO AI Sandbox · Klepet</CardTitle>
          <div className="flex gap-2">
            <Select value={template} onValueChange={(v) => onTemplateChange(v as SandboxTemplate)}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Predloga" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="python">Python</SelectItem>
                <SelectItem value="nodejs">JavaScript / Node.js</SelectItem>
              </SelectContent>
            </Select>
            <Select value={model} onValueChange={(v) => setModel(v as ModelOption)}>
              <SelectTrigger className="w-[220px]"><SelectValue placeholder="Model" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="gpt-4o">gpt-4o</SelectItem>
                <SelectItem value="claude-3.5-sonnet">claude-3.5-sonnet</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col gap-3">
          <ScrollArea className="flex-1 rounded-md border p-3">
            <div className="space-y-3">
              {messages.map((m) => (
                <div key={m.id} className="rounded-md border p-2 text-sm">
                  <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">{m.role}</p>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                </div>
              ))}
            </div>
          </ScrollArea>
          <form onSubmit={onChatSubmit} className="flex gap-2">
            <Input value={input} onChange={handleInputChange} placeholder="Npr. Ustvari Python skripto za obdelavo CSV." />
            <Button type="submit" disabled={isLoading}>Pošlji</Button>
          </form>
        </CardContent>
      </Card>

      <Card className="flex min-h-0 flex-col">
        <CardHeader><CardTitle>Artifacts</CardTitle></CardHeader>
        <CardContent className="min-h-0 flex-1">
          <Tabs defaultValue="code" className="flex h-full flex-col">
            <TabsList><TabsTrigger value="code">Koda</TabsTrigger><TabsTrigger value="output">Izhod</TabsTrigger></TabsList>
            <TabsContent value="code" className="mt-3 flex-1">
              <ScrollArea className="h-[55vh] rounded-md border bg-slate-950 p-3 text-slate-50">
                <pre><code dangerouslySetInnerHTML={{ __html: highlightedCode || '/* Tukaj se bo prikazala generirana koda */' }} /></pre>
              </ScrollArea>
              <div className="mt-3 flex gap-2">
                <Dialog>
                  <DialogTrigger asChild><Button disabled={!latestCode || running}>{running ? 'Poganjam…' : 'Zaženi'}</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Potrditev izvajanja kode</DialogTitle><DialogDescription>Preveri povzetek in potrdi izvajanje kode v E2B sandboxu.</DialogDescription></DialogHeader>
                    <ScrollArea className="max-h-64 rounded-md border p-2 text-xs"><pre className="whitespace-pre-wrap">{latestCode}</pre></ScrollArea>
                    <DialogFooter><Button onClick={runCode}>Potrdi in zaženi</Button></DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="secondary" onClick={() => {
                  // TODO: Integriraj pravi upload v MinIO bucket `liftgo-sandbox` z @aws-sdk/client-s3.
                  // Primer: new S3Client({ endpoint, region, credentials }) + PutObjectCommand.
                  alert('Ogrodje pripravljeno: tukaj priklopite MinIO upload.')
                }} disabled={!latestCode}>Shrani kodo v projekt</Button>
              </div>
            </TabsContent>
            <TabsContent value="output" className="mt-3 space-y-2">
              <div className="rounded-md border p-3"><p className="mb-1 text-xs font-semibold uppercase">stdout</p><pre className="whitespace-pre-wrap text-sm">{stdout || '—'}</pre></div>
              <div className="rounded-md border p-3"><p className="mb-1 text-xs font-semibold uppercase text-destructive">stderr</p><pre className="whitespace-pre-wrap text-sm">{stderr || '—'}</pre></div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
