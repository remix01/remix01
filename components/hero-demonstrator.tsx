'use client'

import { useEffect, useRef, useState } from 'react'

// ── TYPER HOOK ──────────────────────────────────────────────────
function useTyper(words: string[], speed = 80) {
  const [text, setText] = useState('')
  const state = useRef({ wordIdx: 0, charIdx: 0, typing: true })

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    function step() {
      const { wordIdx, charIdx, typing } = state.current
      const word = words[wordIdx]
      if (typing) {
        if (charIdx < word.length) {
          state.current.charIdx++
          setText(word.slice(0, state.current.charIdx))
          timeout = setTimeout(step, speed + Math.random() * 40)
        } else {
          state.current.typing = false
          timeout = setTimeout(step, 900)
        }
      } else {
        if (charIdx > 0) {
          state.current.charIdx--
          setText(word.slice(0, state.current.charIdx))
          timeout = setTimeout(step, 35)
        } else {
          state.current.typing = true
          state.current.wordIdx = (wordIdx + 1) % words.length
          timeout = setTimeout(step, 300)
        }
      }
    }
    timeout = setTimeout(step, 400)
    return () => clearTimeout(timeout)
  }, [words, speed])

  return text
}

// ── TYPES ───────────────────────────────────────────────────────
type Scene = 'form' | 'offers' | 'success'

interface OfferCard {
  initials: string
  name: string
  spec: string
  years: number
  rating: number
  price: number
  color: string
  highlight?: boolean
}

// ── CONSTANTS ────────────────────────────────────────────────────
const OFFERS: OfferCard[] = [
  { initials: 'MB', name: 'Marko Breznik', spec: 'Vodovodar',
    years: 8, rating: 4.9, price: 45,
    color: 'from-teal-600 to-teal-700' },
  { initials: 'JK', name: 'Janez Kovač', spec: 'Vodovodar',
    years: 12, rating: 5.0, price: 38,
    color: 'from-orange-500 to-orange-600', highlight: true },
  { initials: 'TP', name: 'Tomaž Petric', spec: 'Vodovodar',
    years: 5, rating: 4.7, price: 52,
    color: 'from-indigo-500 to-indigo-600' },
]

const STEP_DURATION = 3200   // ms per scene
const TOTAL_DURATION = 10400 // full loop

