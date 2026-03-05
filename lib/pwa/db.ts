// IndexedDB utilities for offline data storage
// lib/pwa/db.ts

const DB_NAME = 'liftgo-offline-db'
const DB_VERSION = 1

export async function openOfflineDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      
      // Store for categories
      if (!db.objectStoreNames.contains('categories')) {
        db.createObjectStore('categories', { keyPath: 'id' })
      }
      
      // Store for user's povprasevanja
      if (!db.objectStoreNames.contains('povprasevanja')) {
        db.createObjectStore('povprasevanja', { keyPath: 'id' })
      }
      
      // Store for pending submissions
      if (!db.objectStoreNames.contains('pending-submissions')) {
        db.createObjectStore('pending-submissions', { 
          keyPath: 'id', 
          autoIncrement: true 
        })
      }
    }
    
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function saveToOfflineDB(
  storeName: string, 
  data: any[]
): Promise<void> {
  const db = await openOfflineDB()
  const tx = db.transaction(storeName, 'readwrite')
  const store = tx.objectStore(storeName)
  data.forEach(item => store.put(item))
}

export async function getFromOfflineDB(
  storeName: string
): Promise<any[]> {
  const db = await openOfflineDB()
  const tx = db.transaction(storeName, 'readonly')
  const store = tx.objectStore(storeName)
  
  return new Promise((resolve, reject) => {
    const request = store.getAll()
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

export async function savePendingSubmission(data: any): Promise<void> {
  const db = await openOfflineDB()
  const tx = db.transaction('pending-submissions', 'readwrite')
  tx.objectStore('pending-submissions').add({
    ...data,
    timestamp: new Date().toISOString()
  })
}

export async function getPendingSubmissions(): Promise<any[]> {
  return getFromOfflineDB('pending-submissions')
}

export async function getSyncQueueCount(): Promise<number> {
  const submissions = await getPendingSubmissions()
  return submissions.length
}

export async function processSyncQueue(): Promise<void> {
  const submissions = await getPendingSubmissions()
  
  for (const submission of submissions) {
    try {
      const response = await fetch('/api/povprasevanje/public', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      })
      
      if (response.ok) {
        await clearPendingSubmission(submission.id)
        console.log('[v0] Synced submission:', submission.id)
      }
    } catch (error) {
      console.error('[v0] Failed to sync submission:', error)
      // Leave in queue for retry
    }
  }
}

export async function clearPendingSubmission(id: number): Promise<void> {
  const db = await openOfflineDB()
  const tx = db.transaction('pending-submissions', 'readwrite')
  tx.objectStore('pending-submissions').delete(id)
}
