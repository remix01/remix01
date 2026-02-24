'use client'

import { useState, useRef } from 'react'
import { Upload, Video, Image as ImageIcon, FileText, Trash2, Eye, X, Zap, Loader2, Camera } from 'lucide-react'
import { validateFile, generateFilePath, uploadWithProgress } from '@/lib/storage'
import { toast } from 'sonner'

interface UploadedFile {
  id: string
  file: File
  url: string
  type: 'video' | 'image' | 'document'
  progress: number
}

interface AIAnalysis {
  category: string
  complexity: 'low' | 'medium' | 'high'
  note: string
}

export function VideoDiagnozaUpload() {
  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)
  const imageInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)
  const dropzoneRef = useRef<HTMLDivElement>(null)

  const handleFileSelect = async (selectedFiles: FileList | null) => {
    if (!selectedFiles) return

    const newFiles: UploadedFile[] = []
    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i]
      const validation = validateFile(file)

      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`)
        continue
      }

      const fileType = file.type.startsWith('video/')
        ? 'video'
        : file.type.startsWith('image/')
          ? 'image'
          : 'document'

      const uploadedFile: UploadedFile = {
        id: Math.random().toString(36).substring(7),
        file,
        url: URL.createObjectURL(file),
        type: fileType,
        progress: 0,
      }

      newFiles.push(uploadedFile)
    }

    setFiles((prev) => [...prev, ...newFiles])

    // Upload new files
    for (const uploadedFile of newFiles) {
      await uploadFileToStorage(uploadedFile)
    }

    // Simulate AI analysis after upload
    if (newFiles.length > 0) {
      setAnalyzing(true)
      setTimeout(() => {
        setAiAnalysis({
          category: 'Vodovodne instalacije',
          complexity: 'medium',
          note: 'Na posnetku zaznano puščanje pri priključku. Priporočamo vodovodni servis.',
        })
        setAnalyzing(false)
      }, 2000)
    }
  }

  const uploadFileToStorage = async (uploadedFile: UploadedFile) => {
    setUploading(true)
    const userId = 'user-123' // Replace with actual user ID
    const filePath = generateFilePath(userId, uploadedFile.file.name)
    const bucket = 'video-diagnoze'

    try {
      const { url, error } = await uploadWithProgress(bucket, filePath, uploadedFile.file, (percent) => {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, progress: percent }
              : f
          )
        )
      })

      if (error) {
        toast.error(`Napaka pri nalaganju: ${error}`)
        setFiles((prev) => prev.filter((f) => f.id !== uploadedFile.id))
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === uploadedFile.id
              ? { ...f, url: url || f.url, progress: 100 }
              : f
          )
        )
        toast.success(`${uploadedFile.file.name} uspešno naloženo`)
      }
    } catch (err) {
      toast.error('Napaka pri nalaganju datoteke')
      setFiles((prev) => prev.filter((f) => f.id !== uploadedFile.id))
    } finally {
      setUploading(false)
    }
  }

  const deleteFile = (id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
    toast.success('Datoteka izbrisana')
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelect(e.dataTransfer.files)
  }

  const getComplexityDots = (complexity: string) => {
    const dots = complexity === 'low' ? 1 : complexity === 'medium' ? 2 : 3
    return Array.from({ length: 3 }).map((_, i) => (
      <div
        key={i}
        className={`w-2 h-2 rounded-full ${i < dots ? 'bg-primary' : 'bg-muted'}`}
      />
    ))
  }

  return (
    <div className="bg-card border border-border rounded-2xl shadow-md overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-br from-primary to-primary/80 p-5 text-primary-foreground">
        <div className="relative flex items-start gap-4">
          <div className="w-8 h-8 bg-primary-foreground/20 rounded-xl p-1.5 flex-shrink-0">
            <Video className="w-full h-full" />
          </div>
          <div className="flex-1">
            <h2 className="font-bold text-xl">Brezplačna Video Diagnoza</h2>
            <p className="text-sm text-primary-foreground/80 mt-1">
              Pošljite video ali foto težave — mojster pride pripravljen
            </p>
          </div>
          <div className="absolute top-5 right-5 bg-accent text-accent-foreground text-[10px] font-bold px-2.5 py-1 rounded-full">
            NOVO
          </div>
        </div>
      </div>

      {/* Upload Zone */}
      <div className="p-5">
        <div
          ref={dropzoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-secondary ring-2 ring-primary/20'
              : 'border-border bg-muted/50 hover:border-primary hover:bg-secondary/50'
          }`}
        >
          <Upload className="w-10 h-10 text-muted-foreground/50 mx-auto mb-3" />
          <p className="font-semibold text-foreground">Povlecite datoteko sem</p>
          <p className="text-muted-foreground text-sm my-1">ali</p>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-primary text-primary-foreground rounded-[var(--radius)] px-4 py-2 text-sm font-semibold hover:bg-primary/90 transition-colors"
          >
            Izberite datoteko
          </button>
          <p className="text-xs text-muted-foreground mt-3">
            📹 Video: MP4, MOV, AVI (max 100MB) • 📷 Foto: JPG, PNG, WEBP (max 10MB)
          </p>
        </div>

        {/* File type quick-select chips */}
        <div className="flex gap-2 flex-wrap mt-4">
          <button
            onClick={() => videoInputRef.current?.click()}
            className="bg-card border border-border rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary hover:bg-secondary cursor-pointer transition-colors"
          >
            📹 Posnetek problema
          </button>
          <button
            onClick={() => imageInputRef.current?.click()}
            className="bg-card border border-border rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary hover:bg-secondary cursor-pointer transition-colors"
          >
            📷 Fotografija
          </button>
          <button
            onClick={() => cameraInputRef.current?.click()}
            className="bg-card border border-border rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary hover:bg-secondary cursor-pointer transition-colors"
          >
            🎥 Živi posnetek
          </button>
          <button
            onClick={() => documentInputRef.current?.click()}
            className="bg-card border border-border rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-primary hover:text-primary hover:bg-secondary cursor-pointer transition-colors"
          >
            📄 Dokument
          </button>
        </div>

        {/* Hidden file inputs */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="video/*,image/*,.pdf,.doc,.docx"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <input
          ref={videoInputRef}
          type="file"
          accept="video/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <input
          ref={imageInputRef}
          type="file"
          accept="image/*"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />
        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.doc,.docx"
          onChange={(e) => handleFileSelect(e.target.files)}
          className="hidden"
        />

        {/* Upload progress */}
        {uploading && files.length > 0 && (
          <div className="mt-4 space-y-3">
            {files.map((file) => (
              file.progress < 100 && (
                <div key={file.id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="text-sm text-foreground font-medium truncate">{file.file.name}</span>
                      <span className="text-xs text-primary font-semibold">{file.progress}%</span>
                    </div>
                    <div className="bg-muted rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full transition-all"
                        style={{ width: `${file.progress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )
            ))}
          </div>
        )}

        {/* Preview grid */}
        {files.length > 0 && !uploading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
            {files.map((file) => (
              <div key={file.id} className="relative group">
                {file.type === 'image' ? (
                  <img
                    src={file.url}
                    alt="Preview"
                    className="w-full aspect-square rounded-lg object-cover border border-border"
                  />
                ) : file.type === 'video' ? (
                  <div className="w-full aspect-square rounded-lg bg-foreground/90 flex items-center justify-center border border-border relative">
                    <div className="w-10 h-10 bg-primary-foreground/20 rounded-full flex items-center justify-center">
                      <Video className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div className="absolute bottom-2 right-2 bg-foreground/60 text-white text-[10px] px-1.5 rounded">
                      00:45
                    </div>
                  </div>
                ) : (
                  <div className="w-full aspect-square rounded-lg bg-secondary flex items-center justify-center border border-border">
                    <FileText className="w-8 h-8 text-primary" />
                  </div>
                )}
                <div className="absolute inset-0 bg-foreground/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <button className="p-2 bg-primary-foreground/20 rounded-full hover:bg-primary-foreground/40">
                    <Eye className="w-4 h-4 text-primary-foreground" />
                  </button>
                  <button
                    onClick={() => deleteFile(file.id)}
                    className="p-2 bg-destructive/20 rounded-full hover:bg-destructive/40"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </button>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{file.file.name}</p>
              </div>
            ))}
          </div>
        )}

        {/* AI Analysis */}
        {analyzing && (
          <div className="bg-secondary border border-primary/30 rounded-[var(--radius)] p-4 mt-4 animate-pulse">
            <div className="flex items-center gap-2 mb-3">
              <Loader2 className="w-4 h-4 text-primary animate-spin" />
              <p className="font-bold text-sm text-primary">Analiziram...</p>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded-full w-2/3" />
              <div className="h-3 bg-muted rounded-full w-3/4" />
            </div>
          </div>
        )}

        {aiAnalysis && !analyzing && (
          <div className="bg-secondary border border-primary/30 rounded-[var(--radius)] p-4 mt-4">
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-primary" />
              <p className="font-bold text-sm text-primary">AI Analiza</p>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              <span className="bg-primary text-primary-foreground text-xs rounded-full px-2.5 py-1">
                {aiAnalysis.category}
              </span>
              <div className="flex gap-1">
                {getComplexityDots(aiAnalysis.complexity)}
              </div>
            </div>
            <p className="text-sm text-foreground/80">{aiAnalysis.note}</p>
          </div>
        )}

        {/* CTA Button */}
        <button
          disabled={files.length === 0 || uploading}
          className="bg-primary text-primary-foreground rounded-[var(--radius)] w-full py-3 font-bold mt-4 hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
          Pošlji diagnozi mojstru →
        </button>
      </div>
    </div>
  )
}
