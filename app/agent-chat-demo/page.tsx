'use client'

import React, { useState } from 'react'
import { AgentChatDialog } from '@/components/agent/AgentChatDialog'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { FileText, BarChart3, PenTool, TrendingUp } from 'lucide-react'

export default function AgentChatDemoPage() {
  const [openAgent, setOpenAgent] = useState<string | null>(null)

  const agents = [
    {
      type: 'work_description',
      title: 'Pomoč pri opisu dela',
      description: 'Strukturiran opis za boljše ponudbe',
      icon: <FileText className="w-5 h-5" />,
      contextCard: {
        type: 'inquiry' as const,
        title: 'Popravilo curka v kopalnici',
        location: 'Ljubljana',
        urgency: 'Ta teden',
        budget: '150-200€',
      },
    },
    {
      type: 'offer_comparison',
      title: 'Primerjava ponudb',
      description: 'Primerjaj prejete ponudbe',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      type: 'offer_writing',
      title: 'Pisanje ponudb',
      description: 'Profesionalne ponudbe v minutah',
      icon: <PenTool className="w-5 h-5" />,
      contextCard: {
        type: 'inquiry' as const,
        title: 'Popravilo instalacij centralnega ogrevanja',
        location: 'Maribor',
        urgency: 'Nujno',
        budget: '500-800€',
      },
    },
    {
      type: 'profile_optimization',
      title: 'Optimizacija profila',
      description: 'Izboljšaj svoj profil za več posla',
      icon: <TrendingUp className="w-5 h-5" />,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-12 text-center">
          <h1 className="mb-2 text-4xl font-bold text-slate-900">
            Agent Chat Dialog Demo
          </h1>
          <p className="text-lg text-slate-600">
            Preizkusite različne agente in njihove zmogljivosti
          </p>
        </div>

        {/* Agent Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {agents.map((agent) => (
            <Card
              key={agent.type}
              className="flex flex-col p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100 text-blue-600">
                  {agent.icon}
                </div>
              </div>

              <h3 className="mb-2 text-xl font-semibold text-slate-900">
                {agent.title}
              </h3>
              <p className="mb-6 flex-grow text-slate-600">
                {agent.description}
              </p>

              <Button
                onClick={() => setOpenAgent(agent.type)}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Odpri Agent
              </Button>
            </Card>
          ))}
        </div>

        {/* Information Section */}
        <Card className="p-8 bg-blue-50 border-blue-200">
          <h2 className="mb-4 text-xl font-semibold text-slate-900">
            Funkcionalnosti Agent Chat Dialog
          </h2>
          <ul className="space-y-3 text-slate-700">
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Realno-časni pogovori z AI agenti</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Prikazovanje kontekstnih kartice s povpraševanjem ali ponudbo</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Minimiziranje okna v vogel zaslona</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Avtomatski pomik na dno pri novih sporočilih</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Animirane indikatorje pisanja</span>
            </li>
            <li className="flex items-start gap-3">
              <span className="text-blue-600 font-bold">✓</span>
              <span>Avtomatsko prilagajanje velikosti tekstovnega polja</span>
            </li>
          </ul>
        </Card>
      </div>

      {/* Agent Chat Dialogs */}
      {openAgent === 'work_description' && (
        <AgentChatDialog
          agentType="work_description"
          agentTitle="Pomoč pri opisu dela"
          agentIcon={<FileText className="w-5 h-5" />}
          contextCard={{
            type: 'inquiry',
            title: 'Popravilo curka v kopalnici',
            location: 'Ljubljana',
            urgency: 'Ta teden',
            budget: '150-200€',
          }}
          onClose={() => setOpenAgent(null)}
        />
      )}

      {openAgent === 'offer_comparison' && (
        <AgentChatDialog
          agentType="offer_comparison"
          agentTitle="Primerjava ponudb"
          agentIcon={<BarChart3 className="w-5 h-5" />}
          onClose={() => setOpenAgent(null)}
        />
      )}

      {openAgent === 'offer_writing' && (
        <AgentChatDialog
          agentType="offer_writing"
          agentTitle="Pisanje ponudb"
          agentIcon={<PenTool className="w-5 h-5" />}
          contextCard={{
            type: 'inquiry',
            title: 'Popravilo instalacij centralnega ogrevanja',
            location: 'Maribor',
            urgency: 'Nujno',
            budget: '500-800€',
          }}
          onClose={() => setOpenAgent(null)}
        />
      )}

      {openAgent === 'profile_optimization' && (
        <AgentChatDialog
          agentType="profile_optimization"
          agentTitle="Optimizacija profila"
          agentIcon={<TrendingUp className="w-5 h-5" />}
          onClose={() => setOpenAgent(null)}
        />
      )}
    </div>
  )
}
