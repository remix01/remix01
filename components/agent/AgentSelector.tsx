'use client'

import React, { useState } from 'react'
import { FileText, BarChart3, PenTool, TrendingUp, Lock, ArrowRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

export type AgentType =
  | 'work_description'
  | 'offer_comparison'
  | 'offer_writing'
  | 'profile_optimization'

export type UserRole = 'narocnik' | 'obrtnik'
export type SubscriptionTier = 'start' | 'pro'

export interface AgentCardProps {
  agentType: AgentType
  title: string
  description: string
  icon: React.ReactNode
  locked: boolean
  tier: SubscriptionTier
  onClick: () => void
}

interface AgentSelectorProps {
  userRole: UserRole
  subscriptionTier: SubscriptionTier
  onSelectAgent: (agentType: AgentType) => void
  onUpgradeClick?: () => void
}

interface Agent {
  type: AgentType
  title: string
  description: string
  icon: React.ReactNode
  tier: SubscriptionTier
  roles: UserRole[]
}

// Define all available agents
const AVAILABLE_AGENTS: Agent[] = [
  // Customer agents
  {
    type: 'work_description',
    title: 'Pomoč pri opisu dela',
    description: 'Strukturiran opis za boljše ponudbe',
    icon: <FileText className="w-6 h-6" />,
    tier: 'start',
    roles: ['narocnik'],
  },
  {
    type: 'offer_comparison',
    title: 'Primerjava ponudb',
    description: 'Primerjaj prejete ponudbe',
    icon: <BarChart3 className="w-6 h-6" />,
    tier: 'start',
    roles: ['narocnik'],
  },
  // Craftsman agents
  {
    type: 'offer_writing',
    title: 'Pisanje ponudb',
    description: 'Profesionalne ponudbe v minutah',
    icon: <PenTool className="w-6 h-6" />,
    tier: 'pro',
    roles: ['obrtnik'],
  },
  {
    type: 'profile_optimization',
    title: 'Optimizacija profila',
    description: 'Izboljšaj svoj profil za več posla',
    icon: <TrendingUp className="w-6 h-6" />,
    tier: 'pro',
    roles: ['obrtnik'],
  },
]

function AgentCard({
  agentType,
  title,
  description,
  icon,
  locked,
  tier,
  onClick,
}: AgentCardProps) {
  return (
    <Card
      className={`relative p-6 h-full transition-all duration-200 cursor-pointer ${
        locked
          ? 'opacity-50 bg-muted'
          : 'hover:shadow-lg hover:border-blue-500 hover:scale-105'
      } ${!locked ? 'border-slate-200 hover:border-blue-400' : 'border-slate-200'}`}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          onClick()
        }
      }}
      aria-disabled={locked}
    >
      {/* Lock overlay for locked state */}
      {locked && (
        <div className="absolute inset-0 rounded-lg bg-gradient-to-b from-transparent to-slate-900/10" />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-start justify-between mb-4">
          <div
            className={`p-2 rounded-lg transition-colors ${
              locked
                ? 'bg-slate-200'
                : 'bg-blue-100 text-blue-600'
            }`}
          >
            {icon}
          </div>
          {locked && (
            <div className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-semibold">
              <Lock className="w-3 h-3" />
              <span>PRO</span>
            </div>
          )}
        </div>

        <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
        <p className="text-sm text-slate-600 mb-4 flex-grow">{description}</p>

        {locked && (
          <div className="space-y-3">
            <p className="text-xs text-slate-500 font-medium">
              Ta agent zahteva PRO paket
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              Nadgradi na PRO <ArrowRight className="w-3 h-3 ml-1" />
            </Button>
          </div>
        )}
      </div>

      {/* Selection border indicator for unlocked */}
      {!locked && (
        <div className="absolute inset-0 rounded-lg border-2 border-blue-400 opacity-0 group-hover:opacity-100 transition-opacity" />
      )}
    </Card>
  )
}

