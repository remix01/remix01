'use client'

import { useState } from 'react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Accordion, 
  AccordionContent, 
  AccordionItem, 
  AccordionTrigger 
} from '@/components/ui/accordion'
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Calculator, 
  CheckSquare, 
  Clock, 
  AlertTriangle,
  ArrowRight,
  Droplet,
  Thermometer,
  Zap,
  TrendingUp
} from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'

export default function OrodjaPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b bg-gradient-to-b from-secondary/30 to-background py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h1 className="font-display text-4xl font-bold tracking-tight text-balance lg:text-5xl">
                Orodja za lastnike nepremičnin
              </h1>
              <p className="mt-4 text-lg text-muted-foreground text-pretty leading-relaxed">
                Brezplačna orodja za pametno načrtovanje vzdrževanja doma. 
                Ocenite stroške, čas in nujnost del preden kontaktirate mojstra.
              </p>
            </div>
          </div>
        </section>

        {/* Tools Grid */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-7xl px-4 lg:px-8">
            <Accordion type="single" collapsible className="grid gap-6 md:grid-cols-2">
              {/* Tool 1: Price Calculator */}
              <AccordionItem value="cena-kalkulator" className="border rounded-lg">
                <Card className="border-0 shadow-none">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Calculator className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl">Kalkulator cene del</CardTitle>
                        <CardDescription className="mt-1.5">
                          Ocenite stroške obrtniških del glede na vrsto in obseg projekta
                        </CardDescription>
                      </div>
                    </div>
                    <AccordionTrigger className="pt-4 hover:no-underline">
                      <Button variant="outline" className="w-full">
                        Odpri kalkulator
                      </Button>
                    </AccordionTrigger>
                  </CardHeader>
                  <AccordionContent>
                    <CardContent className="pt-2">
                      <CenaKalkulator />
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Tool 2: Checklist */}
              <AccordionItem value="kontrolna-lista" className="border rounded-lg">
                <Card className="border-0 shadow-none">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <CheckSquare className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl">Kontrolna lista vzdrževanja</CardTitle>
                        <CardDescription className="mt-1.5">
                          Interaktivne kontrolne liste za redno vzdrževanje vašega doma
                        </CardDescription>
                      </div>
                    </div>
                    <AccordionTrigger className="pt-4 hover:no-underline">
                      <Button variant="outline" className="w-full">
                        Odpri kontrolno listo
                      </Button>
                    </AccordionTrigger>
                  </CardHeader>
                  <AccordionContent>
                    <CardContent className="pt-2">
                      <KontrolnaLista />
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Tool 3: Time Estimator */}
              <AccordionItem value="cas-estimator" className="border rounded-lg">
                <Card className="border-0 shadow-none">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Clock className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl">Estimator časa</CardTitle>
                        <CardDescription className="mt-1.5">
                          Ugotovite, koliko časa bo trajalo določeno obrtniško delo
                        </CardDescription>
                      </div>
                    </div>
                    <AccordionTrigger className="pt-4 hover:no-underline">
                      <Button variant="outline" className="w-full">
                        Odpri estimator
                      </Button>
                    </AccordionTrigger>
                  </CardHeader>
                  <AccordionContent>
                    <CardContent className="pt-2">
                      <CasEstimator />
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>

              {/* Tool 4: Urgency Evaluator */}
              <AccordionItem value="urgentnost-ocena" className="border rounded-lg">
                <Card className="border-0 shadow-none">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <AlertTriangle className="h-6 w-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-xl">Ocena urgentnosti</CardTitle>
                        <CardDescription className="mt-1.5">
                          Preverite, kako hitro morate rešiti določen problem v domu
                        </CardDescription>
                      </div>
                    </div>
                    <AccordionTrigger className="pt-4 hover:no-underline">
                      <Button variant="outline" className="w-full">
                        Odpri ocenjevalnik
                      </Button>
                    </AccordionTrigger>
                  </CardHeader>
                  <AccordionContent>
                    <CardContent className="pt-2">
                      <UrgentnostOcena />
                    </CardContent>
                  </AccordionContent>
                </Card>
              </AccordionItem>
            </Accordion>
          </div>
        </section>

        {/* CTA Section */}
        <section className="border-t bg-muted/50 py-16 lg:py-24">
          <div className="mx-auto max-w-4xl px-4 text-center lg:px-8">
            <h2 className="font-display text-3xl font-bold tracking-tight text-balance lg:text-4xl">
              Potrebujete mojstra?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground text-pretty leading-relaxed">
              Oddajte brezplačno povpraševanje in prejmite ponudbe od verificiranih 
              obrtnikov v manj kot 2 urah.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="min-h-[48px]">
                <a href="/#oddaj-povprasevanje">
                  Oddaj povpraševanje
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button size="lg" variant="outline" asChild className="min-h-[48px]">
                <a href="/">Nazaj na domov</a>
              </Button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  )
}

