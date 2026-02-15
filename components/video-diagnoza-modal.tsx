'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Upload,
  Video,
  Link as LinkIcon,
  CheckCircle,
  Loader2,
  AlertCircle,
  Camera,
  X,
} from 'lucide-react'

const STORITVE = [
  'Vodovodna dela',
  'Elektro inštalacije',
  'Slikopleskarska dela',
  'Tesarska dela',
  'Keramičarska dela',
  'Fasaderska dela',
  'Krovska dela',
  'Mizarska dela',
  'Kleparska dela',
  'Drugo',
]

type UploadMethod = 'file' | 'record' | 'link' | null

interface VideoDiagnozaModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function VideoDiagnozaModal({ open, onOpenChange }: VideoDiagnozaModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoLink, setVideoLink] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    opis: '',
    storitev: '',
    ime: '',
    email: '',
    lokacija: '',
  })
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const resetModal = () => {
    setStep(1)
    setUploadMethod(null)
    setVideoFile(null)
    setVideoLink('')
    setRecordedBlob(null)
    setError('')
    setUploadProgress(0)
    setFormData({ opis: '', storitev: '', ime: '', email: '', lokacija: '' })
  }

  const handleClose = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
    }
    resetModal()
    onOpenChange(false)
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError('')
    
    // Preveri tip datoteke
    if (!file.type.startsWith('video/')) {
      setError('Prosimo naložite video datoteko (MP4, MOV, AVI).')
      return
    }

    // Preveri velikost (100MB)
    if (file.size > 100 * 1024 * 1024) {
      setError('Datoteka je prevelika. Max 100MB.')
      return
    }

    setVideoFile(file)
    setUploadMethod('file')
    setStep(2)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: true, 
        audio: true 
      })
      streamRef.current = stream
      
      const mediaRecorder = new MediaRecorder(stream)
      mediaRecorderRef.current = mediaRecorder
      
      const chunks: Blob[] = []
      mediaRecorder.ondataavailable = (e) => chunks.push(e.data)
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' })
        setRecordedBlob(blob)
        stream.getTracks().forEach(track => track.stop())
      }
      
      mediaRecorder.start()
      setIsRecording(true)
      setUploadMethod('record')
    } catch (err) {
      setError('Kamera ni dostopna. Prosimo naložite video iz naprave.')
    }
  }

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      setStep(2)
    }
  }

  const handleLinkSubmit = () => {
    if (!videoLink.trim()) {
      setError('Prosimo vnesite povezavo do videa.')
      return
    }
    
    // Osnovna validacija
    if (!videoLink.includes('youtube.com') && 
        !videoLink.includes('youtu.be') && 
        !videoLink.includes('drive.google.com')) {
      setError('Prosimo vnesite YouTube ali Google Drive povezavo.')
      return
    }

    setUploadMethod('link')
    setError('')
    setStep(2)
  }

  const validateStep2 = () => {
    const errors: string[] = []
    if (!formData.storitev) errors.push('storitev')
    if (!formData.ime.trim()) errors.push('ime')
    if (!formData.email.trim()) errors.push('email')
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError('Nepravilen e-poštni naslov')
      return false
    }
    if (!formData.lokacija.trim()) errors.push('lokacija')
    
    if (errors.length > 0) {
      setError('Prosimo izpolnite vsa obvezna polja')
      return false
    }
    return true
  }

  const handleSubmit = async () => {
    if (!validateStep2()) return

    setIsUploading(true)
    setError('')

    // Simuliraj upload z progress barjem
    for (let i = 0; i <= 100; i += 10) {
      await new Promise(resolve => setTimeout(resolve, 200))
      setUploadProgress(i)
    }

    setIsUploading(false)
    setStep(3)
  }

  const getVideoSource = () => {
    if (uploadMethod === 'file' && videoFile) {
      return URL.createObjectURL(videoFile)
    }
    if (uploadMethod === 'record' && recordedBlob) {
      return URL.createObjectURL(recordedBlob)
    }
    if (uploadMethod === 'link') {
      return videoLink
    }
    return null
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Progress Indicator */}
        <div className="mb-4 flex items-center justify-between">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center flex-1">
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                  step >= s
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {s}
              </div>
              {s < 3 && (
                <div
                  className={`mx-2 h-1 flex-1 rounded ${
                    step > s ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step 1: Izbira načina */}
        {step === 1 && (
          <>
            <DialogHeader>
              <DialogTitle>Kako želite poslati video diagnozo?</DialogTitle>
              <DialogDescription>
                Izberite način prenosa video posnetka vašega problema
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center gap-4 rounded-lg border-2 border-muted p-4 transition-all hover:border-primary hover:bg-primary/5"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Upload className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">Naloži obstoječi video</p>
                  <p className="text-sm text-muted-foreground">
                    Izberi datoteko iz naprave
                  </p>
                </div>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileSelect}
                className="hidden"
              />

              <button
                onClick={startRecording}
                disabled={isRecording}
                className="w-full flex items-center gap-4 rounded-lg border-2 border-muted p-4 transition-all hover:border-primary hover:bg-primary/5 disabled:opacity-50"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <Camera className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 text-left">
                  <p className="font-semibold">Posnimi zdaj</p>
                  <p className="text-sm text-muted-foreground">
                    Uporabi kamero za snemanje
                  </p>
                </div>
              </button>

              {isRecording && (
                <div className="rounded-lg border bg-destructive/10 p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-destructive" />
                      <p className="font-semibold text-destructive">Snemanje...</p>
                    </div>
                    <Button onClick={stopRecording} variant="destructive" size="sm">
                      Ustavi
                    </Button>
                  </div>
                </div>
              )}

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">
                    Ali
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-start gap-4 rounded-lg border-2 border-muted p-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                    <LinkIcon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="font-semibold">Prilepi YouTube/Google Drive link</p>
                    <Input
                      placeholder="https://youtube.com/watch?v=..."
                      value={videoLink}
                      onChange={(e) => setVideoLink(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleLinkSubmit()}
                    />
                    <Button 
                      onClick={handleLinkSubmit} 
                      size="sm" 
                      className="w-full"
                      disabled={!videoLink.trim()}
                    >
                      Nadaljuj
                    </Button>
                  </div>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              <p className="text-center text-xs text-muted-foreground">
                Max 2 minuti, do 100MB. MP4, MOV, AVI
              </p>
            </div>
          </>
        )}

        {/* Step 2: Dodaj opis */}
        {step === 2 && (
          <>
            <DialogHeader>
              <DialogTitle>Opišite problem</DialogTitle>
              <DialogDescription>
                Pomagajte mojstru razumeti situacijo
              </DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4">
              {/* Video Preview */}
              {uploadMethod !== 'link' && getVideoSource() && (
                <div className="relative aspect-video overflow-hidden rounded-lg bg-muted">
                  <video
                    src={getVideoSource()!}
                    controls
                    className="h-full w-full object-contain"
                  />
                  <button
                    onClick={() => {
                      setStep(1)
                      setVideoFile(null)
                      setRecordedBlob(null)
                    }}
                    className="absolute right-2 top-2 rounded-full bg-background/80 p-1 hover:bg-background"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              {uploadMethod === 'link' && (
                <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
                  <LinkIcon className="h-4 w-4 text-muted-foreground" />
                  <p className="flex-1 truncate text-sm">{videoLink}</p>
                  <button
                    onClick={() => setStep(1)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="opis">
                  Opišite problem <span className="text-muted-foreground">(neobvezno)</span>
                </Label>
                <Textarea
                  id="opis"
                  placeholder="npr. Pipa kaplja od včeraj, zvok pri odtoku, voda na tleh..."
                  value={formData.opis}
                  onChange={(e) => setFormData({ ...formData, opis: e.target.value })}
                  rows={3}
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">
                  {formData.opis.length} / 500 znakov
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="storitev">Kategorija storitve *</Label>
                <Select value={formData.storitev} onValueChange={(val) => setFormData({ ...formData, storitev: val })}>
                  <SelectTrigger id="storitev">
                    <SelectValue placeholder="-- Izberi storitev --" />
                  </SelectTrigger>
                  <SelectContent>
                    {STORITVE.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ime">Vaše ime *</Label>
                  <Input
                    id="ime"
                    placeholder="Janez Novak"
                    value={formData.ime}
                    onChange={(e) => setFormData({ ...formData, ime: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">E-poštni naslov *</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="janez@gmail.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="lokacija">Poštna številka ali kraj *</Label>
                <Input
                  id="lokacija"
                  placeholder="1000 Ljubljana"
                  value={formData.lokacija}
                  onChange={(e) => setFormData({ ...formData, lokacija: e.target.value })}
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Nalaganje...</span>
                    <span className="font-semibold">{uploadProgress}%</span>
                  </div>
                  <Progress value={uploadProgress} />
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1"
                  disabled={isUploading}
                >
                  Nazaj
                </Button>
                <Button
                  onClick={handleSubmit}
                  className="flex-1 gap-2"
                  disabled={isUploading}
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Pošiljam...
                    </>
                  ) : (
                    'Pošlji diagnozo'
                  )}
                </Button>
              </div>
            </div>
          </>
        )}

        {/* Step 3: Potrditev */}
        {step === 3 && (
          <div className="flex flex-col items-center gap-6 py-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 animate-in zoom-in">
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>

            <div className="space-y-2">
              <DialogTitle className="text-2xl">Video diagnoza poslana!</DialogTitle>
              <DialogDescription className="text-base">
                Preverjen mojster bo pregledal vaš video in vam odgovoril v roku{' '}
                <strong>2 ur</strong> na <strong>{formData.email}</strong>.
                <br />
                Preverite tudi mapo Spam.
              </DialogDescription>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
              <span className="text-sm font-medium">
                Mojster pregleduje... ⏱ ~2 uri
              </span>
            </div>

            <div className="flex w-full flex-col gap-2 sm:flex-row">
              <Button onClick={handleClose} variant="outline" className="flex-1">
                Zapri
              </Button>
              <Button onClick={handleClose} className="flex-1" asChild>
                <a href="/">Oddaj tudi uradno povpraševanje →</a>
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
