'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Sidebar } from '@/components/dashboard/sidebar'
import { DataTable } from '@/components/dashboard/data-table'
import { AnalyticsCards } from '@/components/dashboard/analytics-cards'
import { DataForm } from '@/components/dashboard/data-form'
import { SearchFilter } from '@/components/dashboard/search-filter'
import { AnalyticsChart } from '@/components/dashboard/analytics-chart'

export default function ProtectedPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [data, setData] = useState<any[]>([])
  const [filteredData, setFilteredData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)

  const supabase = createClient()

  useEffect(() => {
    const getUser = async () => {
      const sb = createClient()
      const {
        data: { user },
      } = await sb.auth.getUser()

      if (!user) {
        router.replace('/auth/login')
        return
      }

      setUser(user)

      const { data: records, error } = await sb
        .from('data_records')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error) {
        setData(records || [])
        setFilteredData(records || [])
      }
      setLoading(false)
    }

    getUser()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const fetchData = async (userId: string) => {
    const { data: records, error } = await supabase
      .from('data_records')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching data:', error)
    } else {
      setData(records || [])
      setFilteredData(records || [])
    }
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase
      .from('data_records')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Error deleting record:', error)
    } else {
      setData(data.filter((item) => item.id !== id))
      setFilteredData(filteredData.filter((item) => item.id !== id))
    }
  }

  const handleSearch = (query: string, category: string, status: string) => {
    let filtered = data

    if (query) {
      filtered = filtered.filter(
        (item) =>
          item.title?.toLowerCase().includes(query.toLowerCase()) ||
          item.description?.toLowerCase().includes(query.toLowerCase())
      )
    }

    if (category) {
      filtered = filtered.filter((item) => item.category === category)
    }

    if (status) {
      filtered = filtered.filter((item) => item.status === status)
    }

    setFilteredData(filtered)
  }

  const handleSaveRecord = async (record: any) => {
    if (editingRecord) {
      const { error } = await supabase
        .from('data_records')
        .update(record)
        .eq('id', editingRecord.id)
        .eq('user_id', user.id)

      if (error) {
        console.error('Error updating record:', error)
      } else {
        await fetchData(user.id)
        setEditingRecord(null)
      }
    } else {
      const { error } = await supabase
        .from('data_records')
        .insert({
          ...record,
          user_id: user.id,
        })

      if (error) {
        console.error('Error inserting record:', error)
      } else {
        await fetchData(user.id)
      }
    }
    setShowForm(false)
  }

  if (loading) {
    return <div className="p-8">Nalagam podatke...</div>
  }

  return (
    <div className="flex h-screen bg-background">
      <Sidebar user={user} />
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-foreground">Nadzorna plošča</h1>
            <p className="text-muted-foreground">
              Upravljajte svoje podatke in statistiko
            </p>
          </div>

          <AnalyticsCards data={filteredData} />

          <div className="mt-8 grid gap-8 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <SearchFilter onSearch={handleSearch} />

              <div className="rounded-lg border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-foreground">
                    Podatki
                  </h2>
                  <button
                    onClick={() => {
                      setEditingRecord(null)
                      setShowForm(!showForm)
                    }}
                    className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    {showForm ? 'Prekliči' : 'Dodaj novo'}
                  </button>
                </div>

                {showForm && (
                  <div className="mb-6 rounded-lg bg-muted p-4">
                    <DataForm
                      record={editingRecord}
                      onSave={handleSaveRecord}
                      onCancel={() => {
                        setShowForm(false)
                        setEditingRecord(null)
                      }}
                    />
                  </div>
                )}

                <DataTable
                  data={filteredData}
                  onEdit={(record) => {
                    setEditingRecord(record)
                    setShowForm(true)
                  }}
                  onDelete={handleDelete}
                />
              </div>
            </div>

            <div className="space-y-6">
              <AnalyticsChart data={filteredData} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
