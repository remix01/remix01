'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle, CheckCircle, Eye, EyeOff } from 'lucide-react'

export default function RacunPage() {
  const router = useRouter()
  const supabase = createClient()

  // Account Info
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Password Change
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  // Session Info
  const [sessions, setSessions] = useState<any[]>([])

  // Load user data on mount
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          setUserEmail(user.email || null)

          // Fetch profile for full name
          const { data: profileData } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .maybeSingle()

          if (profileData) {
            setFullName(profileData.full_name)
          }
        }
      } catch (err) {
        console.error('Error loading user data:', err)
      } finally {
        setLoading(false)
      }
    }

    loadUserData()
  }, [supabase])

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    // Validation
    if (!currentPassword) {
      setPasswordError('Vnesite trenutno geslo')
      return
    }
    if (!newPassword) {
      setPasswordError('Vnesite novo geslo')
      return
    }
    if (newPassword.length < 6) {
      setPasswordError('Geslo mora biti dolgo najmanj 6 znakov')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Gesli se ne ujemata')
      return
    }

    setChangingPassword(true)

    try {
      // First, verify the current password by attempting to sign in
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !user.email) {
        setPasswordError('Napaka pri prijavi. Prosimo, poskusite znova.')
        return
      }

      // Verify current password
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      })

      if (signInError) {
        setPasswordError('Trenutno geslo je napačno')
        return
      }

      // Update password
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      })

      if (updateError) {
        setPasswordError(updateError.message || 'Napaka pri spreminjanju gesla')
        return
      }

      setPasswordSuccess('Geslo je bilo uspešno spremenjeno!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')

      // Clear success message after 3 seconds
      setTimeout(() => {
        setPasswordSuccess(null)
      }, 3000)
    } catch (err: any) {
      setPasswordError('Napaka pri spreminjanju gesla. Poskusite znova.')
      console.error('Error changing password:', err)
    } finally {
      setChangingPassword(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/prijava')
  }

  const handleLogoutAllDevices = async () => {
    try {
      await supabase.auth.signOut({ scope: 'global' })
      router.push('/prijava')
    } catch (err) {
      console.error('Error logging out from all devices:', err)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto mb-4"></div>
          <p className="text-muted-foreground">Nalaganje...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2">Moj račun</h1>
        <p className="text-muted-foreground">Upravljajte nastavitve računa in varnost</p>
      </div>

      {/* Account Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Podatki računa</CardTitle>
          <CardDescription>Osnovni podatki vašega računa</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Email</Label>
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
              <p className="text-gray-900 font-medium">{userEmail || '-'}</p>
            </div>
            <p className="text-xs text-gray-500 mt-2">Primarni email naslov vašega računa</p>
          </div>

          {/* Full Name (Read-only for now) */}
          {fullName && (
            <div>
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Ime in priimek</Label>
              <div className="p-3 bg-gray-50 border border-gray-200 rounded-md">
                <p className="text-gray-900 font-medium">{fullName}</p>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <p>💡 Dodatne podatke profilnega računa uredite v <a href="/profil" className="text-primary hover:underline font-medium">Moj profil</a></p>
          </div>
        </CardContent>
      </Card>

      {/* Password Change */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Sprememba gesla</CardTitle>
          <CardDescription>Spremenite svoje geslo za boljšo varnost</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="space-y-4">
            {passwordError && (
              <div className="flex gap-3 rounded-lg bg-destructive/10 p-3 text-destructive text-sm">
                <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>{passwordError}</p>
              </div>
            )}

            {passwordSuccess && (
              <div className="flex gap-3 rounded-lg bg-green-50 p-3 text-green-700 text-sm">
                <CheckCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <p>{passwordSuccess}</p>
              </div>
            )}

            {/* Current Password */}
            <div>
              <Label htmlFor="current-password" className="text-sm font-medium mb-2 block">
                Trenutno geslo
              </Label>
              <div className="relative">
                <Input
                  id="current-password"
                  type={showCurrentPassword ? 'text' : 'password'}
                  placeholder="Vnesite trenutno geslo"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  disabled={changingPassword}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <Label htmlFor="new-password" className="text-sm font-medium mb-2 block">
                Novo geslo
              </Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showNewPassword ? 'text' : 'password'}
                  placeholder="Vnesite novo geslo"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  disabled={changingPassword}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div>
              <Label htmlFor="confirm-password" className="text-sm font-medium mb-2 block">
                Potrdite geslo
              </Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Ponovite novo geslo"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={changingPassword}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={changingPassword}
              className="w-full"
            >
              {changingPassword ? 'Spreminjam geslo...' : 'Spremenite geslo'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Session Management */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-xl">Varnost in seje</CardTitle>
          <CardDescription>Upravljajte vaše aktivne seje</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-md">
            <p className="text-sm text-gray-700 mb-3">
              Trenutno ste prijavljeni. Pritisnite gumb spodaj za odjavo.
            </p>
            <Button
              onClick={handleLogout}
              variant="outline"
              className="w-full"
            >
              Odjavite se
            </Button>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
            <p className="text-sm text-amber-900 mb-3">
              ⚠️ Odjavite se iz vseh naprav (če ste prijavljeni na več napravah).
            </p>
            <Button
              onClick={handleLogoutAllDevices}
              variant="outline"
              className="w-full text-amber-700 border-amber-300 hover:bg-amber-100"
            >
              Odjava z vseh naprav
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Support */}
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Pomoč in podpora</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Če imate vprašanja ali težave s svojim računom, nas kontaktirajte:
          </p>
          <div className="space-y-2 text-sm">
            <p className="text-gray-700">📧 <a href="mailto:support@liftgo.si" className="text-primary hover:underline">support@liftgo.si</a></p>
            <p className="text-gray-700">📞 <a href="tel:+38614000000" className="text-primary hover:underline">+386 1 400 0000</a></p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
