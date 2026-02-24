'use client'

import React, { useState, useRef, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Loader2, Zap, MapPin, CheckCircle, Lightbulb, Lock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

// ==================== TYPES ====================

interface Contractor {
  initials: string
  name: string
  specialty: string
  years: number
  rating: number
  reviews: number
  distance: number
  priceMin: number
  priceMax: number
  badge?: string
  verified: boolean
  slots: string[]
}

interface FormState {
  description: string
  location: string
  selectedContractor: Contractor | null
  selectedSlot: string
  selectedDay: number | null
  selectedTime: string | null
}

// ==================== STEP 1: DESCRIPTION ====================

function Step1Description({
  formData,
  onDescriptionChange,
  onLocationChange,
  onNext,
  aiHint,
  isAnalyzing,
}: {
  formData: FormState
  onDescriptionChange: (desc: string) => void
  onLocationChange: (loc: string) => void
  onNext: () => void
  aiHint: string
  isAnalyzing: boolean
}) {
  const [showExamples, setShowExamples] = useState(false)
  
  const examples = [
    'Pipa v kuhinji puščá. Rada bi, da pride nekdo ta teden.',
    'Potrebujem zamenjavo strešne kritine. Hiša je stara 30 let.',
    'Popravilo vrata in ključavnica. Nudim sredstva in material.',
    'Potrebujem pomoč pri prenovi kopalnice. Nujno!',
  ]

  const isValid = formData.description.trim().length >= 10

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Opišite svojo težavo</h2>
        <p className="text-sm text-muted-foreground">
          Bolj natančen opis = hitrejši odziv pravega mojstra
        </p>
      </div>

      {/* Collapsible examples */}
      <div>
        <button
          onClick={() => setShowExamples(!showExamples)}
          className="text-sm text-primary font-semibold flex items-center gap-2 hover:opacity-80 transition"
        >
          <span>Primeri opisov</span>
          <span>{showExamples ? '▼' : '▶'}</span>
        </button>
        {showExamples && (
          <div className="mt-3 flex flex-wrap gap-2">
            {examples.map((ex, i) => (
              <button
                key={i}
                onClick={() => onDescriptionChange(ex)}
                className="text-xs bg-secondary border border-primary/30 text-foreground rounded-[var(--radius)] px-3 py-2 hover:bg-primary/10 transition"
              >
                {ex}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Textarea */}
      <div>
        <div className="relative">
          <textarea
            value={formData.description}
            onChange={(e) => onDescriptionChange(e.target.value.slice(0, 300))}
            placeholder="Npr. Pipa v kuhinji puščá. Rada bi, da pride nekdo ta teden."
            className="w-full min-h-[120px] rounded-[var(--radius)] border border-border bg-background text-foreground px-4 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
          />
          <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
            {formData.description.length}/300
          </div>
        </div>
      </div>

      {/* AI hint bar */}
      <div className="min-h-[32px] flex items-center">
        {isAnalyzing && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>AI analizira vaš opis…</span>
          </div>
        )}
        {!isAnalyzing && aiHint && (
          <div className="inline-flex items-center gap-2 bg-secondary border border-primary/30 text-primary text-xs px-3 py-1.5 rounded-full">
            <Lightbulb className="w-3.5 h-3.5" />
            <span>{aiHint}</span>
          </div>
        )}
      </div>

      {/* Location input */}
      <div>
        <label className="block text-sm font-semibold text-foreground mb-2">
          Lokacija <span className="text-destructive">*</span>
        </label>
        <div className="relative">
          <MapPin className="absolute left-3 top-3 w-5 h-5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={formData.location}
            onChange={(e) => onLocationChange(e.target.value)}
            placeholder="npr. Ljubljana"
            defaultValue="Ljubljana"
            className="w-full rounded-[var(--radius)] border border-border bg-background text-foreground pl-10 pr-4 py-3 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/10 transition"
          />
        </div>
      </div>

      {/* Trust strip */}
      <div className="flex gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <span className="text-primary">✓</span>
          <span className="text-primary font-semibold">Brezplačno</span>
        </div>
        <div className="flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-accent" />
          <span>Odziv v 2 urah</span>
        </div>
        <div className="flex items-center gap-1">
          <Lock className="w-3.5 h-3.5" />
          <span>Brez obveznosti</span>
        </div>
      </div>

      {/* CTA */}
      <Button
        onClick={onNext}
        disabled={!isValid}
        className="w-full bg-primary text-primary-foreground rounded-[var(--radius)] py-3 font-bold hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition"
      >
        Naprej →
      </Button>
    </div>
  )
}

// ==================== STEP 2: SELECT CONTRACTOR ====================

function Step2Contractor({
  formData,
  contractors,
  onContractorSelect,
  onBack,
  onNext,
}: {
  formData: FormState
  contractors: Contractor[]
  onContractorSelect: (c: Contractor) => void
  onBack: () => void
  onNext: () => void
}) {
  const [sortBy, setSortBy] = useState<'rating' | 'distance'>('rating')
  const [maxPrice, setMaxPrice] = useState(80)
  const [expandedId, setExpandedId] = useState<string | null>(contractors[0]?.name || null)

  const sorted = [...contractors]
    .filter((c) => c.priceMin <= maxPrice)
    .sort((a, b) => (sortBy === 'rating' ? b.rating - a.rating : a.distance - b.distance))

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Izberite izvajalca</h2>
        <p className="text-sm text-muted-foreground">
          Tukaj so najboljši mojstri za vašo storitev
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-muted rounded-[var(--radius)] p-2.5 flex gap-2 flex-wrap items-center justify-between">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            Razvrsti:
          </span>
          <button
            onClick={() => setSortBy('rating')}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition ${
              sortBy === 'rating'
                ? 'bg-secondary border-primary text-primary'
                : 'bg-card border-border text-muted-foreground'
            }`}
          >
            ★ Ocena
          </button>
          <button
            onClick={() => setSortBy('distance')}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold border transition ${
              sortBy === 'distance'
                ? 'bg-secondary border-primary text-primary'
                : 'bg-card border-border text-muted-foreground'
            }`}
          >
            📍 Razdalja
          </button>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="35"
            max="100"
            value={maxPrice}
            onChange={(e) => setMaxPrice(Number(e.target.value))}
            style={{ accentColor: 'hsl(var(--primary))' }}
            className="w-24"
          />
          <span className="text-xs font-semibold text-foreground whitespace-nowrap">
            Max {maxPrice}€/h
          </span>
        </div>
      </div>

      {/* Contractor cards */}
      <div className="space-y-3">
        {sorted.map((contractor) => {
          const isSelected = formData.selectedContractor?.name === contractor.name
          const isExpanded = expandedId === contractor.name

          return (
            <div
              key={contractor.name}
              className={`bg-card rounded-[var(--radius)] border transition cursor-pointer ${
                isSelected
                  ? 'bg-secondary/50 border-primary ring-2 ring-primary/10'
                  : 'border-border'
              }`}
            >
              {/* Header */}
              <div
                onClick={() => setExpandedId(isExpanded ? null : contractor.name)}
                className="p-4 flex gap-3 items-start"
              >
                {/* Avatar */}
                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  {contractor.initials}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex gap-2 items-center flex-wrap mb-1">
                    <span className="font-bold text-foreground">{contractor.name}</span>
                    {contractor.verified && (
                      <Badge className="text-[10px] bg-secondary text-primary border border-primary/30">
                        ✓ Preverjen
                      </Badge>
                    )}
                    {contractor.badge && (
                      <Badge className="text-[10px] bg-orange-50 text-orange-700 border border-orange-200">
                        {contractor.badge}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {contractor.specialty} · {contractor.years} let · {contractor.distance} km stran
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <div className="flex gap-0.5">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <svg
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < Math.floor(contractor.rating)
                              ? 'fill-accent'
                              : 'stroke-border fill-none'
                          }`}
                          viewBox="0 0 24 24"
                        >
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                        </svg>
                      ))}
                    </div>
                    <span className="text-xs font-semibold text-foreground">
                      {contractor.rating}
                    </span>
                    <span className="text-xs text-muted-foreground">({contractor.reviews})</span>
                  </div>
                </div>

                {/* Price */}
                <div className="text-right flex-shrink-0">
                  <p className="font-extrabold text-lg text-primary">
                    {contractor.priceMin}-{contractor.priceMax}€
                  </p>
                  <p className="text-xs text-muted-foreground">/uro</p>
                </div>
              </div>

              {/* Expanded section */}
              {isExpanded && (
                <div className="border-t border-border p-4 bg-secondary/30 space-y-3">
                  <div>
                    <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
                      Razpoložljivi termini:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {contractor.slots.map((slot, i) => (
                        <div
                          key={i}
                          className="bg-card border border-primary/40 text-primary text-xs font-semibold rounded-md px-3 py-1.5"
                        >
                          {slot}
                        </div>
                      ))}
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      onContractorSelect(contractor)
                    }}
                    className="w-full bg-primary text-primary-foreground rounded-[var(--radius)] py-2.5 font-bold hover:bg-primary/90 transition"
                  >
                    Izberi tega mojstra
                  </Button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Bottom nav */}
      <div className="flex gap-3 mt-8">
        <Button
          onClick={onBack}
          variant="ghost"
          className="flex-1"
        >
          ← Nazaj
        </Button>
        <Button
          onClick={onNext}
          disabled={!formData.selectedContractor}
          className="flex-1 bg-primary text-primary-foreground rounded-[var(--radius)] font-bold hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition"
        >
          Izberi termin →
        </Button>
      </div>
    </div>
  )
}

// ==================== STEP 3: SELECT DATE & TIME ====================

function Step3DateTime({
  formData,
  selectedContractor,
  onSlotSelect,
  onDaySelect,
  onTimeSelect,
  onBack,
  onNext,
}: {
  formData: FormState
  selectedContractor: Contractor | null
  onSlotSelect: (slot: string) => void
  onDaySelect: (day: number) => void
  onTimeSelect: (time: string) => void
  onBack: () => void
  onNext: () => void
}) {
  const [expandCalendar, setExpandCalendar] = useState(false)

  const times = ['8:00', '9:00', '10:00', '11:30', '13:00', '14:30', '16:00', '17:00']

  // Simple calendar for April 2024 (days 14-27)
  const calendarDays = Array.from({ length: 14 }, (_, i) => 16 + i)
  const availableDays = [16, 17, 18, 19, 21, 22, 23, 24]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Izberite termin</h2>
        <p className="text-sm text-muted-foreground">
          Izberite najprimernejši čas za vas
        </p>
      </div>

      {/* Quick slots */}
      {selectedContractor && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            ⚡ Najhitrejše možnosti
          </p>
          <div className="flex flex-col gap-2">
            {selectedContractor.slots.map((slot, i) => (
              <button
                key={i}
                onClick={() => onSlotSelect(slot)}
                className={`px-4 py-3 rounded-lg border font-semibold text-sm transition ${
                  formData.selectedSlot === slot
                    ? 'bg-secondary border-primary text-primary ring-2 ring-primary/10'
                    : 'bg-card border-border text-foreground hover:border-primary/50'
                }`}
              >
                {slot}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm p-4">
        <div className="flex items-center justify-between mb-4">
          <button className="text-muted-foreground hover:text-foreground">‹</button>
          <p className="font-bold text-foreground">APRIL 2024</p>
          <button className="text-muted-foreground hover:text-foreground">›</button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {['PON', 'TOR', 'SRE', 'ČET', 'PET', 'SOB', 'NED'].map((day) => (
            <div key={day} className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold text-center">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar days */}
        <div className="grid grid-cols-7 gap-1 mb-4">
          {calendarDays.map((day) => {
            const isAvailable = availableDays.includes(day)
            const isSelected = formData.selectedDay === day

            return (
              <button
                key={day}
                onClick={() => isAvailable && onDaySelect(day)}
                className={`p-2 rounded-lg text-sm font-semibold transition ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : isAvailable
                    ? 'bg-secondary text-primary hover:bg-primary hover:text-primary-foreground cursor-pointer'
                    : 'text-muted-foreground/40 cursor-default'
                }`}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>

      {/* Time slots */}
      {formData.selectedDay && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-3">
            Ura — {formData.selectedDay}. april
          </p>
          <div className="grid grid-cols-4 gap-2">
            {times.map((time) => (
              <button
                key={time}
                onClick={() => onTimeSelect(time)}
                className={`px-3 py-2.5 rounded-lg border font-semibold text-sm transition ${
                  formData.selectedTime === time
                    ? 'bg-secondary border-primary text-primary ring-2 ring-primary/10'
                    : 'bg-card border-border text-foreground hover:border-primary/50'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom nav */}
      <div className="flex gap-3 mt-8">
        <Button
          onClick={onBack}
          variant="ghost"
          className="flex-1"
        >
          ← Nazaj
        </Button>
        <Button
          onClick={onNext}
          disabled={!formData.selectedDay || !formData.selectedTime}
          className="flex-1 bg-primary text-primary-foreground rounded-[var(--radius)] font-bold hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition"
        >
          Potrdi termin →
        </Button>
      </div>
    </div>
  )
}

// ==================== STEP 4: SUMMARY ====================

function Step4Summary({
  formData,
  selectedContractor,
  onBack,
  onConfirm,
  isConfirming,
}: {
  formData: FormState
  selectedContractor: Contractor | null
  onBack: () => void
  onConfirm: () => void
  isConfirming: boolean
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-foreground mb-1">Povzetek vaše izbire</h2>
        <p className="text-sm text-muted-foreground">
          Preverite podatke in potrdite rezervacijo
        </p>
      </div>

      {/* Summary card */}
      <div className="bg-card border border-border rounded-[var(--radius)] shadow-sm overflow-hidden">
        {/* Contractor */}
        {selectedContractor && (
          <div className="p-4 border-b border-border flex gap-3 items-start">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {selectedContractor.initials}
            </div>
            <div className="flex-1">
              <div className="flex gap-2 items-center flex-wrap mb-1">
                <p className="font-bold text-foreground">{selectedContractor.name}</p>
                {selectedContractor.verified && (
                  <Badge className="text-[10px] bg-secondary text-primary border border-primary/30">
                    ✓ Preverjen
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedContractor.specialty}
              </p>
              <div className="flex items-center gap-1 mt-1">
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <svg
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.floor(selectedContractor.rating)
                          ? 'fill-accent'
                          : 'stroke-border fill-none'
                      }`}
                      viewBox="0 0 24 24"
                    >
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                  ))}
                </div>
                <span className="text-xs font-semibold text-foreground">
                  {selectedContractor.rating}
                </span>
              </div>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="font-extrabold text-xl text-primary">
                {selectedContractor.priceMin}-{selectedContractor.priceMax}€
              </p>
              <p className="text-xs text-muted-foreground">/uro</p>
            </div>
          </div>
        )}

        {/* Termin */}
        {formData.selectedDay && formData.selectedTime && (
          <div className="p-3 border-b border-border flex gap-3 items-center">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
              📅 TERMIN
            </p>
            <p className="font-semibold text-foreground">
              {formData.selectedDay}. april — {formData.selectedTime}
            </p>
          </div>
        )}

        {/* Lokacija */}
        <div className="p-3 border-b border-border flex gap-3 items-center">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">
            📍 LOKACIJA
          </p>
          <p className="font-semibold text-foreground">{formData.location}</p>
        </div>

        {/* Opis */}
        <div className="p-4">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">
            OPIS DELA
          </p>
          <div className="bg-muted rounded-md p-3 text-sm text-foreground/80 border border-border">
            {formData.description}
          </div>
        </div>
      </div>

      {/* AI confirm note */}
      <div className="bg-secondary border border-primary/30 rounded-[var(--radius)] p-3 flex gap-2 text-sm">
        <Lightbulb className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
        <p className="text-foreground">
          <span className="text-primary font-semibold">Našli smo izkušenega mojstra,</span> ki pride ta teden! Cena pregleda je med {selectedContractor?.priceMin} in {selectedContractor?.priceMax} EUR.
        </p>
      </div>

      {/* Bottom nav */}
      <div className="flex gap-3 mt-8">
        <Button
          onClick={onBack}
          variant="ghost"
          className="flex-1"
        >
          ← Nazaj
        </Button>
        <Button
          onClick={onConfirm}
          disabled={isConfirming}
          className="flex-1 bg-primary text-primary-foreground rounded-[var(--radius)] font-bold hover:bg-primary/90 disabled:bg-muted disabled:text-muted-foreground transition"
        >
          {isConfirming ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              Potvrđujem…
            </>
          ) : (
            'Potrdi rezervacijo ✓'
          )}
        </Button>
      </div>
    </div>
  )
}

// ==================== SUCCESS STATE ====================

function SuccessState({ selectedContractor, formData }: { selectedContractor: Contractor | null; formData: FormState }) {
  return (
    <div className="text-center space-y-6 py-8">
      <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center mx-auto ring-[10px] ring-secondary/80">
        <CheckCircle className="w-12 h-12 text-primary-foreground" />
      </div>

      <div>
        <h2 className="text-2xl font-extrabold text-foreground mb-2">Rezervacija potrjena!</h2>
        {selectedContractor && (
          <p className="text-sm text-foreground/80">
            <span className="font-bold text-primary">{selectedContractor.name}</span> pride {formData.selectedDay}. april ob {formData.selectedTime}
          </p>
        )}
      </div>

      <div className="bg-secondary border border-primary/30 rounded-[var(--radius)] p-4 text-left space-y-3">
        <p className="font-bold text-primary flex items-center gap-2">
          <span>📱</span> Kaj sledi?
        </p>
        <div className="space-y-2 text-sm text-foreground">
          <p className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">✓</span>
            <span>Mojster vas bo kontaktiral v 15 minutah</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">✓</span>
            <span>Potrditev po SMS in e-pošti</span>
          </p>
          <p className="flex items-start gap-2">
            <span className="text-primary font-bold mt-0.5">✓</span>
            <span>Ocenite izkušnjo po opravljenem delu</span>
          </p>
        </div>
      </div>

      <Button
        onClick={() => window.location.href = '/'}
        className="w-full bg-primary text-primary-foreground rounded-[var(--radius)] py-3 font-bold hover:bg-primary/90 transition"
      >
        Nazaj na prvo stran
      </Button>
    </div>
  )
}

// ==================== STEP INDICATOR ====================

function StepIndicator({ currentStep }: { currentStep: number }) {
  const steps = ['Opis težave', 'Izbor izvajalca', 'Termin', 'Potrditev']

  return (
    <div className="flex items-center justify-between mb-8">
      {steps.map((label, i) => (
        <div key={i} className="flex flex-col items-center flex-1">
          {/* Circle */}
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold transition mb-2 ${
              i < currentStep
                ? 'bg-primary text-primary-foreground'
                : i === currentStep
                ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                : 'bg-card border-2 border-border text-foreground'
            }`}
          >
            {i < currentStep ? '✓' : i + 1}
          </div>

          {/* Label */}
          <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground text-center px-2">
            {label}
          </p>

          {/* Connector line */}
          {i < steps.length - 1 && (
            <div
              className={`h-1 w-full mt-4 absolute ml-[60px] ${
                i < currentStep ? 'bg-primary' : 'bg-border'
              }`}
            />
          )}
        </div>
      ))}
    </div>
  )
}

// ==================== MAIN WIZARD COMPONENT ====================

export default function PovprasevanjePage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<FormState>({
    description: '',
    location: 'Ljubljana',
    selectedContractor: null,
    selectedSlot: '',
    selectedDay: null,
    selectedTime: null,
  })
  const [aiHint, setAiHint] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const debounceTimer = useRef<NodeJS.Timeout>()

  // Mock contractors data
  const contractors: Contractor[] = [
    {
      initials: 'MB',
      name: 'Marko Breznik',
      specialty: 'Vodovodar',
      years: 8,
      rating: 4.9,
      reviews: 127,
      distance: 2,
      priceMin: 45,
      priceMax: 60,
      badge: 'TOP',
      verified: false,
      slots: ['SRE 17. APR ob 10:00', 'ČET 18. APR ob 14:30'],
    },
    {
      initials: 'JK',
      name: 'Janez Kovač',
      specialty: 'Vodovodar',
      years: 12,
      rating: 5.0,
      reviews: 203,
      distance: 1,
      priceMin: 38,
      priceMax: 55,
      badge: 'PREVERJEN',
      verified: true,
      slots: ['SRE 17. APR ob 10:00', 'PET 19. APR ob 16:00'],
    },
    {
      initials: 'TP',
      name: 'Tomaž Petrič',
      specialty: 'Vodovodar',
      years: 5,
      rating: 4.7,
      reviews: 89,
      distance: 3,
      priceMin: 35,
      priceMax: 50,
      badge: null,
      verified: false,
      slots: ['ČET 18. APR ob 9:00', 'PET 19. APR ob 11:00'],
    },
  ]

  // AI Analysis debounced
  useEffect(() => {
    if (formData.description.length < 10) {
      setAiHint('')
      return
    }

    clearTimeout(debounceTimer.current)
    setIsAnalyzing(true)

    debounceTimer.current = setTimeout(async () => {
      try {
        const response = await fetch('/api/analyze-description', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: formData.description }),
        })
        const data = await response.json()
        setAiHint(data.hint || '')
      } catch (error) {
        console.log('[v0] Error analyzing description:', error)
        setAiHint('Opis je jasen — nadaljujte!')
      } finally {
        setIsAnalyzing(false)
      }
    }, 900)

    return () => clearTimeout(debounceTimer.current)
  }, [formData.description])

  const handleConfirm = async () => {
    setIsConfirming(true)
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000))
    setIsConfirming(false)
    setIsSuccess(true)
  }

  return (
    <>
      {/* Navbar */}
      <header className="bg-card border-b border-border h-[60px] px-6 flex justify-between items-center shadow-sm sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground font-black flex items-center justify-center text-[16px]">
            L
          </div>
          <span className="font-extrabold text-[17px]">
            Lift<span className="text-primary">GO</span>
          </span>
        </div>
        <div className="bg-secondary text-primary border border-primary/30 text-xs font-semibold px-3 py-1.5 rounded-full flex items-center gap-1">
          <Zap className="w-3 h-3" />
          Odziv v 2 urah
        </div>
      </header>

      {/* Hero strip */}
      <div className="bg-gradient-to-br from-primary to-primary/85 py-5 px-6 text-center">
        <p className="text-[11px] uppercase tracking-widest text-primary-foreground/70 mb-2">
          225+ aktivnih mojstrov po vsej Sloveniji
        </p>
        <h1 className="text-[22px] font-extrabold text-primary-foreground tracking-tight mb-1">
          Povejte, kaj potrebujete.
        </h1>
        <p className="text-[13px] text-primary-foreground/80">
          Mi najdemo mojstra v manj kot 2 urah.
        </p>
      </div>

      {/* Main content */}
      <div className="max-w-[540px] mx-auto mt-7 mb-10 px-4">
        <div className="bg-card rounded-2xl border border-border shadow-lg p-7">
          {!isSuccess ? (
            <>
              <StepIndicator currentStep={currentStep} />

              {/* Step 1 */}
              {currentStep === 0 && (
                <Step1Description
                  formData={formData}
                  onDescriptionChange={(desc) =>
                    setFormData({ ...formData, description: desc })
                  }
                  onLocationChange={(loc) =>
                    setFormData({ ...formData, location: loc })
                  }
                  onNext={() => setCurrentStep(1)}
                  aiHint={aiHint}
                  isAnalyzing={isAnalyzing}
                />
              )}

              {/* Step 2 */}
              {currentStep === 1 && (
                <Step2Contractor
                  formData={formData}
                  contractors={contractors}
                  onContractorSelect={(c) => {
                    setFormData({ ...formData, selectedContractor: c })
                    setCurrentStep(2)
                  }}
                  onBack={() => setCurrentStep(0)}
                  onNext={() => setCurrentStep(2)}
                />
              )}

              {/* Step 3 */}
              {currentStep === 2 && (
                <Step3DateTime
                  formData={formData}
                  selectedContractor={formData.selectedContractor}
                  onSlotSelect={(slot) =>
                    setFormData({ ...formData, selectedSlot: slot })
                  }
                  onDaySelect={(day) =>
                    setFormData({ ...formData, selectedDay: day })
                  }
                  onTimeSelect={(time) =>
                    setFormData({ ...formData, selectedTime: time })
                  }
                  onBack={() => setCurrentStep(1)}
                  onNext={() => setCurrentStep(3)}
                />
              )}

              {/* Step 4 */}
              {currentStep === 3 && (
                <Step4Summary
                  formData={formData}
                  selectedContractor={formData.selectedContractor}
                  onBack={() => setCurrentStep(2)}
                  onConfirm={handleConfirm}
                  isConfirming={isConfirming}
                />
              )}
            </>
          ) : (
            <SuccessState
              selectedContractor={formData.selectedContractor}
              formData={formData}
            />
          )}
        </div>
      </div>

      {/* Stats footer */}
      <div className="bg-card border-t border-border py-5 px-6 flex justify-center gap-8 flex-wrap">
        <div className="text-center">
          <p className="text-lg font-extrabold text-primary">5.000+</p>
          <p className="text-[11px] text-muted-foreground">Opravljenih del</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-extrabold text-primary">225+</p>
          <p className="text-[11px] text-muted-foreground">Aktivnih mojstrov</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-extrabold text-primary">98%</p>
          <p className="text-[11px] text-muted-foreground">Zadovoljnih strank</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-extrabold text-primary">4.9/5</p>
          <p className="text-[11px] text-muted-foreground">Povprečna ocena</p>
        </div>
      </div>
    </>
  )
}
