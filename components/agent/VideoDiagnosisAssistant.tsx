'use client'

import { useState, useRef } from 'react'
import { Loader2, Camera, Upload, AlertTriangle, CheckCircle, X, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

type Diagnosis = {
  canDiagnose: boolean
  problemDescription: string
  severity: 'nizka' | 'srednja' | 'visoka'
  suggestedCategories: string[]
  recommendedExperts: string[]
  urgency: 'normalno' | 'kmalu' | 'nujno'
  descriptionForMaster: string
  descriptionForCustomer: string
  suggestedTitle: string
  warnings: string[]
  additionalPhotosNeeded: string[]
}

const SEVERITY_COLOR: Record<string, string> = {
  nizka: 'bg-green-100 text-green-700',
  srednja: 'bg-amber-100 text-amber-700',
  visoka: 'bg-red-100 text-red-700',
}

const URGENCY_LABEL: Record<string, string> = {
  normalno: '🟢 Normalno',
  kmalu: '🟡 Kmalu',
  nujno: '🔴 Nujno',
}

interface Props {
  onApply?: (description: string, title: string, category?: string, urgency?: string) => void
}

export function VideoDiagnosisAssistant({ onApply }: Props) {
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [context, setContext] = useState('')
  const [loading, setLoading] = useState(false)
  const [diagnosis, setDiagnosis] = useState<Diagnosis | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setDiagnosis(null)
    setError(null)

    // Preview
    const reader = new FileReader()
    reader.onload = (ev) => setPreview(ev.target?.result as string)
    reader.readAsDataURL(f)
  }

  const analyze = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setDiagnosis(null)

    const formData = new FormData()
    formData.append('file', file)
    if (context.trim()) formData.append('context', context)

    try {
      const res = await fetch('/api/agent/video-diagnosis', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Napaka')
      setDiagnosis(data.diagnosis)
    } catch (e: any) {
      setError(e.message || 'Napaka pri analizi.')
    } finally {
      setLoading(false)
    }
  }

  const clearFile = () => {
    setFile(null)
    setPreview(null)
    setDiagnosis(null)
    setError(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="rounded-lg border border-violet-200 bg-violet-50/50">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 text-sm font-medium text-violet-700 hover:bg-violet-50 rounded-lg transition-colors"
      >
        <span className="flex items-center gap-2">
          <Camera className="w-4 h-4" />
          Video diagnoza
          <Badge className="bg-violet-100 text-violet-600 border-violet-200 text-xs px-1.5 py-0">PRO</Badge>
        </span>
        <span className="text-xs text-violet-500">Pošljite sliko za AI analizo</span>
      </button>

      {open && (
        <div className="p-4 pt-0 space-y-4">
          <p className="text-xs text-violet-600">
            Fotografirajte problem (puščajoča cev, razpoka, električna napaka...) in AI bo pripravil opis za mojstra.
          </p>

          {/* File upload */}
          {!preview ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-violet-200 rounded-lg p-6 text-center cursor-pointer hover:border-violet-400 hover:bg-violet-50 transition-colors"
            >
              <Upload className="w-8 h-8 text-violet-400 mx-auto mb-2" />
              <p className="text-sm text-violet-600 font-medium">Kliknite za nalaganje slike</p>
              <p className="text-xs text-slate-400 mt-1">JPEG, PNG, WebP — max 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          ) : (
            <div className="relative">
              <img
                src={preview}
                alt="Naložena slika"
                className="w-full max-h-48 object-cover rounded-lg border border-violet-200"
              />
              <button
                type="button"
                onClick={clearFile}
                className="absolute top-2 right-2 bg-white rounded-full p-1 shadow border border-slate-200 hover:bg-red-50"
              >
                <X className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          )}

          {/* Context input */}
          {preview && !diagnosis && (
            <div className="space-y-2">
              <input
                value={context}
                onChange={(e) => setContext(e.target.value)}
                placeholder="Dodatni opis (neobvezno): npr. 'cev v kopalnici pušča že 2 dni'"
                className="w-full text-sm border border-violet-200 rounded-lg px-3 py-2 bg-white focus:outline-none focus:border-violet-400"
              />
              <Button
                type="button"
                onClick={analyze}
                disabled={loading}
                className="w-full bg-violet-600 hover:bg-violet-700"
                size="sm"
              >
                {loading ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analiziram sliko...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> Analiziraj s AI</>
                )}
              </Button>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {diagnosis && (
            <div className="space-y-3">
              {!diagnosis.canDiagnose ? (
                <Card className="p-3 bg-amber-50 border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-700">Ni mogoče diagnosticirati</p>
                      <p className="text-xs text-amber-600">{diagnosis.problemDescription}</p>
                    </div>
                  </div>
                  {diagnosis.additionalPhotosNeeded?.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-amber-700">Prosimo pošljite tudi:</p>
                      {diagnosis.additionalPhotosNeeded.map((item, i) => (
                        <p key={i} className="text-xs text-amber-600">• {item}</p>
                      ))}
                    </div>
                  )}
                </Card>
              ) : (
                <>
                  {/* Severity + urgency */}
                  <div className="flex gap-2 flex-wrap">
                    <Badge className={SEVERITY_COLOR[diagnosis.severity] || 'bg-slate-100 text-slate-600'}>
                      Resnost: {diagnosis.severity}
                    </Badge>
                    <Badge className="bg-slate-100 text-slate-600">
                      {URGENCY_LABEL[diagnosis.urgency] || diagnosis.urgency}
                    </Badge>
                  </div>

                  {/* Warnings */}
                  {diagnosis.warnings?.length > 0 && diagnosis.warnings[0] && (
                    <div className="rounded-lg bg-amber-50 border border-amber-200 p-2">
                      {diagnosis.warnings.map((w, i) => (
                        <div key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                          <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Description for customer */}
                  <Card className="p-3 bg-white border-slate-200">
                    <p className="text-xs font-semibold text-slate-500 mb-1">Opis problema</p>
                    <p className="text-sm text-slate-700">{diagnosis.descriptionForCustomer}</p>
                  </Card>

                  {/* Categories + experts */}
                  {diagnosis.suggestedCategories?.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-slate-600 mb-1">Priporočene kategorije:</p>
                      <div className="flex gap-1 flex-wrap">
                        {diagnosis.suggestedCategories.map((cat, i) => (
                          <Badge key={i} variant="outline" className="text-xs">{cat}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Additional photos needed */}
                  {diagnosis.additionalPhotosNeeded?.length > 0 && (
                    <div className="text-xs text-slate-500">
                      <span className="font-medium">Za boljšo oceno pošljite:</span>
                      {diagnosis.additionalPhotosNeeded.map((item, i) => (
                        <span key={i}> • {item}</span>
                      ))}
                    </div>
                  )}

                  {/* Apply button */}
                  {onApply && (
                    <Button
                      type="button"
                      size="sm"
                      onClick={() =>
                        onApply(
                          diagnosis.descriptionForCustomer,
                          diagnosis.suggestedTitle,
                          diagnosis.suggestedCategories?.[0],
                          diagnosis.urgency
                        )
                      }
                      className="w-full bg-violet-600 hover:bg-violet-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Uporabi za povpraševanje
                    </Button>
                  )}
                </>
              )}

              <button
                type="button"
                onClick={clearFile}
                className="text-xs text-slate-400 hover:text-slate-600 w-full text-center"
              >
                Naloži drugo sliko
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
