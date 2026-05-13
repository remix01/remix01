'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { getActiveCategoriesPublic } from '@/lib/dal/categories'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import * as LucideIcons from 'lucide-react'
import { ChevronLeft, CheckCircle2, Loader2, Mail, MapPin, FileText, User } from 'lucide-react'
import type { Category } from '@/types/marketplace'

const DRAFT_KEY = 'liftgo_draft_v1'

interface Draft {
  categoryId: string | null
  customCategory: string
  city: string
  description: string
  ime: string
  email: string
  telefon: string
}

type Step = 1 | 2 | 3 | 4 | 'done'

function getIcon(name?: string | null): React.ComponentType<{ className?: string }> | null {
  if (!name) return null
  const key = name.charAt(0).toUpperCase() + name.slice(1)
  return (LucideIcons as Record<string, unknown>)[key] as React.ComponentType<{ className?: string }> | null
}

function OddajContent() {
  const searchParams = useSearchParams()
  const supabase = createClient()

  // ── Auth ────────────────────────────────────────────────
  const [isAuth, setIsAuth] = useState(false)
  const [authUser, setAuthUser] = useState<{ id: string; email?: string } | null>(null)
  const [initDone, setInitDone] = useState(false)

  // ── Form ─────────────────────────────────────────────────
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCat, setSelectedCat] = useState<Category | null>(null)
  const [customCat, setCustomCat] = useState('')
  const [city, setCity] = useState('')
  const [description, setDescription] = useState('')
  const [ime, setIme] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')

  // ── UI ───────────────────────────────────────────────────
  const [step, setStep] = useState<Step>(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submittedId, setSubmittedId] = useState<string | null>(null)
  const [magicSent, setMagicSent] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  // ── Init ─────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const [cats, { data: { user } }] = await Promise.all([
        getActiveCategoriesPublic(),
        supabase.auth.getUser(),
      ])

      let profileCity = ''
      let profileName = ''
      let profileEmail = ''

      if (user) {
        setIsAuth(true)
        setAuthUser(user)
        const { data: profile } = await supabase
          .from('profiles')
          .select('location_city, full_name')
          .eq('id', user.id)
          .maybeSingle()
        profileCity = (profile as { location_city?: string } | null)?.location_city ?? ''
        profileName = (profile as { full_name?: string } | null)?.full_name ?? ''
        profileEmail = user.email ?? ''
      }

      // Restore draft — draft takes priority over profile defaults
      let draftCityVal = '', draftImeVal = '', draftEmailVal = '', draftTelefonVal = ''
      let draftDescVal = '', draftCustomCatVal = '', draftCatId: string | null = null
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (raw) {
          const d: Draft = JSON.parse(raw)
          draftCityVal = d.city || ''
          draftImeVal = d.ime || ''
          draftEmailVal = d.email || ''
          draftTelefonVal = d.telefon || ''
          draftDescVal = d.description || ''
          draftCustomCatVal = d.customCategory || ''
          draftCatId = d.categoryId ?? null
        }
      } catch {}

      setCategories(cats)
      setCity(draftCityVal || profileCity)
      setIme(draftImeVal || profileName)
      setEmail(draftEmailVal || profileEmail)
      setTelefon(draftTelefonVal)
      setDescription(draftDescVal)
      setCustomCat(draftCustomCatVal)

      if (draftCatId) {
        const match = cats.find(c => c.id === draftCatId)
        if (match) setSelectedCat(match)
      }

      const param = searchParams?.get('kategorija')
      if (param) {
        const match = cats.find(
          c => c.name.toLowerCase() === param.toLowerCase() || c.slug.toLowerCase() === param.toLowerCase()
        )
        if (match) setSelectedCat(match)
      }

      setInitDone(true)
    }
    void init()
  }, [])

  // ── Autosave ─────────────────────────────────────────────
  useEffect(() => {
    if (!initDone) return
    try {
      const d: Draft = {
        categoryId: selectedCat?.id ?? null,
        customCategory: customCat,
        city,
        description,
        ime,
        email,
        telefon,
      }
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d))
    } catch {}
  }, [initDone, selectedCat, customCat, city, description, ime, email, telefon])

  // ── Derived ───────────────────────────────────────────────
  const totalSteps = isAuth ? 3 : 4
  const currentStepNum = step === 'done' ? totalSteps : (step as number)
  const catName = selectedCat?.name ?? customCat.trim()

  const isStep1Valid = !!selectedCat || customCat.trim().length >= 2
  const isStep2Valid = city.trim().length >= 2
  const isStep3Valid = description.trim().length >= 20
  const isStep4Valid = ime.trim().length >= 1 && (email.trim().length > 0 || telefon.trim().length > 0)

  const isLastContentStep = (isAuth && step === 3) || (!isAuth && step === 4)

  // ── Handlers ──────────────────────────────────────────────
  const handleNext = () => {
    setError(null)
    const valid =
      step === 1 ? isStep1Valid :
      step === 2 ? isStep2Valid :
      step === 3 ? isStep3Valid :
      step === 4 ? isStep4Valid : false
    if (!valid) return

    if (isLastContentStep) {
      void handleSubmit()
    } else {
      setStep(s => (s as number) + 1 as Step)
    }
  }

  const handleBack = () => {
    if (step === 1 || step === 'done') return
    setStep(s => (s as number) - 1 as Step)
    setError(null)
  }

  const handleSubmit = async () => {
    setLoading(true)
    setError(null)
    try {
      if (isAuth && authUser) {
        const res = await fetch('/api/povprasevanje', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            category_id: selectedCat?.id,
            categoryName: !selectedCat ? customCat : undefined,
            title: catName,
            description,
            urgency: 'normalno',
            location_city: city,
          }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Napaka pri oddaji')
        setSubmittedId(result.id ?? null)
      } else {
        const res = await fetch('/api/povprasevanje/public', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storitev: catName,
            lokacija: city,
            opis: description,
            ime: ime || undefined,
            stranka_email: email || undefined,
            stranka_telefon: telefon || undefined,
          }),
        })
        const result = await res.json()
        if (!res.ok) throw new Error(result.error || 'Napaka pri oddaji')
        setSubmittedId((result.id ?? result.data?.id) || null)
      }
      try { localStorage.removeItem(DRAFT_KEY) } catch {}
      setStep('done')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Napaka pri oddaji')
    } finally {
      setLoading(false)
    }
  }

  const handleMagicLink = async () => {
    if (!email || loading) return
    setLoading(true)
    setError(null)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/prijava?oauth=google`,
        },
      })
      if (otpError) throw otpError
      setMagicSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Napaka pri pošiljanju linka')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setGoogleLoading(true)
    try {
      try { sessionStorage.setItem('oauth_intended_role', 'narocnik') } catch {}
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/prijava?oauth=google` },
      })
    } catch { setGoogleLoading(false) }
  }

  // ── UI helpers ────────────────────────────────────────────
  const stepLabel = (s: number) =>
    s === 1 ? 'Kaj?' : s === 2 ? 'Kje?' : s === 3 ? 'Opis' : 'Kontakt'

  // ── Render ────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col max-w-xl mx-auto w-full px-4 pb-8">

      {/* Progress bar */}
      {step !== 'done' && (
        <div className="pt-4 pb-2">
          <div className="flex items-center gap-3 mb-3">
            {step !== 1 && (
              <button onClick={handleBack} className="text-muted-foreground hover:text-foreground transition-colors" aria-label="Nazaj">
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}
            <div className="flex gap-1.5 flex-1">
              {Array.from({ length: totalSteps }, (_, i) => (
                <div
                  key={i}
                  className={cn(
                    'h-1.5 flex-1 rounded-full transition-colors',
                    i < currentStepNum ? 'bg-primary' : 'bg-muted'
                  )}
                />
              ))}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {currentStepNum} / {totalSteps}
            </span>
          </div>
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 flex flex-col gap-6 pt-2">

        {/* ── Step 1: Category ── */}
        {step === 1 && (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {stepLabel(1)}
              </p>
              <h1 className="text-2xl font-bold">Kaj potrebujete?</h1>
              <p className="text-muted-foreground text-sm mt-1">Izberite vrsto storitve</p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {categories.map(cat => {
                const Icon = getIcon(cat.icon_name)
                return (
                  <button
                    key={cat.id}
                    onClick={() => { setSelectedCat(cat); setCustomCat('') }}
                    className={cn(
                      'flex flex-col items-start gap-1.5 rounded-xl border-2 p-3 text-left transition-all',
                      selectedCat?.id === cat.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-card hover:border-primary/40 hover:bg-accent/50'
                    )}
                  >
                    {Icon
                      ? <Icon className="w-5 h-5 text-primary" />
                      : <span className="w-5 h-5 bg-primary/20 rounded" />
                    }
                    <span className="text-sm font-medium leading-tight">{cat.name}</span>
                  </button>
                )
              })}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="customCat" className="text-sm text-muted-foreground">
                Kaj drugega?
              </Label>
              <Input
                id="customCat"
                placeholder="npr. Sušilni stroj..."
                value={customCat}
                onChange={e => { setCustomCat(e.target.value); setSelectedCat(null) }}
                maxLength={100}
              />
            </div>

            <Button
              className="w-full"
              size="lg"
              disabled={!isStep1Valid}
              onClick={handleNext}
            >
              Naprej →
            </Button>
          </>
        )}

        {/* ── Step 2: City ── */}
        {step === 2 && (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {stepLabel(2)}
              </p>
              <h1 className="text-2xl font-bold">Kje ste?</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Vnesemo kraj, da najdemo najbližjega mojstra
              </p>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  autoFocus
                  className="pl-9 h-12 text-base"
                  placeholder="npr. Ljubljana, Maribor, Koper..."
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && isStep2Valid && handleNext()}
                  maxLength={120}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!isStep2Valid}
              onClick={handleNext}
            >
              Naprej →
            </Button>
          </>
        )}

        {/* ── Step 3: Description ── */}
        {step === 3 && (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {stepLabel(3)}
              </p>
              <h1 className="text-2xl font-bold">Opišite težavo</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Več podrobnosti = hitrejše in boljše ponudbe
              </p>
            </div>

            <div className="space-y-2">
              <Textarea
                autoFocus
                className="min-h-36 text-base resize-none"
                placeholder={`Opišite, kaj potrebujete za "${catName || 'storitev'}" v ${city || 'vašem kraju'}...\n\nNpr. kdaj, kakšen obseg dela, posebne zahteve...`}
                value={description}
                onChange={e => setDescription(e.target.value)}
                maxLength={2000}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>{description.length < 20 ? `Še ${20 - description.length} znakov` : '✓ Dovolj podrobnosti'}</span>
                <span>{description.length}/2000</span>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!isStep3Valid || loading}
              onClick={handleNext}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Oddajam...</>
              ) : isAuth ? (
                'Oddaj povpraševanje ✓'
              ) : (
                'Naprej →'
              )}
            </Button>
          </>
        )}

        {/* ── Step 4: Contact (guest only) ── */}
        {step === 4 && (
          <>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">
                {stepLabel(4)}
              </p>
              <h1 className="text-2xl font-bold">Vaš kontakt</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Mojster vas bo kontaktiral v manj kot 2 urah
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="ime">Ime in priimek *</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="ime"
                    autoFocus
                    className="pl-9 h-12"
                    placeholder="Janez Novak"
                    value={ime}
                    onChange={e => setIme(e.target.value)}
                    maxLength={120}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email *</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    className="pl-9 h-12"
                    placeholder="vas@email.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="telefon" className="flex items-center gap-1">
                  Telefon
                  <span className="text-xs text-muted-foreground">(neobvezno)</span>
                </Label>
                <Input
                  id="telefon"
                  type="tel"
                  className="h-12"
                  placeholder="+386 31 123 456"
                  value={telefon}
                  onChange={e => setTelefon(e.target.value)}
                />
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              className="w-full"
              size="lg"
              disabled={!isStep4Valid || loading}
              onClick={handleNext}
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 animate-spin mr-2" />Oddajam...</>
              ) : (
                'Oddaj povpraševanje ✓'
              )}
            </Button>

            <p className="text-xs text-center text-muted-foreground">
              Vaši podatki so varni in se ne delijo s tretjimi osebami.
            </p>
          </>
        )}

        {/* ── Done ── */}
        {step === 'done' && (
          <div className="flex-1 flex flex-col items-center justify-center gap-6 py-8 text-center">
            <CheckCircle2 className="w-16 h-16 text-emerald-500" />

            <div>
              <h1 className="text-2xl font-bold">Povpraševanje oddano!</h1>
              <p className="text-muted-foreground mt-1">
                {catName} · {city}
              </p>
              <p className="text-sm text-muted-foreground mt-3">
                Preverjen mojster vas bo kontaktiral v <strong>manj kot 2 urah</strong>.
              </p>
            </div>

            {isAuth ? (
              /* Logged-in: go to dashboard */
              <div className="w-full space-y-3">
                {submittedId ? (
                  <Button className="w-full" size="lg" asChild>
                    <Link href={`/povprasevanja/${submittedId}`}>Poglej ponudbe →</Link>
                  </Button>
                ) : (
                  <Button className="w-full" size="lg" asChild>
                    <Link href="/dashboard">Na nadzorno ploščo →</Link>
                  </Button>
                )}
              </div>
            ) : (
              /* Guest: offer Google + magic link */
              <div className="w-full space-y-3">
                <p className="text-sm font-medium">Sledite vaši oddaji:</p>

                <Button
                  className="w-full bg-white text-gray-800 border border-gray-300 hover:bg-gray-50 shadow-sm"
                  size="lg"
                  onClick={handleGoogle}
                  disabled={googleLoading}
                >
                  {googleLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : (
                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Prijava z Google
                </Button>

                {email && !magicSent && (
                  <Button
                    variant="outline"
                    className="w-full"
                    size="lg"
                    onClick={handleMagicLink}
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <Mail className="w-4 h-4 mr-2" />
                    )}
                    Pošlji mi link na {email}
                  </Button>
                )}

                {magicSent && (
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm text-center">
                    ✉️ Link poslан na <strong>{email}</strong> — preverite nabiralnik.
                  </div>
                )}

                <Link
                  href="/"
                  className="block text-center text-sm text-muted-foreground hover:underline"
                >
                  Zapri
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function OddajPage() {
  return (
    <Suspense fallback={
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <OddajContent />
    </Suspense>
  )
}