// Tool Components

function CenaKalkulator() {
  const [vrstaDelaCategory, setVrstaDelaCategory] = useState<string>('')
  const [povrsina, setPovrsina] = useState([50])
  const [vrstaDelaTip, setVrstaDelaTip] = useState<string>('')
  const [postnaStev, setPostnaStev] = useState('')
  const [showResult, setShowResult] = useState(false)

  const priceData = {
    'Vodovodna dela': { min: 35, max: 80, unit: '€/uro', useArea: false },
    'Elektro inštalacije': { min: 40, max: 90, unit: '€/uro', useArea: false },
    'Slikarska dela': { min: 8, max: 15, unit: '€/m²', useArea: true },
    'Keramika': { min: 25, max: 50, unit: '€/m²', useArea: true },
    'Tesarska dela': { min: 30, max: 70, unit: '€/uro', useArea: false },
    'Fasada': { min: 20, max: 40, unit: '€/m²', useArea: true },
    'Krovstvo': { min: 15, max: 35, unit: '€/m²', useArea: true },
  }

  const calculatePrice = () => {
    if (!vrstaDelaCategory) return null
    
    const data = priceData[vrstaDelaCategory as keyof typeof priceData]
    if (!data) return null

    const hours = data.useArea ? povrsina[0] * 0.3 : 8
    const tipMultiplier = vrstaDelaTip === 'Renovacija' ? 1.3 : vrstaDelaTip === 'Novogradnja' ? 1.5 : 1
    const regionMultiplier = postnaStev.startsWith('1') ? 1.15 : 1

    const baseMin = data.useArea ? data.min * povrsina[0] : data.min * hours
    const baseMax = data.useArea ? data.max * povrsina[0] : data.max * hours

    const totalMin = Math.round(baseMin * tipMultiplier * regionMultiplier)
    const totalMax = Math.round(baseMax * tipMultiplier * regionMultiplier)

    const material = Math.round((totalMin + totalMax) / 2 * 0.4)
    const labor = Math.round((totalMin + totalMax) / 2 * 0.5)
    const other = Math.round((totalMin + totalMax) / 2 * 0.1)

    return {
      min: totalMin,
      max: totalMax,
      breakdown: [
        { name: 'Material', value: material, fill: 'hsl(var(--chart-1))' },
        { name: 'Delo', value: labor, fill: 'hsl(var(--chart-2))' },
        { name: 'Transport/Ostalo', value: other, fill: 'hsl(var(--chart-3))' },
      ]
    }
  }

  const result = showResult ? calculatePrice() : null

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="vrsta-dela">Vrsta dela</Label>
          <Select value={vrstaDelaCategory} onValueChange={setVrstaDelaCategory}>
            <SelectTrigger id="vrsta-dela">
              <SelectValue placeholder="Izberite vrsto dela..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Vodovodna dela">Vodovodna dela</SelectItem>
              <SelectItem value="Elektro inštalacije">Elektro inštalacije</SelectItem>
              <SelectItem value="Slikarska dela">Slikarska dela</SelectItem>
              <SelectItem value="Keramika">Keramika</SelectItem>
              <SelectItem value="Tesarska dela">Tesarska dela</SelectItem>
              <SelectItem value="Fasada">Fasada</SelectItem>
              <SelectItem value="Krovstvo">Krovstvo</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {vrstaDelaCategory && priceData[vrstaDelaCategory as keyof typeof priceData]?.useArea && (
          <div className="space-y-2">
            <Label>Površina v m²: {povrsina[0]}</Label>
            <Slider
              value={povrsina}
              onValueChange={setPovrsina}
              min={5}
              max={200}
              step={5}
              className="py-4"
            />
          </div>
        )}

        <div className="space-y-2">
          <Label>Vrsta projekta</Label>
          <RadioGroup value={vrstaDelaTip} onValueChange={setVrstaDelaTip}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Popravilo" id="popravilo" />
              <Label htmlFor="popravilo" className="font-normal cursor-pointer">Popravilo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Renovacija" id="renovacija" />
              <Label htmlFor="renovacija" className="font-normal cursor-pointer">Renovacija</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="Novogradnja" id="novogradnja" />
              <Label htmlFor="novogradnja" className="font-normal cursor-pointer">Novogradnja</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="postna">Vaša poštna številka</Label>
          <Input
            id="postna"
            type="text"
            placeholder="npr. 1000"
            value={postnaStev}
            onChange={(e) => setPostnaStev(e.target.value)}
            maxLength={4}
          />
        </div>

        <Button 
          onClick={() => setShowResult(true)} 
          className="w-full"
          disabled={!vrstaDelaCategory || !vrstaDelaTip || !postnaStev}
        >
          Izračunaj oceno
        </Button>
      </div>

      {result && (
        <div className="space-y-4 rounded-lg border bg-muted/50 p-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Okvirna cena</p>
            <p className="mt-1 font-display text-3xl font-bold text-primary">
              {result.min} € — {result.max} €
            </p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={result.breakdown}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {result.breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-2 text-sm">
            <p className="text-muted-foreground">
              <strong>Opomba:</strong> To je orientacijska ocena. Za točno ponudbo oddajte povpraševanje.
            </p>
            <Button variant="default" className="w-full" asChild>
              <a href="/#oddaj-povprasevanje">
                Pridobi brezplačno ponudbo <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function KontrolnaLista() {
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({})

  const checklists = {
    'letni': {
      label: 'Letni pregled',
      categories: [
        {
          name: 'Vodovodna instalacija',
          items: [
            'Preveriti tesnost vseh pip in spojev',
            'Preveriti delovanje zaustavljalnih ventilov',
            'Očistiti sifone in odtoke',
            'Preveriti tlak vode (normalen: 2-4 bar)'
          ]
        },
        {
          name: 'Električna instalacija',
          items: [
            'Preveriti delovanje RCD/FI stikala (test gumb)',
            'Pregledati vidno napeljavo za poškodbe',
            'Preveriti temperaturno diferenco vtičnic'
          ]
        },
        {
          name: 'Streha in fasada',
          items: [
            'Pregledati streho po zimi za poškodbe',
            'Preveriti stanje olukov in odtokov',
            'Preveriti stanje fasade za razpoke'
          ]
        }
      ]
    },
    'sezonski': {
      label: 'Sezonski pregled',
      categories: [
        {
          name: 'Pomlad',
          items: [
            'Očistiti oluke in odvodnike',
            'Preveriti zunanja vrata in okna',
            'Pregledati klimatsko napravo'
          ]
        },
        {
          name: 'Jesen',
          items: [
            'Preveriti delovanje ogrevanja',
            'Pregledati izolacijo cevi',
            'Očistiti dimnik (če imate)'
          ]
        }
      ]
    },
    'prodaja': {
      label: 'Pred prodajo',
      categories: [
        {
          name: 'Dokumentacija',
          items: [
            'Zbrati vso tehnično dokumentacijo',
            'Pripraviti energetsko izkaznico',
            'Zbrati potrdila o vzdrževanju'
          ]
        },
        {
          name: 'Vizualni pregled',
          items: [
            'Odpraviti vidne poškodbe in razpoke',
            'Osvežiti barvo sten',
            'Urediti zunanjost (fasada, vrt)'
          ]
        }
      ]
    }
  }

  const getTotalItems = (checklistKey: string) => {
    return checklists[checklistKey as keyof typeof checklists].categories.reduce(
      (sum, cat) => sum + cat.items.length, 0
    )
  }

  const getCheckedCount = (checklistKey: string) => {
    const checklist = checklists[checklistKey as keyof typeof checklists]
    let count = 0
    checklist.categories.forEach(cat => {
      cat.items.forEach((item) => {
        if (checkedItems[`${checklistKey}-${item}`]) count++
      })
    })
    return count
  }

  const handlePrint = () => {
    window.print()
  }

  const handleSave = () => {
    localStorage.setItem('kontrolna-lista', JSON.stringify(checkedItems))
    alert('Seznam shranjen!')
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="letni">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="letni">Letni pregled</TabsTrigger>
          <TabsTrigger value="sezonski">Sezonski</TabsTrigger>
          <TabsTrigger value="prodaja">Pred prodajo</TabsTrigger>
        </TabsList>

        {Object.entries(checklists).map(([key, checklist]) => (
          <TabsContent key={key} value={key} className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Napredek</span>
                <span className="font-medium">
                  {getCheckedCount(key)}/{getTotalItems(key)} ({Math.round((getCheckedCount(key) / getTotalItems(key)) * 100)}%)
                </span>
              </div>
              <Progress value={(getCheckedCount(key) / getTotalItems(key)) * 100} />
            </div>

            {checklist.categories.map((category, catIndex) => (
              <div key={catIndex} className="space-y-3">
                <h4 className="font-semibold text-foreground">{category.name}</h4>
                <div className="space-y-2.5">
                  {category.items.map((item, itemIndex) => {
                    const itemKey = `${key}-${item}`
                    return (
                      <div key={itemIndex} className="flex items-start gap-3">
                        <Checkbox
                          id={itemKey}
                          checked={checkedItems[itemKey] || false}
                          onCheckedChange={(checked) => 
                            setCheckedItems(prev => ({ ...prev, [itemKey]: checked as boolean }))
                          }
                        />
                        <Label 
                          htmlFor={itemKey} 
                          className="font-normal leading-relaxed cursor-pointer"
                        >
                          {item}
                        </Label>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </TabsContent>
        ))}
      </Tabs>

      <div className="flex gap-3">
        <Button onClick={handleSave} variant="outline" className="flex-1">
          Shrani seznam
        </Button>
        <Button onClick={handlePrint} variant="outline" className="flex-1">
          Tiskaj
        </Button>
      </div>

      <Button variant="default" className="w-full" asChild>
        <a href="/#oddaj-povprasevanje">
          Oddaj povpraševanje za označene točke
        </a>
      </Button>
    </div>
  )
}

function CasEstimator() {
  const [vrstaDelaSelected, setVrstaDelaSelected] = useState<string>('')
  const [obsegProjekta, setObsegProjekta] = useState<string>('manjse')
  const [kolicina, setKolicina] = useState('')
  const [starostStavbe, setStarostStavbe] = useState<string>('nova')
  const [showResult, setShowResult] = useState(false)

  const timeData: Record<string, { time: string, workers: string, multiplier: number }> = {
    'Zamenjava pipe pod umivalnikom': { time: '1-2 ure', workers: '1 mojster', multiplier: 1 },
    'Zamenjava el. vtičnic (5 kom)': { time: '2-3 ure', workers: '1 mojster', multiplier: 1 },
    'Pleskanje sobe 20m²': { time: '4-6 ur', workers: '1-2 mojstra', multiplier: 1.2 },
    'Polaganje keramike 15m²': { time: '6-8 ur', workers: '1-2 mojstra', multiplier: 1.3 },
    'Montaža kuhinje': { time: '8-12 ur', workers: '2 mojstra', multiplier: 1.5 },
    'Zamenjava oken (3 kom)': { time: '6-10 ur', workers: '2 mojstra', multiplier: 1.4 },
    'Električno ogrevanje tal 20m²': { time: '12-16 ur', workers: '2 mojstra', multiplier: 1.6 },
    'Prenovitev kopalnice': { time: '3-5 dni', workers: '2-3 mojstri', multiplier: 2 },
    'Obnova fasade 100m²': { time: '5-7 dni', workers: '3-4 mojstri', multiplier: 2.5 },
  }

  const estimate = () => {
    if (!vrstaDelaSelected || !timeData[vrstaDelaSelected]) return null

    const data = timeData[vrstaDelaSelected]
    let multiplier = data.multiplier

    if (obsegProjekta === 'vecja') multiplier *= 1.5
    if (starostStavbe === 'stara') multiplier *= 1.2

    return {
      time: data.time,
      workers: data.workers,
      factors: [
        obsegProjekta === 'vecja' && 'Večja renovacija podaljša čas za 50%',
        starostStavbe === 'stara' && 'Stare stavbe zahtevajo več prilagoditev'
      ].filter(Boolean)
    }
  }

  const result = showResult ? estimate() : null

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="vrsta-dela-cas">Vrsta dela</Label>
          <Select value={vrstaDelaSelected} onValueChange={setVrstaDelaSelected}>
            <SelectTrigger id="vrsta-dela-cas">
              <SelectValue placeholder="Izberite delo..." />
            </SelectTrigger>
            <SelectContent>
              {Object.keys(timeData).map(key => (
                <SelectItem key={key} value={key}>{key}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Obseg projekta</Label>
          <RadioGroup value={obsegProjekta} onValueChange={setObsegProjekta}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manjse" id="manjse" />
              <Label htmlFor="manjse" className="font-normal cursor-pointer">Manjše popravilo</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="vecja" id="vecja" />
              <Label htmlFor="vecja" className="font-normal cursor-pointer">Večja renovacija</Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="kolicina-cas">Površina ali količina (npr. 20m²)</Label>
          <Input
            id="kolicina-cas"
            type="text"
            placeholder="Vnesite površino..."
            value={kolicina}
            onChange={(e) => setKolicina(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Starost stavbe</Label>
          <RadioGroup value={starostStavbe} onValueChange={setStarostStavbe}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="nova" id="nova" />
              <Label htmlFor="nova" className="font-normal cursor-pointer">Nova gradnja (po 1980)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="stara" id="stara" />
              <Label htmlFor="stara" className="font-normal cursor-pointer">Stara hiša (pred 1980)</Label>
            </div>
          </RadioGroup>
        </div>

        <Button 
          onClick={() => setShowResult(true)} 
          className="w-full"
          disabled={!vrstaDelaSelected}
        >
          Izračunaj trajanje
        </Button>
      </div>

      {result && (
        <div className="space-y-4 rounded-lg border bg-muted/50 p-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">Predvideno trajanje</p>
            <p className="mt-1 font-display text-3xl font-bold text-primary">
              {result.time}
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm">
            <span className="font-medium">Potrebni:</span>
            <span className="text-muted-foreground">{result.workers}</span>
          </div>

          {result.factors.length > 0 && (
            <div className="space-y-2 rounded-lg bg-background p-4">
              <p className="text-sm font-medium">Faktorji, ki vplivajo na čas:</p>
              <ul className="space-y-1 text-sm text-muted-foreground">
                {result.factors.map((factor, i) => (
                  <li key={i} className="flex gap-2">
                    <span>•</span>
                    <span>{factor}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <Button variant="default" className="w-full" asChild>
            <a href="/#oddaj-povprasevanje">
              Pridobi točno ponudbo <ArrowRight className="ml-2 h-4 w-4" />
            </a>
          </Button>
        </div>
      )}
    </div>
  )
}

function UrgentnostOcena() {
  const [answers, setAnswers] = useState<Record<string, boolean>>({
    water: false,
    heating: false,
    power: false,
    safety: false,
    damage: false
  })
  const [showResult, setShowResult] = useState(false)

  const questions = [
    { id: 'water', text: 'Ali kaplja voda ali je vidna vlaga?', icon: Droplet },
    { id: 'heating', text: 'Ali ne deluje ogrevanje v zimskem času?', icon: Thermometer },
    { id: 'power', text: 'Ali ste brez elektrike ali tople vode?', icon: Zap },
    { id: 'safety', text: 'Ali obstaja tveganje za zdravje ali varnost?', icon: AlertTriangle },
    { id: 'damage', text: 'Ali škoda nastaja v tem trenutku?', icon: TrendingUp }
  ]

  const yesCount = Object.values(answers).filter(Boolean).length

  const getUrgency = () => {
    if (yesCount <= 1) {
      return {
        level: 'low',
        color: 'text-green-600',
        bgColor: 'bg-green-50 border-green-200',
        title: 'Ni urgentno',
        message: 'Oddajte povpraševanje normalno.',
        ctaText: 'Oddaj povpraševanje',
        ctaVariant: 'default' as const
      }
    } else if (yesCount <= 3) {
      return {
        level: 'medium',
        color: 'text-yellow-600',
        bgColor: 'bg-yellow-50 border-yellow-200',
        title: 'Priporočamo reševanje v 24-48 urah',
        message: 'Problem zahteva hitrejše ukrepanje.',
        ctaText: 'Oddaj prioritetno povpraševanje',
        ctaVariant: 'default' as const
      }
    } else {
      return {
        level: 'high',
        color: 'text-red-600',
        bgColor: 'bg-red-50 border-red-200',
        title: 'URGENTNO!',
        message: 'Pokličite mojstra takoj.',
        ctaText: 'Oddaj urgentno povpraševanje',
        ctaVariant: 'destructive' as const
      }
    }
  }

  const urgency = showResult ? getUrgency() : null

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {questions.map(({ id, text, icon: Icon }) => (
          <div key={id} className="flex items-start gap-4 rounded-lg border p-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="leading-relaxed">{text}</p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={answers[id] === true ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnswers(prev => ({ ...prev, [id]: true }))}
              >
                Da
              </Button>
              <Button
                variant={answers[id] === false ? 'default' : 'outline'}
                size="sm"
                onClick={() => setAnswers(prev => ({ ...prev, [id]: false }))}
              >
                Ne
              </Button>
            </div>
          </div>
        ))}

        <Button onClick={() => setShowResult(true)} className="w-full">
          Prikaži oceno urgentnosti
        </Button>
      </div>

      {urgency && (
        <div className={`space-y-4 rounded-lg border p-6 animate-in fade-in slide-in-from-bottom-4 ${urgency.bgColor}`}>
          <div className="text-center">
            <p className={`font-display text-2xl font-bold ${urgency.color}`}>
              {urgency.title}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {urgency.message}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {urgency.level === 'high' && (
              <Button variant="outline" className="w-full" asChild>
                <a href="tel:+38612345678">Kliknite za klic</a>
              </Button>
            )}
            <Button variant={urgency.ctaVariant} className="w-full" asChild>
              <a href="/#oddaj-povprasevanje">
                {urgency.ctaText} <ArrowRight className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
