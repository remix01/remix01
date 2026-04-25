'use client'

import { useState, useTransition } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertTriangle, UserCog, Building2 } from 'lucide-react'

type User = { id: string; email: string; full_name: string | null; created_at: string }

interface Props {
  nullRoleUsers: User[]
  obrtnikiBrezProfila: User[]
  setUserRole: (id: string, role: 'narocnik' | 'obrtnik') => Promise<{ success: boolean; error?: string }>
  createObrtnikProfile: (id: string) => Promise<{ success: boolean; error?: string }>
}

function RoleButtons({
  user,
  setUserRole,
}: {
  user: User
  setUserRole: Props['setUserRole']
}) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const assign = (role: 'narocnik' | 'obrtnik') => {
    startTransition(async () => {
      const res = await setUserRole(user.id, role)
      setResult(res.success ? { ok: true, msg: `Vloga '${role}' nastavljena` } : { ok: false, msg: res.error ?? 'Napaka' })
    })
  }

  if (result?.ok) {
    return (
      <span className="flex items-center gap-1 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" /> {result.msg}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {result && <span className="text-sm text-red-500">{result.msg}</span>}
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => assign('narocnik')}>
        Naročnik
      </Button>
      <Button size="sm" variant="outline" disabled={isPending} onClick={() => assign('obrtnik')}>
        Obrtnik
      </Button>
    </div>
  )
}

function CreateProfileButton({
  user,
  createObrtnikProfile,
}: {
  user: User
  createObrtnikProfile: Props['createObrtnikProfile']
}) {
  const [isPending, startTransition] = useTransition()
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null)

  const create = () => {
    startTransition(async () => {
      const res = await createObrtnikProfile(user.id)
      setResult(res.success ? { ok: true, msg: 'Profil ustvarjen' } : { ok: false, msg: res.error ?? 'Napaka' })
    })
  }

  if (result?.ok) {
    return (
      <span className="flex items-center gap-1 text-sm text-green-600">
        <CheckCircle className="h-4 w-4" /> {result.msg}
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      {result && <span className="text-sm text-red-500">{result.msg}</span>}
      <Button size="sm" disabled={isPending} onClick={create}>
        Ustvari profil
      </Button>
    </div>
  )
}

export function ProblematicniPanel({ nullRoleUsers, obrtnikiBrezProfila, setUserRole, createObrtnikProfile }: Props) {
  const total = nullRoleUsers.length + obrtnikiBrezProfila.length

  if (total === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="flex items-center gap-2 py-4">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span className="text-green-700 font-medium">Ni problematičnih uporabnikov — vse je v redu.</span>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {nullRoleUsers.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCog className="h-5 w-5 text-amber-500" />
              Uporabniki brez vloge
              <Badge variant="secondary">{nullRoleUsers.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {nullRoleUsers.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border bg-background px-4 py-2">
                  <div>
                    <p className="text-sm font-medium">{u.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <RoleButtons user={u} setUserRole={setUserRole} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {obrtnikiBrezProfila.length > 0 && (
        <Card className="border-red-200">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-5 w-5 text-red-500" />
              Obrtniki brez obrtnik_profiles
              <Badge variant="destructive">{obrtnikiBrezProfila.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {obrtnikiBrezProfila.map((u) => (
                <div key={u.id} className="flex items-center justify-between rounded-lg border bg-background px-4 py-2">
                  <div>
                    <p className="text-sm font-medium">{u.full_name || '—'}</p>
                    <p className="text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  <CreateProfileButton user={u} createObrtnikProfile={createObrtnikProfile} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
