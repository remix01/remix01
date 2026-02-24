'use client'

import { useState, useRef } from 'react'
import {
  FileText,
  Trash2,
  Plus,
  GripVertical,
  Camera,
  Loader2,
  Download,
  MoreVertical,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { validateFile, generateFilePath, uploadWithProgress } from '@/lib/storage'
import { toast } from 'sonner'

interface GalleryImage {
  id: string
  url: string
  title: string
  category: string
  file?: File
  progress: number
}

interface Document {
  id: string
  url: string
  name: string
  size: string
  uploadedDate: string
  status: 'verified' | 'pending'
  file?: File
  progress: number
}

export function MojsterMediaUpload({ userId = 'user-123' }: { userId?: string }) {
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [gallery, setGallery] = useState<GalleryImage[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [uploading, setUploading] = useState(false)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)

  // File input refs
  const profileInputRef = useRef<HTMLInputElement>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const documentInputRef = useRef<HTMLInputElement>(null)

  // Profile picture handlers
  const handleProfilePictureSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return

    const file = files[0]
    const validation = validateFile(file)

    if (!validation.valid) {
      toast.error(validation.error)
      return
    }

    const preview = URL.createObjectURL(file)
    setProfileImage(preview)

    // Upload to storage
    setUploading(true)
    const filePath = generateFilePath(userId, file.name)
    const { url, error } = await uploadWithProgress('profilne-slike', filePath, file, () => {})

    if (error) {
      toast.error(`Napaka pri nalaganju: ${error}`)
      setProfileImage(null)
    } else {
      setProfileImage(url || preview)
      toast.success('Profilna slika uspešno naložena')
    }
    setUploading(false)
  }

  const handleRemoveProfilePicture = () => {
    setProfileImage(null)
    toast.success('Profilna slika izbrisana')
  }

  // Gallery handlers
  const handleGallerySelect = async (files: FileList | null) => {
    if (!files) return

    const newImages: GalleryImage[] = []
    for (let i = 0; i < files.length && newImages.length + gallery.length < 20; i++) {
      const file = files[i]
      const validation = validateFile(file)

      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`)
        continue
      }

      newImages.push({
        id: Math.random().toString(36).substring(7),
        url: URL.createObjectURL(file),
        title: file.name.split('.')[0],
        category: 'Drugo',
        file,
        progress: 0,
      })
    }

    setGallery((prev) => [...prev, ...newImages])

    // Upload images
    for (const image of newImages) {
      await uploadGalleryImage(image)
    }
  }

  const uploadGalleryImage = async (image: GalleryImage) => {
    if (!image.file) return

    setUploading(true)
    const filePath = generateFilePath(userId, image.file.name)

    const { url, error } = await uploadWithProgress('mojster-galerija', filePath, image.file, (percent) => {
      setGallery((prev) =>
        prev.map((img) => (img.id === image.id ? { ...img, progress: percent } : img))
      )
    })

    if (error) {
      toast.error(`Napaka pri nalaganju: ${error}`)
      setGallery((prev) => prev.filter((img) => img.id !== image.id))
    } else {
      setGallery((prev) =>
        prev.map((img) => (img.id === image.id ? { ...img, url: url || img.url, progress: 100 } : img))
      )
      toast.success('Slika uspešno naložena')
    }
    setUploading(false)
  }

  const deleteGalleryImage = (id: string) => {
    setGallery((prev) => prev.filter((img) => img.id !== id))
    toast.success('Slika izbrisana')
  }

  const updateGalleryImage = (id: string, updates: Partial<GalleryImage>) => {
    setGallery((prev) => prev.map((img) => (img.id === id ? { ...img, ...updates } : img)))
  }

  // Document handlers
  const handleDocumentSelect = async (files: FileList | null) => {
    if (!files) return

    const newDocs: Document[] = []
    for (let i = 0; i < files.length && newDocs.length + documents.length < 10; i++) {
      const file = files[i]
      const validation = validateFile(file)

      if (!validation.valid) {
        toast.error(`${file.name}: ${validation.error}`)
        continue
      }

      newDocs.push({
        id: Math.random().toString(36).substring(7),
        url: URL.createObjectURL(file),
        name: file.name,
        size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
        uploadedDate: new Date().toLocaleDateString('sl-SI'),
        status: 'pending',
        file,
        progress: 0,
      })
    }

    setDocuments((prev) => [...prev, ...newDocs])

    // Upload documents
    for (const doc of newDocs) {
      await uploadDocument(doc)
    }
  }

  const uploadDocument = async (doc: Document) => {
    if (!doc.file) return

    setUploading(true)
    const filePath = generateFilePath(userId, doc.file.name)

    const { url, error } = await uploadWithProgress('mojster-certifikati', filePath, doc.file, (percent) => {
      setDocuments((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, progress: percent } : d))
      )
    })

    if (error) {
      toast.error(`Napaka pri nalaganju: ${error}`)
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id))
    } else {
      setDocuments((prev) =>
        prev.map((d) =>
          d.id === doc.id
            ? { ...d, url: url || d.url, progress: 100, status: 'verified' }
            : d
        )
      )
      toast.success('Dokument uspešno naložen')
    }
    setUploading(false)
  }

  const deleteDocument = (id: string) => {
    setDocuments((prev) => prev.filter((doc) => doc.id !== id))
    toast.success('Dokument izbrisan')
  }

  const handleDragStart = (id: string) => {
    setDraggedItem(id)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (targetId: string) => {
    if (!draggedItem || draggedItem === targetId) return

    const draggedIndex = gallery.findIndex((img) => img.id === draggedItem)
    const targetIndex = gallery.findIndex((img) => img.id === targetId)

    const newGallery = [...gallery]
    ;[newGallery[draggedIndex], newGallery[targetIndex]] = [
      newGallery[targetIndex],
      newGallery[draggedIndex],
    ]

    setGallery(newGallery)
    setDraggedItem(null)
  }

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList className="grid w-full grid-cols-3 mb-6">
        <TabsTrigger value="profile">Profilna slika</TabsTrigger>
        <TabsTrigger value="gallery">Galerija del</TabsTrigger>
        <TabsTrigger value="documents">Certifikati</TabsTrigger>
      </TabsList>

      {/* Tab 1: Profile Picture */}
      <TabsContent value="profile" className="space-y-6">
        <div className="flex flex-col items-center">
          <div className="relative w-28 h-28 rounded-full border-4 border-primary/20 bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center mb-6 overflow-hidden">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-3xl">JD</span>
            )}
            <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-card rounded-full" />
          </div>

          {/* Upload area */}
          <div
            onClick={() => profileInputRef.current?.click()}
            className="w-full max-w-sm border-2 border-dashed border-border rounded-xl p-4 text-center cursor-pointer hover:border-primary hover:bg-secondary/50 transition-all"
          >
            <Camera className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="font-semibold text-foreground text-sm">Povlecite sliko sem</p>
            <p className="text-muted-foreground text-xs my-1">ali</p>
            <button
              onClick={(e) => {
                e.stopPropagation()
                profileInputRef.current?.click()
              }}
              className="bg-primary text-primary-foreground rounded-[var(--radius)] px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition-colors"
            >
              Izberite sliko
            </button>
          </div>

          <p className="text-xs text-muted-foreground text-center mt-3 max-w-sm">
            Priporočamo kvadratno sliko vsaj 400×400px. JPG ali PNG.
          </p>

          {profileImage && (
            <button
              onClick={handleRemoveProfilePicture}
              className="text-destructive text-sm font-semibold mt-4 hover:text-destructive/80 transition-colors"
            >
              Odstrani
            </button>
          )}

          <input
            ref={profileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => handleProfilePictureSelect(e.target.files)}
            className="hidden"
          />
        </div>
      </TabsContent>

      {/* Tab 2: Gallery */}
      <TabsContent value="gallery" className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="font-bold text-foreground">Moja dela</h3>
            <span className="bg-secondary text-primary text-xs px-2 py-0.5 rounded-full inline-block mt-1">
              {gallery.length}/20
            </span>
          </div>
          <button
            onClick={() => galleryInputRef.current?.click()}
            className="bg-primary text-primary-foreground text-sm rounded-[var(--radius)] px-4 py-2 hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Dodaj slike
          </button>
        </div>

        {gallery.length === 0 ? (
          <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
            <Camera className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />
            <p className="font-semibold text-foreground">Dodajte slike vaših del</p>
            <p className="text-sm text-muted-foreground mt-1">
              Stranke se lažje odločijo, ko vidijo vaše prejšnje projekte.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {gallery.map((image) => (
              <div
                key={image.id}
                draggable
                onDragStart={() => handleDragStart(image.id)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(image.id)}
                className={`bg-card border border-border rounded-lg overflow-hidden group cursor-move transition-all ${
                  draggedItem === image.id ? 'opacity-50 ring-2 ring-primary' : ''
                }`}
              >
                <img
                  src={image.url}
                  alt={image.title}
                  className="w-full aspect-square object-cover"
                />
                <div className="p-2 space-y-1">
                  <input
                    type="text"
                    value={image.title}
                    onChange={(e) => updateGalleryImage(image.id, { title: e.target.value })}
                    className="w-full text-xs bg-transparent border-none focus:outline-none placeholder:text-muted-foreground text-foreground font-medium"
                    placeholder="Naslov"
                  />
                  <select
                    value={image.category}
                    onChange={(e) => updateGalleryImage(image.id, { category: e.target.value })}
                    className="w-full text-[10px] bg-transparent border-none focus:outline-none text-muted-foreground"
                  >
                    <option>Kopalnica</option>
                    <option>Elektrika</option>
                    <option>Kuhinja</option>
                    <option>Ogrevanje</option>
                    <option>Drugo</option>
                  </select>
                </div>
                <div className="absolute top-2 right-2 hidden group-hover:flex gap-1">
                  <button className="p-1.5 bg-foreground/20 rounded-full hover:bg-foreground/30">
                    <GripVertical className="w-3 h-3 text-primary-foreground" />
                  </button>
                  <button
                    onClick={() => deleteGalleryImage(image.id)}
                    className="p-1.5 bg-destructive/20 rounded-full hover:bg-destructive/30"
                  >
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*,video/*"
          multiple
          onChange={(e) => handleGallerySelect(e.target.files)}
          className="hidden"
        />
      </TabsContent>

      {/* Tab 3: Documents */}
      <TabsContent value="documents" className="space-y-4">
        <button
          onClick={() => documentInputRef.current?.click()}
          className="w-full border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary hover:bg-secondary/50 transition-all"
        >
          <FileText className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
          <p className="font-semibold text-foreground text-sm">Povlecite dokumente sem</p>
          <p className="text-muted-foreground text-xs my-1">ali</p>
          <button
            onClick={(e) => {
              e.stopPropagation()
              documentInputRef.current?.click()
            }}
            className="bg-primary text-primary-foreground rounded-[var(--radius)] px-4 py-2 text-xs font-semibold hover:bg-primary/90 transition-colors"
          >
            Izberite datoteke
          </button>
        </button>

        {documents.length > 0 && (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-card border border-border rounded-[var(--radius)] p-3 flex items-center gap-3">
                <div className="flex-shrink-0 w-9 h-9 bg-secondary rounded-lg p-2 flex items-center justify-center">
                  {doc.name.includes('pdf') ? (
                    <FileText className="w-5 h-5 text-primary" />
                  ) : (
                    <FileText className="w-5 h-5 text-primary" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                  <p className="text-xs text-muted-foreground">{doc.size}</p>
                </div>
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground whitespace-nowrap">{doc.uploadedDate}</p>
                  {doc.status === 'verified' ? (
                    <span className="flex items-center gap-1 bg-secondary text-primary text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                      <CheckCircle className="w-3 h-3" />
                      Verificirano
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full whitespace-nowrap">
                      <Clock className="w-3 h-3" />
                      V pregledu
                    </span>
                  )}
                  <button
                    onClick={() => deleteDocument(doc.id)}
                    className="text-destructive hover:text-destructive/80"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground text-center mt-4">
          Dovolite do 10 dokumentov. Certifikati povečajo zaupanje strank.
        </p>

        <input
          ref={documentInputRef}
          type="file"
          accept=".pdf,.jpg,.png,.doc,.docx"
          multiple
          onChange={(e) => handleDocumentSelect(e.target.files)}
          className="hidden"
        />
      </TabsContent>
    </Tabs>
  )
}
