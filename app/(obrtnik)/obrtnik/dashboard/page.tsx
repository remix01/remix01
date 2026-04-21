import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  FileText,
  Briefcase,
  Star,
  TrendingUp,
  MessageSquare,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  Euro,
  BarChart3,
  UserCircle,
  Image,
  MapPin,
  Zap,
  ArrowUpRight,
  Plus,
} from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function ObrtknikDashboardPage() {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/partner-auth/login')

  const { data: obrtnikProfile } = await supabase
    .from('obrtnik_profiles')
    .select('id, business_name, description, tagline, hourly_rate, years_experience, is_available, is_verified, website_url, certificate_urls, working_since, ajpes_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!obrtnikProfile) redirect('/partner-auth/login')

  const [
    { data: userProfileById },
    { data: userProfileByAuth },
  ] = await Promise.all([
    supabase.from('profiles').select('subscription_tier, full_name, phone, avatar_url, location_city').eq('id', user.id).maybeSingle(),
    supabase.from('profiles').select('subscription_tier, full_name, phone, avatar_url, location_city').eq('auth_user_id', user.id).maybeSingle(),
  ])
  const userProfile = userProfileById ?? userProfileByAuth

  // Stats in parallel
  const [
    { count: activePonudbeCount },
    { count: acceptedPonudbeCount },
    { count: totalPonudbeCount },
    { data: oceneData },
    { data: obrtnikCategories },
    { data: recentPonudbe },
    { count: unreadMessages },
    { data: serviceAreas },
    { data: portfolioItems },
  ] = await Promise.all([
    supabase.from('ponudbe').select('*', { count: 'exact', head: true }).eq('obrtnik_id', obrtnikProfile.id).in('status', ['poslana', 'sprejeta']),
    supabase.from('ponudbe').select('*', { count: 'exact', head: true }).eq('obrtnik_id', obrtnikProfile.id).eq('status', 'sprejeta'),
    supabase.from('ponudbe').select('*', { count: 'exact', head: true }).eq('obrtnik_id', obrtnikProfile.id),
    supabase.from('ocene').select('rating, comment, created_at').eq('obrtnik_id', obrtnikProfile.id).order('created_at', { ascending: false }).limit(3),
    supabase.from('obrtnik_categories').select('category_id, categories(name, icon_name)').eq('obrtnik_id', obrtnikProfile.id),
    supabase.from('ponudbe').select('id, status, price_estimate, created_at, povprasevanja(id, title, location_city, urgency)').eq('obrtnik_id', obrtnikProfile.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('sporocila').select('*', { count: 'exact', head: true }).eq('receiver_id', user.id).eq('is_read', false),
    supabase.from('service_areas').select('city, radius_km').eq('obrtnik_id', obrtnikProfile.id).eq('is_active', true).limit(3),
    supabase.from('portfolio_items').select('id').eq('obrtnik_id', obrtnikProfile.id).limit(1),
  ])

  const categoryIds = obrtnikCategories?.map((oc: any) => oc.category_id) || []
  const { count: openPovprasevanjaCount } = await supabase
    .from('povprasevanja')
    .select('*', { count: 'exact', head: true })
    .in('category_id', categoryIds.length > 0 ? categoryIds : [''])
    .eq('status', 'odprto')

  const averageRating = oceneData && oceneData.length > 0
    ? (oceneData.reduce((sum: number, o: any) => sum + o.rating, 0) / oceneData.length).toFixed(1)
    : null

  const conversionRate = totalPonudbeCount && totalPonudbeCount > 0
    ? Math.round(((acceptedPonudbeCount || 0) / totalPonudbeCount) * 100)
    : 0

  // Profile completion score
  const profileFields = [
    { label: 'Ime podjetja', done: !!obrtnikProfile.business_name },
    { label: 'Opis', done: !!obrtnikProfile.description },
    { label: 'Kategorije', done: categoryIds.length > 0 },
    { label: 'Kontaktni podatki', done: !!userProfile?.phone },
    { label: 'Urna postavka', done: !!obrtnikProfile.hourly_rate },
    { label: 'Področja delovanja', done: (serviceAreas?.length || 0) > 0 },
    { label: 'Portfolio', done: (portfolioItems?.length || 0) > 0 },
    { label: 'Certifikati', done: (obrtnikProfile.certificate_urls?.length || 0) > 0 },
  ]
  const profileScore = Math.round((profileFields.filter(f => f.done).length / profileFields.length) * 100)
  const missingFields = profileFields.filter(f => !f.done).slice(0, 3)

  const tier = userProfile?.subscription_tier || 'start'
  const isPro = tier === 'pro'

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'sprejeta': return { label: 'Sprejeta', color: 'bg-green-100 text-green-800', icon: CheckCircle2 }
      case 'poslana': return { label: 'Poslana', color: 'bg-blue-100 text-blue-800', icon: Clock }
      case 'zavrnjena': return { label: 'Zavrnjena', color: 'bg-red-100 text-red-800', icon: AlertCircle }
      default: return { label: status, color: 'bg-gray-100 text-gray-600', icon: Clock }
    }
  }

  const getTimeAgo = (date: string) => {
    const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000)
    if (mins < 60) return `pred ${mins} min`
    if (mins < 1440) return `pred ${Math.floor(mins / 60)} h`
    return `pred ${Math.floor(mins / 1440)} d`
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Dober dan{userProfile?.full_name ? `, ${userProfile.full_name.split(' ')[0]}` : ''}! 👋
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {obrtnikProfile.business_name} · {obrtnikProfile.is_available ? '🟢 Razpoložljiv' : '🔴 Nedosegljiv'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={isPro ? 'default' : 'outline'} className="font-semibold">
            {isPro ? '⚡ PRO' : 'START'}
          </Badge>
          {!isPro && (
            <Link href="/obrtnik/narocnina">
              <Button size="sm" variant="outline" className="text-xs gap-1 border-amber-300 text-amber-700 hover:bg-amber-50">
                <Zap className="w-3 h-3" />
                Nadgradite na PRO
              </Button>
            </Link>
          )}
          <Link href="/narocnik/dashboard">
            <Button size="sm" variant="outline" className="text-xs gap-1 border-blue-300 text-blue-700 hover:bg-blue-50">
              <UserCircle className="w-3 h-3" />
              Naročnik
            </Button>
          </Link>
        </div>
      </div>

      {/* Alert: Open inquiries */}
      {openPovprasevanjaCount != null && openPovprasevanjaCount > 0 && (
        <Link href="/obrtnik/povprasevanja">
          <Card className="p-4 bg-primary/5 border-primary/20 hover:bg-primary/10 transition-colors cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-primary" />
                <p className="text-sm font-semibold text-primary">
                  {openPovprasevanjaCount} {openPovprasevanjaCount === 1 ? 'novo povpraševanje čaka' : 'povpraševanj čaka'} na vašo ponudbo
                </p>
              </div>
              <ChevronRight className="w-4 h-4 text-primary" />
            </div>
          </Card>
        </Link>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Aktivne ponudbe</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{activePonudbeCount || 0}</p>
              <Link href="/obrtnik/ponudbe" className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-1">
                Pregled <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="w-9 h-9 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Briefcase className="w-5 h-5 text-blue-500" />
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Sprejete ponudbe</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{acceptedPonudbeCount || 0}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {conversionRate}% konverzija
              </p>
            </div>
            <div className="w-9 h-9 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <TrendingUp className="w-5 h-5 text-green-500" />
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Povprečna ocena</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">
                {averageRating ? `${averageRating}★` : '—'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {oceneData?.length || 0} {oceneData?.length === 1 ? 'ocena' : 'ocen'}
              </p>
            </div>
            <div className="w-9 h-9 bg-yellow-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Star className="w-5 h-5 text-yellow-500" />
            </div>
          </div>
        </Card>

        <Card className="p-4 md:p-5">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-xs md:text-sm text-muted-foreground">Odprta povpraš.</p>
              <p className="text-2xl md:text-3xl font-bold mt-1">{openPovprasevanjaCount || 0}</p>
              <Link href="/obrtnik/povprasevanja" className="text-xs text-primary hover:underline flex items-center gap-0.5 mt-1">
                Pošlji ponudbo <ArrowUpRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="w-9 h-9 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <FileText className="w-5 h-5 text-purple-500" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">

        {/* Left column: Quick Actions + Recent Ponudbe */}
        <div className="lg:col-span-2 space-y-4 md:space-y-6">

          {/* Quick Actions */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Hitre akcije</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Link href="/obrtnik/povprasevanja">
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors text-center cursor-pointer">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <FileText className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-blue-800">Nova<br/>povpraševanja</span>
                  </div>
                </Link>

                <Link href="/obrtnik/ponudbe">
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-green-50 hover:bg-green-100 transition-colors text-center cursor-pointer">
                    <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                      <Briefcase className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-green-800">Moje<br/>ponudbe</span>
                  </div>
                </Link>

                <Link href="/obrtnik/sporocila">
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-purple-50 hover:bg-purple-100 transition-colors text-center cursor-pointer relative">
                    <div className="w-10 h-10 bg-purple-500 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-5 h-5 text-white" />
                    </div>
                    {(unreadMessages || 0) > 0 && (
                      <span className="absolute top-2 right-2 bg-red-500 text-white text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                        {(unreadMessages || 0) > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                    <span className="text-xs font-semibold text-purple-800">Sporočila</span>
                  </div>
                </Link>

                <Link href="/obrtnik/statistike">
                  <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-orange-50 hover:bg-orange-100 transition-colors text-center cursor-pointer">
                    <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                      <BarChart3 className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xs font-semibold text-orange-800">Statistika</span>
                  </div>
                </Link>
              </div>

              {/* Secondary quick actions */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                <Link href="/obrtnik/portfolio">
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 h-8">
                    <Image className="w-3.5 h-3.5" />
                    Portfolio
                  </Button>
                </Link>
                <Link href="/obrtnik/razpolozljivost">
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 h-8">
                    <Clock className="w-3.5 h-3.5" />
                    Razpoložljivost
                  </Button>
                </Link>
                <Link href="/obrtnik/profil">
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 h-8">
                    <UserCircle className="w-3.5 h-3.5" />
                    Profil
                  </Button>
                </Link>
                <Link href="/narocnik/novo-povprasevanje">
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 h-8 border-blue-200 text-blue-700 hover:bg-blue-50">
                    <Plus className="w-3.5 h-3.5" />
                    Kot naročnik
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Recent Ponudbe */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Nedavne ponudbe</CardTitle>
              <Link href="/obrtnik/ponudbe">
                <Button variant="ghost" size="sm" className="text-xs gap-1 text-muted-foreground hover:text-foreground h-7">
                  Vse <ChevronRight className="w-3 h-3" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {!recentPonudbe || recentPonudbe.length === 0 ? (
                <div className="text-center py-8">
                  <Briefcase className="w-8 h-8 text-muted-foreground/40 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Še niste poslali nobene ponudbe</p>
                  <Link href="/obrtnik/povprasevanja">
                    <Button size="sm" className="mt-3 text-xs">
                      Poišči povpraševanja
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  {recentPonudbe.map((p: any) => {
                    const cfg = getStatusConfig(p.status)
                    const Icon = cfg.icon
                    return (
                      <Link key={p.id} href={`/obrtnik/ponudbe`}>
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors group">
                          <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.color}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{p.povprasevanja?.title}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              {p.povprasevanja?.location_city && (
                                <span className="text-xs text-muted-foreground flex items-center gap-0.5">
                                  <MapPin className="w-3 h-3" />
                                  {p.povprasevanja.location_city}
                                </span>
                              )}
                              <span className="text-xs text-muted-foreground">{getTimeAgo(p.created_at)}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold">€{p.price_estimate}</p>
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${cfg.color}`}>
                              {cfg.label}
                            </span>
                          </div>
                        </div>
                      </Link>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Reviews */}
          {oceneData && oceneData.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Star className="w-4 h-4 text-yellow-500" />
                  Nedavne ocene
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {oceneData.map((ocena: any, i: number) => (
                    <div key={i} className="p-3 bg-muted/30 rounded-lg">
                      <div className="flex items-center gap-1 mb-1">
                        {Array.from({ length: 5 }).map((_, j) => (
                          <Star
                            key={j}
                            className={`w-3.5 h-3.5 ${j < ocena.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                          />
                        ))}
                        <span className="text-xs text-muted-foreground ml-1">{getTimeAgo(ocena.created_at)}</span>
                      </div>
                      {ocena.comment && <p className="text-sm text-muted-foreground italic">"{ocena.comment}"</p>}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column: Profile completion + Info cards */}
        <div className="space-y-4">

          {/* Profile Completion */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Popolnost profila</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-muted-foreground">Dokončano</span>
                <span className={`font-bold ${profileScore >= 80 ? 'text-green-600' : profileScore >= 50 ? 'text-amber-600' : 'text-red-500'}`}>
                  {profileScore}%
                </span>
              </div>
              <Progress value={profileScore} className="h-2" />
              {missingFields.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <p className="text-xs text-muted-foreground font-medium">Manjka:</p>
                  {missingFields.map((f) => (
                    <div key={f.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <div className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                      {f.label}
                    </div>
                  ))}
                  <Link href="/obrtnik/profil">
                    <Button size="sm" variant="outline" className="w-full mt-2 text-xs h-7">
                      Dopolni profil
                    </Button>
                  </Link>
                </div>
              )}
              {profileScore === 100 && (
                <p className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Profil je popoln!
                </p>
              )}
            </CardContent>
          </Card>

          {/* Status Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Stanje računa</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Paket</span>
                <Badge variant={isPro ? 'default' : 'outline'}>
                  {isPro ? '⚡ PRO' : 'START'}
                </Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Razpoložljiv</span>
                <span className={`font-medium text-xs ${obrtnikProfile.is_available ? 'text-green-600' : 'text-gray-400'}`}>
                  {obrtnikProfile.is_available ? '🟢 Da' : '🔴 Ne'}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Preverjen</span>
                <span className={`font-medium text-xs ${obrtnikProfile.is_verified ? 'text-green-600' : 'text-amber-500'}`}>
                  {obrtnikProfile.is_verified ? '✓ Da' : '⏳ V postopku'}
                </span>
              </div>
              {obrtnikProfile.hourly_rate && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Urna postavka</span>
                  <span className="font-semibold text-foreground">€{obrtnikProfile.hourly_rate}/h</span>
                </div>
              )}
              {!isPro && (
                <Link href="/obrtnik/narocnina">
                  <Button size="sm" className="w-full mt-1 text-xs gap-1.5 bg-amber-500 hover:bg-amber-600 text-white h-8">
                    <Zap className="w-3.5 h-3.5" />
                    Nadgradite na PRO — €29/mes
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Categories */}
          {obrtnikCategories && obrtnikCategories.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold">Vaše kategorije</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-1.5">
                  {obrtnikCategories.map((cat: any) => (
                    <Badge key={cat.category_id} variant="secondary" className="text-xs">
                      {cat.categories?.icon_name} {cat.categories?.name}
                    </Badge>
                  ))}
                </div>
                <Link href="/obrtnik/profil">
                  <Button variant="ghost" size="sm" className="text-xs w-full mt-2 h-7 text-muted-foreground">
                    Uredi kategorije
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Service Areas */}
          {serviceAreas && serviceAreas.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-semibold flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  Področja delovanja
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {serviceAreas.map((area: any, i: number) => (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="font-medium">{area.city}</span>
                      <span className="text-xs text-muted-foreground">+{area.radius_km} km</span>
                    </div>
                  ))}
                </div>
                <Link href="/obrtnik/razpolozljivost">
                  <Button variant="ghost" size="sm" className="text-xs w-full mt-2 h-7 text-muted-foreground">
                    Upravljaj področja
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}

          {/* Messages preview */}
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold">Sporočila</CardTitle>
              {(unreadMessages || 0) > 0 && (
                <Badge variant="destructive" className="text-xs h-5">
                  {unreadMessages} novo
                </Badge>
              )}
            </CardHeader>
            <CardContent>
              <Link href="/obrtnik/sporocila">
                <Button variant="outline" size="sm" className="w-full text-xs gap-2 h-8">
                  <MessageSquare className="w-3.5 h-3.5" />
                  {(unreadMessages || 0) > 0 ? `${unreadMessages} neprebrano sporočilo` : 'Odpri sporočila'}
                </Button>
              </Link>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  )
}
