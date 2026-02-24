'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'
import { Eye, EyeOff, CheckCircle2, Loader2, Mail, Phone, Lock, Building2 } from 'lucide-react'

const SPECIALNOSTI = [
  'Vodovod & ogrevanje',
  'Elektrika',
  'Gradnja & adaptacije',
  'Mizarstvo',
  'Zaključna dela',
  'Okna & vrata',
  'Okolica',
  'Vzdrževanje',
]

const LOKACIJE = [
  'Ljubljana',
  'Maribor',
  'Celje',
  'Kranj',
  'Koper',
  'Novo Mesto',
  'Velenje',
  'Murska Sobota',
  'Slovenija (celotna)',
]

export default function PartnerSignUp() {
  const router = useRouter()
  const [ime, setIme] = useState('')
  const [priimek, setPriimek] = useState('')
  const [email, setEmail] = useState('')
  const [telefon, setTelefon] = useState('')
  const [podjetje, setPodjetje] = useState('')
  const [specialnosti, setSpecialnosti] = useState<string[]>([])
  const [lokacije, setLokacije] = useState<string[]>([])
  const [password, setPassword] = useState('')
  const [passwordRepeat, setPasswordRepeat] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordRepeat, setShowPasswordRepeat] = useState(false)
  const [paket, setPaket] = useState('start')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [passwordStrength, setPasswordStrength] = useState<'weak' | 'medium' | 'strong'>('weak')

  const supabase = createClient()

  const checkPasswordStrength = (pwd: string) => {
    if (pwd.length < 8) return 'weak'
    if (pwd.match(/[A-Z]/) && pwd.match(/[0-9]/) && pwd.match(/[^A-Za-z0-9]/)) return 'strong'
    if (pwd.match(/[A-Z]/) || pwd.match(/[0-9]/)) return 'medium'
    return 'weak'
  }

  const handlePasswordChange = (pwd: string) => {
    setPassword(pwd)
    setPasswordStrength(checkPasswordStrength(pwd))
  }

  const handleSpecialnostToggle = (spec: string) => {
    setSpecialnosti(prev =>
      prev.includes(spec) ? prev.filter(s => s !== spec) : [...prev, spec]
    )
  }

  const handleLokacijaToggle = (lok: string) => {
    setLokacije(prev =>
      prev.includes(lok) ? prev.filter(l => l !== lok) : [...prev, lok]
    )
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      // Validation
      if (!ime || !priimek || !email || !password || !specialnosti.length || !lokacije.length) {
        toast.error('Izpolnite vsa obvezna polja')
        setIsLoading(false)
        return
      }

      if (password !== passwordRepeat) {
        toast.error('Gesli se ne ujemata')
        setIsLoading(false)
        return
      }

      if (password.length < 8) {
        toast.error('Geslo mora vsebovati vsaj 8 znakov')
        setIsLoading(false)
        return
      }

      if (!termsAccepted) {
        toast.error('Sprejeti morate pogoje uporabe')
        setIsLoading(false)
        return
      }

      // Sign up
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/partner-auth/verify-email`,
          data: {
            ime,
            priimek,
            user_type: 'partner',
          },
        },
      })

      if (error) {
        toast.error(error.message)
        setIsLoading(false)
        return
      }

      if (data.user) {
        // Create obrtnik profile
        const res = await fetch('/api/obrtniki', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: data.user.id,
            ime,
            priimek,
            email,
            telefon: telefon || null,
            podjetje: podjetje || null,
            specialnosti,
            lokacije,
            status: 'pending',
            paket,
          }),
        })

        if (!res.ok) throw new Error('Failed to create profile')

        toast.success('Registracija uspešna! Preverite e-pošto.')
        router.push('/partner-auth/verify-email')
      }
    } catch (error) {
      console.error('[v0] Signup error:', error)
      toast.error(error instanceof Error ? error.message : 'Napaka pri registraciji')
    } finally {
      setIsLoading(false)
    }
  }

  const strengthColor = {
    weak: 'bg-destructive',
    medium: 'bg-accent',
    strong: 'bg-primary',
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 gap-0">
      {/* Left: Hero (hidden on mobile) */}
      <div className="hidden lg:flex flex-col justify-between bg-gradient-to-br from-primary to-primary/80 p-8 text-primary-foreground">
        <div>
          <div className="text-3xl font-bold mb-2">L</div>
          <h2 className="text-2xl font-bold mb-8">Pridružite se 225+ preverjenim mojstrom</h2>
          
          <div className="space-y-4">
            {[
              'Brezplačna registracija — START paket 0€/mesec',
              'Dostop do 1.000+ povpraševanj mesečno',
              'Odziv v 2 urah — garancija za stranke',
              'PRO paket za 29€/mes — samo 5% provizija',
            ].map((benefit, i) => (
              <div key={i} className="flex gap-3">
                <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                <p className="text-sm">{benefit}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Testimonial */}
        <Card className="bg-white/10 border-white/20 text-primary-foreground">
          <CardContent className="p-4">
            <p className="text-sm mb-3">"LiftGO mi je spremenil način dela. Več povpraševanj, manj izgubljenega časa."</p>
            <p className="font-semibold text-sm">Igor Božič</p>
            <p className="text-xs opacity-75">Tesarstvo, Ljubljana</p>
            <div className="flex gap-1 mt-2">
              {[...Array(5)].map((_, i) => (
                <span key={i} className="text-lg">⭐</span>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right: Form */}
      <div className="flex items-center justify-center p-6 md:p-10 bg-background">
        <div className="w-full max-w-md">
          <Card className="border-border">
            <CardHeader>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-primary text-primary-foreground rounded-lg flex items-center justify-center font-bold">L</div>
                <div>
                  <CardTitle className="text-xl">Registracija partnerja</CardTitle>
                  <p className="text-xs text-muted-foreground">Već imate račun? <Link href="/partner-auth/login" className="text-primary hover:underline">Prijava</Link></p>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSignUp} className="space-y-4">
                {/* Ime + Priimek */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-xs">Ime *</Label>
                    <Input placeholder="Janez" value={ime} onChange={e => setIme(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">Priimek *</Label>
                    <Input placeholder="Novak" value={priimek} onChange={e => setPriimek(e.target.value)} />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <Label className="text-xs">E-poštni naslov *</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input type="email" placeholder="janez@mojster.si" className="pl-9" value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>

                {/* Telefon */}
                <div>
                  <Label className="text-xs">Telefonska številka</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input type="tel" placeholder="+386 31 123 456" className="pl-9" value={telefon} onChange={e => setTelefon(e.target.value)} />
                  </div>
                </div>

                {/* Podjetje */}
                <div>
                  <Label className="text-xs">Ime podjetja / s.p.</Label>
                  <div className="relative">
                    <Building2 className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input placeholder="Mojster d.o.o." className="pl-9" value={podjetje} onChange={e => setPodjetje(e.target.value)} />
                  </div>
                </div>

                {/* Specialnosti */}
                <div>
                  <Label className="text-xs">Področja dela *</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {SPECIALNOSTI.map(spec => (
                      <button
                        key={spec}
                        type="button"
                        onClick={() => handleSpecialnostToggle(spec)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          specialnosti.includes(spec)
                            ? 'bg-secondary text-primary border-primary'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {spec}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lokacije */}
                <div>
                  <Label className="text-xs">Območja dela *</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {LOKACIJE.map(lok => (
                      <button
                        key={lok}
                        type="button"
                        onClick={() => handleLokacijaToggle(lok)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          lokacije.includes(lok)
                            ? 'bg-secondary text-primary border-primary'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {lok}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Password */}
                <div>
                  <Label className="text-xs">Geslo *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Vsaj 8 znakov"
                      className="pl-9 pr-9"
                      value={password}
                      onChange={e => handlePasswordChange(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {password && (
                    <div className="mt-2 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div className={`h-full w-1/3 ${strengthColor[passwordStrength]} transition-all`} />
                    </div>
                  )}
                </div>

                {/* Password Repeat */}
                <div>
                  <Label className="text-xs">Potrdi geslo *</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                    <Input
                      type={showPasswordRepeat ? 'text' : 'password'}
                      placeholder="Ponovi geslo"
                      className="pl-9 pr-9"
                      value={passwordRepeat}
                      onChange={e => setPasswordRepeat(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordRepeat(!showPasswordRepeat)}
                      className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                    >
                      {showPasswordRepeat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Paket Selection */}
                <div className="space-y-2 border-t border-border pt-4">
                  <Label className="text-xs font-semibold">Izberite paket</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {/* START */}
                    <button
                      type="button"
                      onClick={() => setPaket('start')}
                      className={`rounded-lg border-2 p-3 text-left transition-colors ${
                        paket === 'start'
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-accent'
                      }`}
                    >
                      <div className="text-xs font-semibold text-primary mb-1">START</div>
                      <div className="text-lg font-bold">0 €/mesec</div>
                      <div className="text-xs text-muted-foreground">10% provizija</div>
                      <ul className="text-xs mt-2 space-y-1 text-muted-foreground">
                        <li>✓ Brezplačna</li>
                        <li>✓ 1.000+ povpraševanj</li>
                      </ul>
                    </button>

                    {/* PRO */}
                    <button
                      type="button"
                      onClick={() => setPaket('pro')}
                      className={`rounded-lg border-2 p-3 text-left transition-colors ${
                        paket === 'pro'
                          ? 'border-accent bg-accent/5'
                          : 'border-border hover:border-accent'
                      }`}
                    >
                      <div className="text-xs font-semibold text-accent mb-1">PRO</div>
                      <div className="text-lg font-bold text-accent">29 €/mesec</div>
                      <div className="text-xs text-muted-foreground">5% provizija</div>
                      <ul className="text-xs mt-2 space-y-1 text-muted-foreground">
                        <li>✓ Prioritetno</li>
                        <li>✓ CRM sistem</li>
                      </ul>
                    </button>
                  </div>
                </div>

                {/* Terms Checkbox */}
                <div className="flex items-start gap-2 pt-2">
                  <Checkbox
                    id="terms"
                    checked={termsAccepted}
                    onCheckedChange={setTermsAccepted}
                    className="mt-1"
                  />
                  <label htmlFor="terms" className="text-xs text-muted-foreground">
                    Strinjam se s{' '}
                    <Link href="/terms" className="text-primary hover:underline">
                      Pogoji uporabe
                    </Link>
                    {' '}in{' '}
                    <Link href="/privacy" className="text-primary hover:underline">
                      Politiko zasebnosti
                    </Link>
                    {' '}*
                  </label>
                </div>

                {/* Submit */}
                <Button type="submit" className="w-full bg-primary text-primary-foreground font-bold py-2 mt-4" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Registracija...
                    </>
                  ) : (
                    'Registrirajte se brezplačno →'
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  Ste stranka?{' '}
                  <Link href="/" className="text-primary hover:underline">
                    Oddajte povpraševanje
                  </Link>
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