function UpgradeModal({
  open,
  onOpenChange,
  onUpgrade,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpgrade: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nadgradi na PRO</DialogTitle>
          <DialogDescription>
            Ta funkcionalnost je dostopna samo za PRO naročnike
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-semibold text-blue-900 mb-2">Kaj je vključeno v PRO?</h4>
            <ul className="space-y-2 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Pisanje profesionalnih ponudb</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Optimizacija profila za več posla</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Napredna analitika in statistike</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold mt-0.5">✓</span>
                <span>Prednostna podpora</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="flex-1"
          >
            Prekliči
          </Button>
          <Button
            onClick={() => {
              onUpgrade()
              onOpenChange(false)
            }}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            Pojdi na Cenik
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

export function AgentSelector({
  userRole,
  subscriptionTier,
  onSelectAgent,
  onUpgradeClick,
}: AgentSelectorProps) {
  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [showAgentDialog, setShowAgentDialog] = useState(false)

  // Filter agents for the current user role
  const relevantAgents = AVAILABLE_AGENTS.filter((agent) =>
    agent.roles.includes(userRole)
  )

  const handleAgentClick = (agent: Agent) => {
    const isLocked = agent.tier === 'pro' && subscriptionTier !== 'pro'

    if (isLocked) {
      setShowUpgradeModal(true)
    } else {
      setSelectedAgent(agent.type)
      setShowAgentDialog(true)
    }
  }

  const handleSelectAgent = () => {
    if (selectedAgent) {
      onSelectAgent(selectedAgent)
      setShowAgentDialog(false)
      setSelectedAgent(null)
    }
  }

  return (
    <>
      {/* Agent Grid */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {userRole === 'narocnik'
              ? 'Agenti za naročnike'
              : 'Agenti za obcraftsmenski'}
          </h2>
          <p className="text-slate-600">
            {userRole === 'narocnik'
              ? 'Izberite agent, ki vam bo pomagal pri naročilih'
              : 'Izberite agent, ki bo izbolšal vašo poslovanje'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {relevantAgents.map((agent) => {
            const isLocked =
              agent.tier === 'pro' && subscriptionTier !== 'pro'

            return (
              <AgentCard
                key={agent.type}
                agentType={agent.type}
                title={agent.title}
                description={agent.description}
                icon={agent.icon}
                locked={isLocked}
                tier={agent.tier}
                onClick={() => handleAgentClick(agent)}
              />
            )
          })}
        </div>
      </div>

      {/* Upgrade Modal */}
      <UpgradeModal
        open={showUpgradeModal}
        onOpenChange={setShowUpgradeModal}
        onUpgrade={() => {
          onUpgradeClick?.()
        }}
      />

      {/* Agent Selection Dialog */}
      <Dialog open={showAgentDialog} onOpenChange={setShowAgentDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Potrdi izbiro</DialogTitle>
            <DialogDescription>
              Izbrali ste agenta za pomoč pri vaši nalogi
            </DialogDescription>
          </DialogHeader>

          {selectedAgent && (
            <div className="py-4">
              {(() => {
                const agent = relevantAgents.find(
                  (a) => a.type === selectedAgent
                )
                return (
                  <div className="bg-slate-50 rounded-lg p-4">
                    <div className="flex items-start gap-3 mb-3">
                      <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                        {agent?.icon}
                      </div>
                      <div>
                        <h4 className="font-semibold text-slate-900">
                          {agent?.title}
                        </h4>
                        <p className="text-sm text-slate-600">
                          {agent?.description}
                        </p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">
                      Kliknite naprej, da začnete s to nalogo.
                    </p>
                  </div>
                )
              })()}
            </div>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowAgentDialog(false)}
              className="flex-1"
            >
              Prekliči
            </Button>
            <Button
              onClick={handleSelectAgent}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              Začni
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Export a standalone demo component for testing
export function AgentSelectorDemo() {
  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-7xl mx-auto space-y-12">
        {/* Customer agents demo */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Agent Selector - Naročnik</h1>
          <p className="text-slate-600 mb-6">
            Prikaz agentov za naročnike
          </p>
          <AgentSelector
            userRole="narocnik"
            subscriptionTier="start"
            onSelectAgent={(agent) => {
              console.log('Selected agent:', agent)
              alert(`Izbran agent: ${agent}`)
            }}
            onUpgradeClick={() => {
              window.location.href = '/cenik'
            }}
          />
        </div>

        {/* Divider */}
        <div className="border-t border-slate-300" />

        {/* Craftsman agents demo */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Agent Selector - Obrtnik (PRO)</h1>
          <p className="text-slate-600 mb-6">
            Prikaz agentov za obcraftsmenski s PRO naročnino
          </p>
          <AgentSelector
            userRole="obrtnik"
            subscriptionTier="pro"
            onSelectAgent={(agent) => {
              console.log('Selected agent:', agent)
              alert(`Izbran agent: ${agent}`)
            }}
            onUpgradeClick={() => {
              window.location.href = '/cenik'
            }}
          />
        </div>

        {/* Craftsman locked demo */}
        <div>
          <h1 className="text-3xl font-bold mb-2">Agent Selector - Obrtnik (START)</h1>
          <p className="text-slate-600 mb-6">
            Prikaz agentov za obcraftsmenski z базичnom naročnino
          </p>
          <AgentSelector
            userRole="obrtnik"
            subscriptionTier="start"
            onSelectAgent={(agent) => {
              console.log('Selected agent:', agent)
              alert(`Izbran agent: ${agent}`)
            }}
            onUpgradeClick={() => {
              window.location.href = '/cenik'
            }}
          />
        </div>
      </div>
    </div>
  )
}