// ── MAIN COMPONENT ───────────────────────────────────────────────
export default function HeroDemonstrator() {
  const [scene, setScene] = useState<Scene>('form')
  const [progress, setProgress] = useState(0)
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)

  // Scene 1 states
  const typedText = useTyper(['Popravilo pipe...', 'Puščanje pipe...', 'Vodovodar Ljubljana...'])
  const [formSent, setFormSent] = useState(false)

  // Scene 2 states
  const [visibleOffers, setVisibleOffers] = useState<number[]>([])
  const [offerCount, setOfferCount] = useState(0)

  // Scene 3 states
  const [ringFilled, setRingFilled] = useState(false)
  const [checkPop, setCheckPop] = useState(false)
  const [litStars, setLitStars] = useState(0)
  const [showRating, setShowRating] = useState(false)
  const [showRepeat, setShowRepeat] = useState(false)

  // Info rows
  const [infoVisible, setInfoVisible] = useState([false, false, false])

  function resetAll() {
    setScene('form')
    setStep(0)
    setFormSent(false)
    setVisibleOffers([])
    setOfferCount(0)
    setRingFilled(false)
    setCheckPop(false)
    setLitStars(0)
    setShowRating(false)
    setShowRepeat(false)
    setInfoVisible([false, false, false])
  }

  useEffect(() => {
    if (paused) return

    const startTime = performance.now()
    let rafId: number

    const timers: ReturnType<typeof setTimeout>[] = []

    function schedule(fn: () => void, delay: number) {
      timers.push(setTimeout(fn, delay))
    }

    function loop() {
      // ── SCENE 1: Form ──────────────────────────
      setScene('form'); setStep(0)
      schedule(() => setInfoVisible(v => [true, v[1], v[2]]), 500)
      schedule(() => setInfoVisible(v => [v[0], true, v[2]]), 900)
      schedule(() => setInfoVisible(v => [v[0], v[1], true]), 1300)
      schedule(() => setFormSent(true), 2400)

      // ── SCENE 2: Offers ────────────────────────
      const S2 = STEP_DURATION + 400
      schedule(() => { setScene('offers'); setStep(1); setFormSent(false) }, S2)
      schedule(() => { setVisibleOffers([0]); setOfferCount(1) }, S2 + 300)
      schedule(() => { setVisibleOffers([0,1]); setOfferCount(2) }, S2 + 900)
      schedule(() => { setVisibleOffers([0,1,2]); setOfferCount(3) }, S2 + 1500)

      // ── SCENE 3: Success ───────────────────────
      const S3 = STEP_DURATION * 2 + 400
      schedule(() => { setScene('success'); setStep(2); setVisibleOffers([]) }, S3)
      schedule(() => setRingFilled(true), S3 + 200)
      schedule(() => setCheckPop(true), S3 + 1300)
      schedule(() => setShowRating(true), S3 + 1500)
      schedule(() => setLitStars(1), S3 + 1700)
      schedule(() => setLitStars(2), S3 + 2000)
      schedule(() => setLitStars(3), S3 + 2300)
      schedule(() => setLitStars(4), S3 + 2600)
      schedule(() => setLitStars(5), S3 + 2900)
      schedule(() => setShowRepeat(true), S3 + 3200)

      // ── RESET ──────────────────────────────────
      schedule(() => resetAll(), TOTAL_DURATION - 100)
    }

    loop()

    // Progress bar
    function tick() {
      const elapsed = (performance.now() - startTime) % TOTAL_DURATION
      setProgress((elapsed / TOTAL_DURATION) * 100)
      rafId = requestAnimationFrame(tick)
    }
    rafId = requestAnimationFrame(tick)

    return () => {
      cancelAnimationFrame(rafId)
      timers.forEach(clearTimeout)
    }
  }, [paused])

  const stepLabels = ['Oddaj povpraševanje', 'Prejmi ponudbe', 'Oceni mojstra']
  const stepColors = ['text-teal-400', 'text-orange-400', 'text-green-400']

  return (
    <div
      className="relative select-none"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Phone mockup */}
      <div className="w-[220px] mx-auto bg-slate-700 rounded-[28px] p-3 shadow-2xl
                      ring-1 ring-white/10">

        {/* Step indicator */}
        <div className="flex items-center gap-2 mb-3 px-1">
          {[0,1,2].map(i => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all duration-500
                ${i === step ? 'flex-1 max-w-[28px] bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.6)]'
                  : i < step ? 'w-2 bg-teal-700'
                  : 'w-2 bg-slate-600'}`}
            />
          ))}
          <span className={`text-[10px] font-semibold ml-1 transition-colors duration-300 ${stepColors[step]}`}>
            {stepLabels[step]}
          </span>
        </div>

        {/* Screen */}
        <div className="bg-white rounded-[20px] overflow-hidden h-[260px] relative">

          {/* ── SCENE 1: Form ─────────────────────── */}
          <div className={`absolute inset-0 transition-all duration-400
            ${scene === 'form' ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-3 pointer-events-none'}`}>
            <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-3 py-4 pt-5">
              <p className="text-[8px] font-bold uppercase tracking-widest text-teal-200 mb-1">LiftGO</p>
              <h3 className="text-white text-[11px] font-bold leading-snug">
                Kaj potrebujete<br/>popraviti?
              </h3>
            </div>
            <div className="px-3 py-2 space-y-2">
              <div>
                <p className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Storitev</p>
                <div className="bg-slate-50 rounded-md px-2 h-[22px] flex items-center
                                ring-1.5 ring-teal-400 shadow-[0_0_0_3px_rgba(20,184,166,0.1)]
                                text-[9px] text-slate-700 font-medium">
                  {typedText}
                  <span className="inline-block w-[1.5px] h-[10px] bg-teal-500 ml-[1px] animate-pulse rounded" />
                </div>
              </div>
              <div>
                <p className="text-[8px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Lokacija</p>
                <div className="bg-slate-50 rounded-md px-2 h-[22px] flex items-center
                                text-[9px] text-slate-600 font-medium ring-1 ring-slate-200">
                  Ljubljana
                </div>
              </div>

              {!formSent ? (
                <div className="relative bg-teal-600 rounded-lg py-[7px] text-center
                                text-white text-[9px] font-bold shadow-[0_4px_12px_rgba(13,148,136,0.4)]
                                overflow-hidden mt-1">
                  <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent
                                   -translate-x-full animate-shimmer" />
                  Oddajte povpraševanje →
                </div>
              ) : (
                <div className="flex items-center justify-center gap-1.5 bg-green-50 rounded-lg py-[6px]
                                border border-green-200 text-green-700 text-[8px] font-bold
                                animate-in zoom-in-90 duration-300">
                  <span className="text-green-500 text-sm">✓</span>
                  Povpraševanje poslano!
                </div>
              )}
            </div>
          </div>

          {/* ── SCENE 2: Offers ──────────────────── */}
          <div className={`absolute inset-0 transition-all duration-400
            ${scene === 'offers' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}>
            <div className="bg-slate-50 border-b border-slate-200 px-3 py-2.5 pt-4">
              <p className="text-[9px] font-bold text-slate-800">Prispele ponudbe</p>
              <p className="text-[8px] text-slate-500">za: Popravilo puščanja pipe</p>
              <span className={`inline-flex items-center gap-1 mt-1 rounded-full px-2 py-0.5
                               text-[8px] font-bold text-white transition-colors duration-500
                               ${offerCount === 3 ? 'bg-green-500' : 'bg-teal-500'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-white/80 animate-pulse" />
                {offerCount === 0 ? '0 mojstrov odgovarja...'
                  : offerCount === 1 ? '1 mojster odgovarja...'
                  : offerCount === 2 ? '2 mojstra odgovarjata...'
                  : '3 mojstri odgovorili'}
              </span>
            </div>
            <div className="px-3 py-2 space-y-1.5">
              {OFFERS.map((offer, i) => (
                <div key={i}
                  className={`flex items-center gap-2 bg-white rounded-xl p-2 shadow-sm
                    transition-all duration-500
                    ${offer.highlight ? 'ring-1.5 ring-teal-400 shadow-[0_0_0_3px_rgba(20,184,166,0.1)]' : 'ring-1 ring-slate-200'}
                    ${visibleOffers.includes(i) ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-5'}`}>
                  <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${offer.color}
                                   flex items-center justify-center text-white text-[9px] font-bold flex-shrink-0`}>
                    {offer.initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-bold text-slate-800">{offer.name}</p>
                    <p className="text-[7.5px] text-slate-500">{offer.spec} · {offer.years} let</p>
                    <div className="flex items-center gap-0.5 mt-0.5">
                      {'★★★★★'.split('').map((s, si) => (
                        <span key={si} className={`text-[7px]
                          ${si < Math.floor(offer.rating) ? 'text-orange-400' : 'text-slate-300'}`}>
                          {s}
                        </span>
                      ))}
                      <span className="text-[6.5px] text-slate-400 ml-0.5">{offer.rating}</span>
                    </div>
                    <span className="inline-flex items-center gap-0.5 bg-green-50 text-green-700
                                     rounded text-[6.5px] font-bold px-1 py-0.5">
                      ✓ Preverjen
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] font-black text-teal-700">{offer.price}€</p>
                    <p className="text-[7px] text-slate-400">/uro</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── SCENE 3: Success ─────────────────── */}
          <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 pt-6
                          bg-gradient-to-b from-green-50 to-white transition-all duration-400
            ${scene === 'success' ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none'}`}>

            {/* Ring */}
            <div className="relative w-[68px] h-[68px] mb-3">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 68 68">
                <circle cx="34" cy="34" r="29" fill="none" stroke="#dcfce7" strokeWidth="4"/>
                <circle cx="34" cy="34" r="29" fill="none" stroke="#22c55e" strokeWidth="4"
                  strokeLinecap="round"
                  style={{
                    strokeDasharray: 182,
                    strokeDashoffset: ringFilled ? 0 : 182,
                    transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)',
                    filter: 'drop-shadow(0 0 6px rgba(34,197,94,0.5))'
                  }}
                />
              </svg>
              <div className={`absolute inset-0 flex items-center justify-center
                              text-white text-base font-bold
                              bg-green-500 rounded-full m-[17px]
                              shadow-[0_4px_14px_rgba(34,197,94,0.5)]
                              transition-all duration-500
                              ${checkPop ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}>
                ✓
              </div>
            </div>

            <p className="text-[11px] font-black text-slate-800 mb-1">Delo opravljeno!</p>
            <p className="text-[8.5px] text-slate-500 text-center leading-relaxed mb-2">
              Janez Kovač je dokončal<br/>popravilo puščanja
            </p>

            {/* Rating */}
            <div className={`flex items-center gap-1.5 bg-white rounded-xl px-3 py-1.5
                            ring-1 ring-slate-200 shadow-sm mb-2
                            transition-all duration-500
                            ${showRating ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
              <div className="flex gap-0.5">
                {[1,2,3,4,5].map(n => (
                  <span key={n}
                    className={`text-[14px] transition-all duration-300
                      ${n <= litStars ? 'text-orange-400 scale-110' : 'text-slate-200'}`}
                    style={{ transitionDelay: `${n * 80}ms` }}>
                    ★
                  </span>
                ))}
              </div>
              <span className="text-[9px] font-bold text-slate-700">5.0 / odlično!</span>
            </div>

            <div className={`flex items-center gap-1.5 bg-teal-50 border border-teal-200
                            rounded-lg px-2.5 py-1 text-[8px] font-semibold text-teal-700
                            transition-opacity duration-500
                            ${showRepeat ? 'opacity-100' : 'opacity-0'}`}>
              🔄 Shranjeno za naslednjič
            </div>
          </div>

        </div>
        {/* /screen */}
      </div>

      {/* Info rows below phone */}
      <div className="mt-5 space-y-2.5">
        {[
          { icon: '📝', color: 'bg-teal-500/15', title: 'Brezplačno v 30 sekundah', sub: 'Brez registracije, brez obveznosti' },
          { icon: '⚡', color: 'bg-orange-500/15', title: 'Odziv v manj kot 2 urah', sub: '225+ preverjenih mojstrov čaka' },
          { icon: '⭐', color: 'bg-green-500/15', title: '4.9/5 povprečna ocena', sub: '1.200+ verificiranih recenzij' },
        ].map((row, i) => (
          <div key={i} className={`flex items-center gap-3 transition-all duration-500
                                   ${infoVisible[i] ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-3'}`}
               style={{ transitionDelay: `${i * 100}ms` }}>
            <div className={`w-9 h-9 ${row.color} rounded-xl flex items-center justify-center
                            text-base flex-shrink-0`}>
              {row.icon}
            </div>
            <div>
              <p className="text-[12px] font-bold text-white leading-tight">{row.title}</p>
              <p className="text-[10px] text-white/50 mt-0.5">{row.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-0.5 bg-white/10 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-teal-400 to-orange-400 rounded-full
                     shadow-[0_0_8px_rgba(45,212,191,0.5)] transition-none"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}
