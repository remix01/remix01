'use client'

import { useRef, useState } from 'react'
import { Upload, X, FileText, Play, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { useFileUpload, type UploadedFile } from '@/hooks/use-file-upload'

interface FileUploadZoneProps {
  accept?: string
  maxFiles?: number
  maxSizeMB?: number
  label?: string
  sublabel?: string
  onFilesChange?: (files: File[]) => void
}

export function FileUploadZone({
  accept = 'image/*,video/*',
  maxFiles = 5,
  maxSizeMB = 100,
  label = 'Priložite fotografije ali video (neobvezno)',
  sublabel = 'Max 5 datotek. Slike do 10MB, videi do 100MB. Podprte: JPG, PNG, MP4, MOV',
  onFilesChange,
}: FileUploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const { files, addFiles, removeFile, uploadProgress, isUploading, errors } = useFileUpload({
    maxFiles,
    maxSizeMB,
    accept,
    onUploadComplete: (uploadedFiles) => {
      if (onFilesChange) {
        onFilesChange(uploadedFiles.map((f) => f.file))
      }
    },
  })

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (e.dataTransfer.files) {
      addFiles(e.dataTransfer.files)
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      addFiles(e.target.files)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent, fileId?: string) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      if (fileId) {
        removeFile(fileId)
      } else {
        fileInputRef.current?.click()
      }
    }
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusIcon = (file: UploadedFile) => {
    switch (file.status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <AlertCircle className="h-4 w-4 text-destructive" />
      case 'uploading':
        return <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      default:
        return null
    }
  }

  const getStatusBadge = (status: UploadedFile['status']) => {
    switch (status) {
      case 'waiting':
        return <span className="text-xs text-muted-foreground">Čakanje</span>
      case 'uploading':
        return <span className="text-xs text-primary">Nalaganje...</span>
      case 'success':
        return <span className="text-xs text-green-600">Naloženo ✓</span>
      case 'error':
        return <span className="text-xs text-destructive">Napaka ✗</span>
    }
  }

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  return (
    <div className="grid gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="file-upload">{label}</Label>
        {sublabel && <p className="text-xs text-muted-foreground -mt-1">{sublabel}</p>}
      </div>

      <div
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragOver(true)
        }}
        onDragLeave={() => setIsDragOver(false)}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => handleKeyDown(e)}
        role="button"
        tabIndex={0}
        aria-label="Kliknite ali povlecite datoteke za nalaganje"
        className={cn(
          'flex min-h-[140px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-6 py-8 text-center transition-all duration-200',
          isDragOver
            ? 'border-primary bg-primary/5 shadow-sm'
            : 'border-muted-foreground/25 bg-muted/10 hover:border-muted-foreground/50 hover:bg-muted/20 hover:shadow-sm',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
        )}
      >
        <Upload className={cn('mb-3 h-10 w-10 transition-colors', isDragOver ? 'text-primary' : 'text-muted-foreground')} />
        <p className="text-sm font-medium text-foreground">
          {isMobile ? 'Dotaknite se za izbiro ali fotografiranje' : 'Povlecite datoteke sem ali kliknite za izbiro'}
        </p>
        <p className="mt-2 text-xs text-muted-foreground">JPG, PNG, MP4, MOV, PDF</p>
        <Input
          ref={fileInputRef}
          id="file-upload"
          type="file"
          multiple
          accept={accept}
          capture={isMobile ? 'environment' : undefined}
          onChange={handleFileChange}
          className="hidden"
          aria-label="Izberi datoteke"
        />
      </div>

      {errors.length > 0 && (
        <div className="rounded-md bg-destructive/10 px-4 py-3">
          {errors.map((error, i) => (
            <p key={i} className="text-sm text-destructive flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </p>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-3">
          {isUploading && (
            <div className="rounded-md bg-primary/5 px-4 py-3">
              <p className="text-sm font-medium text-foreground mb-2">
                Nalaganje {files.filter((f) => f.status === 'success').length}/{files.length} datotek... {Math.round(uploadProgress)}%
              </p>
              <Progress value={uploadProgress} className="h-1.5" />
            </div>
          )}

          {files.every((f) => f.status === 'success') && !isUploading && (
            <div className="rounded-md bg-green-50 px-4 py-3 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600 shrink-0" />
              <p className="text-sm font-medium text-green-900">Vse datoteke uspešno naložene ✓</p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {files.map((file) => (
              <div
                key={file.id}
                className="relative overflow-hidden rounded-lg border bg-card text-card-foreground shadow-sm transition-all hover:shadow-md"
              >
                {file.preview ? (
                  <div className="relative aspect-video w-full overflow-hidden bg-muted">
                    {file.file.type.startsWith('image/') ? (
                      <img src={file.preview} alt={file.file.name} className="h-full w-full object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center bg-muted">
                        <Play className="h-12 w-12 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-muted">
                    <FileText className="h-12 w-12 text-muted-foreground" />
                  </div>
                )}

                <div className="p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate" title={file.file.name}>
                        {file.file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.file.size)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeFile(file.id)
                      }}
                      onKeyDown={(e) => handleKeyDown(e, file.id)}
                      className="shrink-0 rounded-md p-1 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      aria-label={`Odstrani ${file.file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {getStatusBadge(file.status)}
                    {getStatusIcon(file)}
                  </div>

                  {file.status === 'uploading' && (
                    <Progress value={file.progress} className="h-1" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
