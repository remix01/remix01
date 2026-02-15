import { useState, useCallback } from 'react'

export interface UploadedFile {
  file: File
  id: string
  preview?: string
  status: 'waiting' | 'uploading' | 'success' | 'error'
  progress: number
  error?: string
}

export interface UseFileUploadOptions {
  maxFiles?: number
  maxSizeMB?: number
  accept?: string
  onUploadComplete?: (files: UploadedFile[]) => void
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const {
    maxFiles = 5,
    maxSizeMB = 100,
    accept = 'image/*,video/*',
    onUploadComplete,
  } = options

  const [files, setFiles] = useState<UploadedFile[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [errors, setErrors] = useState<string[]>([])

  const validateFile = useCallback(
    (file: File): string | null => {
      const isImage = file.type.startsWith('image/')
      const isVideo = file.type.startsWith('video/')
      const maxSize = isVideo ? 100 : 10

      if (!isImage && !isVideo && !file.type.includes('pdf')) {
        return `Format ${file.name.split('.').pop()} ni podprt. Dovoljeni: JPG, PNG, MP4, MOV, PDF`
      }

      if (file.size > maxSize * 1024 * 1024) {
        return `${isVideo ? 'Video' : 'Slika'} ${file.name} je prevelik${isVideo ? '' : 'a'}. Max ${maxSize}MB.`
      }

      return null
    },
    []
  )

  const addFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles)
      const currentCount = files.length
      const newErrors: string[] = []

      if (currentCount + fileArray.length > maxFiles) {
        newErrors.push(`Dodate lahko največ ${maxFiles} datotek.`)
        setErrors(newErrors)
        return
      }

      const validatedFiles: UploadedFile[] = []

      for (const file of fileArray) {
        const error = validateFile(file)
        if (error) {
          newErrors.push(error)
          continue
        }

        const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        let preview: string | undefined

        if (file.type.startsWith('image/')) {
          preview = URL.createObjectURL(file)
        }

        validatedFiles.push({
          file,
          id,
          preview,
          status: 'waiting',
          progress: 0,
        })
      }

      setErrors(newErrors)
      setFiles((prev) => [...prev, ...validatedFiles])

      // Simulate upload for each file
      validatedFiles.forEach((uploadFile) => {
        simulateUpload(uploadFile.id)
      })
    },
    [files.length, maxFiles, validateFile]
  )

  const simulateUpload = useCallback((fileId: string) => {
    setIsUploading(true)
    setFiles((prev) =>
      prev.map((f) =>
        f.id === fileId ? { ...f, status: 'uploading' as const } : f
      )
    )

    let progress = 0
    const interval = setInterval(() => {
      progress += Math.random() * 15
      if (progress >= 100) {
        clearInterval(interval)
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId
              ? { ...f, status: 'success' as const, progress: 100 }
              : f
          )
        )
        setIsUploading(false)
        // Check if all files are uploaded
        setFiles((prev) => {
          const allSuccess = prev.every((f) => f.status === 'success')
          if (allSuccess && onUploadComplete) {
            onUploadComplete(prev)
          }
          return prev
        })
      } else {
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileId ? { ...f, progress: Math.min(progress, 99) } : f
          )
        )
      }
    }, 200)
  }, [onUploadComplete])

  const removeFile = useCallback((fileId: string) => {
    setFiles((prev) => {
      const file = prev.find((f) => f.id === fileId)
      if (file?.preview) {
        URL.revokeObjectURL(file.preview)
      }
      return prev.filter((f) => f.id !== fileId)
    })
  }, [])

  const clearAll = useCallback(() => {
    files.forEach((f) => {
      if (f.preview) URL.revokeObjectURL(f.preview)
    })
    setFiles([])
    setErrors([])
  }, [files])

  const uploadProgress = files.length > 0
    ? files.reduce((acc, f) => acc + f.progress, 0) / files.length
    : 0

  return {
    files,
    addFiles,
    removeFile,
    clearAll,
    uploadProgress,
    isUploading,
    errors,
  }
}
