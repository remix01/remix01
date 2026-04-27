'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  LogOut,
  BarChart3,
  TrendingUp,
  Zap,
  X,
  Bot,
  Send,
  MessageSquare,
  Sparkles,
  RefreshCw,
  type LucideIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { getPartnerDesktopNav } from '@/components/partner/nav-config'

interface PartnerSidebarProps {
  partner: {
    business_name: string
    subscription_tier: 'start' | 'pro' | 'elite' | null
    avg_rating: number
    is_verified: boolean
  }
}

interface PartnerAiAction {
  id: 'daily-plan' | 'follow-up' | 'pipeline-summary'
  label: string
  prompt: string
  agentType: 'general_chat' | 'offer_writing' | 'job_summary'
}

export function PartnerSidebar({ partner }: PartnerSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [isLoading, setIsLoading] = useState(false)
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState(false)
  const [prompt, setPrompt] = useState('')
  const [aiResponse, setAiResponse] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  const navItems = useMemo(() => getPartnerDesktopNav(partner.subscription_tier ?? 'start'), [partner.subscription_tier])

  const quickAiLinks: Array<{ href: string; icon: LucideIcon; label: string }> = [
    { href: '/partner-dashboard/crm', icon: TrendingUp, label: 'CRM orodja' },
    { href: '/partner-dashboard/insights', icon: BarChart3, label: 'Insights' },
    { href: '/partner-dashboard/offers/generate', icon: Zap, label: 'Generator ponudb' },
  ]

  const quickAiActions: PartnerAiAction[] = [
    {
      id: 'daily-plan',
      label: 'Dnevni plan',
      prompt: 'Sestavi dnevni plan prioritet za partner dashboard na podlagi trenutnih odprtih opravil.',
      agentType: 'job_summary',
    },
    {
      id: 'follow-up',
      label: 'Follow-up predlog',
      prompt: 'Pripravi kratek follow-up message za stranke, ki še niso odgovorile na ponudbo.',
      agentType: 'offer_writing',
    },
    {
      id: 'pipeline-summary',
      label: 'Povzetek pipeline',
      prompt: 'Naredi povzetek pipeline stanja in naslednji najboljši korak za zapiranje novih poslov.',
      agentType: 'general_chat',
    },
  ]

  const isActive = (href: string) => pathname === href || pathname?.startsWith(href + '/')

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      const [logoutResponse, signOutResult] = await Promise.allSettled([
        fetch('/api/auth/logout', { method: 'POST' }),
        supabase.auth.signOut(),
      ])

      if (logoutResponse.status === 'rejected') {
        console.error('Logout API error:', logoutResponse.reason)
      }

      if (signOutResult.status === 'fulfilled' && signOutResult.value.error) {
        console.error('Logout client error:', signOutResult.value.error)
      }

      if (signOutResult.status === 'rejected') {
        console.error('Logout client error:', signOutResult.reason)
      }
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsAiSidebarOpen(false)
      setIsLoading(false)
      router.replace('/partner-auth/login')
      router.refresh()
    }
  }

  const handleAiSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (!prompt.trim()) return

    setAiLoading(true)
    setAiResponse('')

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setAiResponse('Seja je potekla. Osvežite stran in se ponovno prijavite.')
        return
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: `Partner support request: ${prompt}`,
          agentType: 'general_chat',
          useTools: true,
          additionalContext: 'Source: partner-dashboard-sidebar',
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        setAiResponse(errorData?.message || 'AI storitev je trenutno nedosegljiva. Poskusite znova.')
        return
      }

      const data = await response.json()
      setAiResponse(data?.response || data?.message || 'AI trenutno ni vrnil odgovora.')
    } catch (error) {
      console.error('AI sidebar chat error', error)
      setAiResponse('Napaka pri komunikaciji z AI pomočnikom. Poskusite znova.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAiAction = async (action: PartnerAiAction) => {
    setPrompt(action.prompt)
    setAiResponse('')
    setAiLoading(true)

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.access_token) {
        setAiResponse('Seja je potekla. Osvežite stran in se ponovno prijavite.')
        return
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          message: action.prompt,
          agentType: action.agentType,
          useTools: true,
          additionalContext: `Action: ${action.id}; Source: partner-dashboard-ai-sidebar`,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => null)
        setAiResponse(errorData?.message || 'AI storitev je trenutno nedosegljiva. Poskusite znova.')
        return
      }

      const data = await response.json()
      setAiResponse(data?.response || 'AI trenutno ni vrnil odgovora.')
    } catch (error) {
      console.error('AI quick action error', error)
      setAiResponse('Napaka pri AI hitri akciji. Poskusite znova.')
    } finally {
      setAiLoading(false)
    }
  }

  const NavList = () => (
    <nav className="mb-8 flex-1 space-y-2">
      {navItems.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            isActive(item.href) ? 'bg-primary text-primary-foreground' : 'text-foreground hover:bg-background'
          }`}
        >
          <item.icon className="h-4 w-4" />
          {item.label}
        </Link>
      ))}
    </nav>
  )

  return (
    <>
      <div className="sticky top-0 z-30 border-b bg-background/95 px-3 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 lg:hidden">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Link href="/partner-dashboard" className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
                <span className="text-sm font-bold text-primary-foreground">L</span>
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{partner.business_name || 'Moj portal'}</p>
                <p className="hidden text-xs text-muted-foreground sm:block">{(partner.subscription_tier ?? 'start').toUpperCase()}</p>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setIsAiSidebarOpen((prev) => !prev)}
              aria-label="Odpri AI pomočnika"
            >
              <Bot className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={handleLogout}
              disabled={isLoading}
              className="h-9 gap-2 px-2 text-destructive sm:px-3"
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{isLoading ? 'Odjavljam...' : 'Odjava'}</span>
            </Button>
          </div>
        </div>
      </div>

      <aside className="hidden w-64 border-r bg-muted/50 p-6 lg:flex lg:flex-col">
        <div className="mb-8">
          <Link href="/partner-dashboard" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">L</span>
            </div>
            <span className="font-display text-xl font-bold text-foreground">LiftGO</span>
          </Link>
        </div>

        <div className="mb-8 rounded-lg border bg-background p-4">
          <p className="text-sm font-semibold text-foreground">{partner.business_name}</p>
          <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
            {partner.is_verified && '✓'} {partner.avg_rating.toFixed(1)} ⭐
          </p>
          <p className="mt-2 text-xs font-medium text-primary">{(partner.subscription_tier ?? 'start').toUpperCase()} plan</p>
        </div>

        <NavList />

        <div className="border-t pt-6">
          <div className="mb-4 rounded-lg bg-background p-4">
            <p className="text-xs font-semibold text-muted-foreground">PODJETJE</p>
            <p className="font-semibold text-foreground">{partner.business_name}</p>
            <p className="text-xs text-muted-foreground">{partner.avg_rating.toFixed(1)} ⭐</p>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoading}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50"
          >
            <LogOut className="h-4 w-4" />
            {isLoading ? 'Odjavljam...' : 'Odjava'}
          </button>
        </div>
      </aside>

      <button
        type="button"
        onClick={() => setIsAiSidebarOpen((prev) => !prev)}
        className="fixed bottom-24 right-3 z-50 hidden h-10 w-10 items-center justify-center rounded-full border bg-background shadow-md lg:flex"
        aria-label="Odpri ali zapri AI sidebar"
      >
        {isAiSidebarOpen ? <X className="h-4 w-4" /> : <MessageSquare className="h-4 w-4" />}
      </button>

      {isAiSidebarOpen && (
        <>
          <button
            type="button"
            aria-label="Zapri AI sidebar overlay"
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[1px]"
            onClick={() => setIsAiSidebarOpen(false)}
          />
          <aside className="fixed inset-y-0 right-0 z-50 w-full max-w-sm border-l bg-background shadow-xl">
            <div className="flex h-full flex-col">
            <div className="flex items-center justify-between border-b p-4">
              <div className="flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">AI CRM pomočnik</h3>
              </div>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsAiSidebarOpen(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-4 overflow-y-auto p-4">
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-muted-foreground">HITRA ORODJA</p>
                <div className="mt-2 space-y-2">
                  {quickAiLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsAiSidebarOpen(false)}
                      className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm hover:bg-muted"
                    >
                      <item.icon className="h-4 w-4 text-primary" />
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-xs font-semibold text-muted-foreground">AI AKCIJE</p>
                <div className="mt-2 grid gap-2">
                  {quickAiActions.map((action) => (
                    <Button
                      key={action.id}
                      type="button"
                      variant="outline"
                      className="w-full justify-start gap-2"
                      onClick={() => handleAiAction(action)}
                      disabled={aiLoading}
                    >
                      <Sparkles className="h-4 w-4 text-primary" />
                      {action.label}
                    </Button>
                  ))}
                </div>
              </div>

              <form onSubmit={handleAiSubmit} className="space-y-2">
                <label className="text-sm font-medium" htmlFor="ai-sidebar-prompt">
                  Vprašajte AI (CRM, ponudbe, komunikacija)
                </label>
                <textarea
                  id="ai-sidebar-prompt"
                  value={prompt}
                  onChange={(event) => setPrompt(event.target.value)}
                  placeholder="Npr. pripravi odgovor za stranko ali predlagaj naslednji CRM korak"
                  className="min-h-28 w-full rounded-md border p-2 text-sm"
                />
                <Button type="submit" disabled={aiLoading || !prompt.trim()} className="w-full gap-2">
                  {aiLoading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  {aiLoading ? 'AI razmišlja...' : 'Pošlji AI pomočniku'}
                </Button>
              </form>

              {aiResponse && (
                <div className="rounded-lg border bg-muted/20 p-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">AI ODGOVOR</p>
                  <p className="whitespace-pre-wrap text-sm">{aiResponse}</p>
                </div>
              )}
            </div>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
